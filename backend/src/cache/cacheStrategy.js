import { logger } from '../config/index.js';
import { cacheService } from './cache.service.js';
import { CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from './cache.keys.js';

/**
 * Advanced caching strategy with intelligent invalidation and optimization
 */
export class CacheStrategy {
  constructor() {
    this.hitRates = new Map();
    this.accessPatterns = new Map();
    this.optimizationInterval = setInterval(() => this.optimize(), 300000); // 5 minutes
  }

  /**
   * Smart cache get with access pattern tracking
   * @param {string} key - Cache key
   * @param {Function} dataLoader - Function to load data if cache miss
   * @param {Object} options - Caching options
   */
  async smartGet(key, dataLoader, options = {}) {
    const {
      ttl = CACHE_TTL.MEDIUM,
      trackAccess = true,
      enableWarmup = false
    } = options;

    // Track access patterns
    if (trackAccess) {
      this.trackAccess(key);
    }

    // Try to get from cache
    let data = await cacheService.get(key);
    
    if (data !== null) {
      this.recordHit(key);
      return data;
    }

    // Cache miss - load data
    this.recordMiss(key);
    
    try {
      data = await dataLoader();
      
      // Cache the loaded data
      await cacheService.set(key, data, ttl);
      
      // Consider warming up related data
      if (enableWarmup) {
        await this.considerWarmup(key, data);
      }
      
      return data;
    } catch (error) {
      logger.error(`Failed to load data for cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Multi-get with batch optimization
   * @param {Array} keys - Array of cache keys
   * @param {Function} batchLoader - Function to load missing data
   * @param {Object} options - Options
   */
  async multiGet(keys, batchLoader, options = {}) {
    const { ttl = CACHE_TTL.MEDIUM } = options;
    const results = new Map();
    const missingKeys = [];

    // Check cache for all keys
    for (const key of keys) {
      const data = await cacheService.get(key);
      if (data !== null) {
        results.set(key, data);
        this.recordHit(key);
      } else {
        missingKeys.push(key);
        this.recordMiss(key);
      }
    }

    // Load missing data in batch
    if (missingKeys.length > 0) {
      try {
        const missingData = await batchLoader(missingKeys);
        
        // Cache and store results
        for (const [key, data] of Object.entries(missingData)) {
          await cacheService.set(key, data, ttl);
          results.set(key, data);
        }
      } catch (error) {
        logger.error('Batch cache load failed:', error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Intelligent cache invalidation with cascade effects
   * @param {string} trigger - What triggered the invalidation
   * @param {Object} context - Context for invalidation
   */
  async intelligentInvalidate(trigger, context = {}) {
    const invalidationPlan = this.buildInvalidationPlan(trigger, context);
    
    logger.debug(`Cache invalidation plan for ${trigger}:`, invalidationPlan);
    
    for (const { pattern, reason } of invalidationPlan) {
      try {
        const count = await cacheService.invalidatePattern(pattern);
        logger.debug(`Invalidated ${count} entries for ${reason}`);
      } catch (error) {
        logger.error(`Failed to invalidate pattern ${pattern}:`, error);
      }
    }
  }

  /**
   * Build invalidation plan based on trigger and context
   * @param {string} trigger - Invalidation trigger
   * @param {Object} context - Context data
   */
  buildInvalidationPlan(trigger, context) {
    const plan = [];

    switch (trigger) {
      case 'post_created':
        plan.push(
          { pattern: 'posts:list:*', reason: 'New post affects posts list' },
          { pattern: 'admin:stats', reason: 'New post affects stats' }
        );
        break;

      case 'post_updated':
        plan.push(
          { pattern: `post:*:${context.postId}*`, reason: 'Post updated' },
          { pattern: 'posts:list:*', reason: 'Post update may affect lists' }
        );
        break;

      case 'post_deleted':
        plan.push(
          { pattern: `post:*:${context.postId}*`, reason: 'Post deleted' },
          { pattern: 'posts:list:*', reason: 'Post deletion affects lists' },
          { pattern: `user:posts:${context.authorId}*`, reason: 'User posts affected' }
        );
        break;

      case 'user_followed':
        plan.push(
          { pattern: `user:followers:${context.followingId}*`, reason: 'New follower' },
          { pattern: `user:following:${context.followerId}*`, reason: 'New following' }
        );
        break;

      case 'like_created':
        plan.push(
          { pattern: `post:likes:${context.postId}*`, reason: 'New like' },
          { pattern: `post:detail:${context.postId}*`, reason: 'Post like count changed' }
        );
        break;

      case 'comment_created':
        plan.push(
          { pattern: `post:comments:${context.postId}*`, reason: 'New comment' },
          { pattern: `post:detail:${context.postId}*`, reason: 'Post comment count changed' }
        );
        break;

      default:
        logger.warn(`Unknown invalidation trigger: ${trigger}`);
    }

    return plan;
  }

  /**
   * Track access patterns for optimization
   * @param {string} key - Cache key
   */
  trackAccess(key) {
    if (!this.accessPatterns.has(key)) {
      this.accessPatterns.set(key, {
        count: 0,
        lastAccess: Date.now(),
        frequency: 0
      });
    }

    const pattern = this.accessPatterns.get(key);
    pattern.count++;
    pattern.lastAccess = Date.now();
    
    // Calculate frequency (accesses per hour)
    const timeDiff = Date.now() - (pattern.firstAccess || Date.now());
    pattern.frequency = pattern.count / (timeDiff / 3600000);
    
    if (!pattern.firstAccess) {
      pattern.firstAccess = Date.now();
    }
  }

  /**
   * Record cache hit
   * @param {string} key - Cache key
   */
  recordHit(key) {
    if (!this.hitRates.has(key)) {
      this.hitRates.set(key, { hits: 0, misses: 0 });
    }
    this.hitRates.get(key).hits++;
  }

  /**
   * Record cache miss
   * @param {string} key - Cache key
   */
  recordMiss(key) {
    if (!this.hitRates.has(key)) {
      this.hitRates.set(key, { hits: 0, misses: 0 });
    }
    this.hitRates.get(key).misses++;
  }

  /**
   * Get hit rate for a key
   * @param {string} key - Cache key
   */
  getHitRate(key) {
    const stats = this.hitRates.get(key);
    if (!stats) return 0;
    
    const total = stats.hits + stats.misses;
    return total > 0 ? stats.hits / total : 0;
  }

  /**
   * Consider warming up related data
   * @param {string} key - Original cache key
   * @param {*} data - Data that was loaded
   */
  async considerWarmup(key, data) {
    // Extract warmup opportunities based on data type and access patterns
    if (key.startsWith('post:detail:')) {
      // Warm up author's other posts if this post is frequently accessed
      const hitRate = this.getHitRate(key);
      if (hitRate > 0.8 && data.authorId) {
        const authorPostsKey = CACHE_KEYS.USER_POSTS(data.authorId);
        const alreadyCached = await cacheService.get(authorPostsKey);
        
        if (!alreadyCached) {
          // Queue for background warmup
          setTimeout(() => {
            this.warmupUserPosts(data.authorId);
          }, 1000);
        }
      }
    }
  }

  /**
   * Warm up user posts (background)
   * @param {number} userId - User ID
   */
  async warmupUserPosts(userId) {
    try {
      // This would be implemented based on your post service
      // const posts = await postService.getPostsByAuthor(userId, { page: 1, limit: 20 });
      // await cacheService.set(CACHE_KEYS.USER_POSTS(userId), posts, CACHE_TTL.MEDIUM);
    } catch (error) {
      logger.error(`Failed to warm up user posts for ${userId}:`, error);
    }
  }

  /**
   * Optimize cache based on access patterns
   */
  async optimize() {
    try {
      const stats = this.getOptimizationStats();
      
      // Identify cold cache entries for potential removal
      const coldKeys = this.identifyColdEntries();
      
      // Adjust TTLs based on access patterns
      await this.adjustTTLs();
      
      // Log optimization results
      if (coldKeys.length > 0) {
        logger.debug(`Identified ${coldKeys.length} cold cache entries for potential removal`);
      }
      
      logger.debug('Cache optimization completed', stats);
    } catch (error) {
      logger.error('Cache optimization failed:', error);
    }
  }

  /**
   * Identify cold cache entries
   */
  identifyColdEntries() {
    const coldEntries = [];
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.lastAccess < oneHourAgo && pattern.frequency < 0.1) {
        coldEntries.push(key);
      }
    }

    return coldEntries;
  }

  /**
   * Adjust TTLs based on access patterns
   */
  async adjustTTLs() {
    // This would involve re-caching entries with different TTLs
    // Implementation depends on specific cache service capabilities
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    const totalKeys = this.accessPatterns.size;
    let totalHits = 0;
    let totalMisses = 0;
    let highFrequencyKeys = 0;

    for (const [key, stats] of this.hitRates.entries()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
    }

    for (const [key, pattern] of this.accessPatterns.entries()) {
      if (pattern.frequency > 1.0) { // More than 1 access per hour
        highFrequencyKeys++;
      }
    }

    const overallHitRate = (totalHits + totalMisses) > 0 
      ? totalHits / (totalHits + totalMisses) 
      : 0;

    return {
      totalKeys,
      overallHitRate: (overallHitRate * 100).toFixed(2) + '%',
      highFrequencyKeys,
      averageFrequency: totalKeys > 0 ? highFrequencyKeys / totalKeys : 0
    };
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats() {
    const cacheStats = await cacheService.getStats();
    const optimizationStats = this.getOptimizationStats();

    return {
      cache: cacheStats,
      optimization: optimizationStats,
      accessPatterns: Object.fromEntries(this.accessPatterns),
      hitRates: Object.fromEntries(
        Array.from(this.hitRates.entries()).map(([key, stats]) => [
          key,
          { ...stats, hitRate: this.getHitRate(key) }
        ])
      )
    };
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.hitRates.clear();
    this.accessPatterns.clear();
    logger.info('Cache strategy statistics reset');
  }

  /**
   * Shutdown cache strategy
   */
  shutdown() {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    logger.info('Cache strategy shutdown complete');
  }
}

// Singleton instance
const cacheStrategy = new CacheStrategy();

export default cacheStrategy;
