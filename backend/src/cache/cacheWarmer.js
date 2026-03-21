import { logger } from '../config/index.js';
import { cacheService } from './cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from './cache.keys.js';
import postService from '../services/post.service.js';
import userService from '../services/user.service.js';

/**
 * Cache warming service for pre-loading frequently accessed data
 */
export class CacheWarmer {
  constructor() {
    this.isWarming = false;
    this.warmupQueue = [];
    this.warmupInterval = null;
    this.lastWarmup = null;
  }

  /**
   * Start automatic cache warming
   * @param {Object} options - Warmup options
   */
  startAutoWarmup(options = {}) {
    const {
      interval = 300000, // 5 minutes
      enableWarmup = process.env.NODE_ENV === 'production'
    } = options;

    if (!enableWarmup) {
      logger.info('Cache warming disabled');
      return;
    }

    this.warmupInterval = setInterval(async () => {
      try {
        await this.performWarmup();
      } catch (error) {
        logger.error('Auto cache warmup failed:', error);
      }
    }, interval);

    logger.info(`Auto cache warming started (interval: ${interval}ms)`);
  }

  /**
   * Stop automatic cache warming
   */
  stopAutoWarmup() {
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
      logger.info('Auto cache warming stopped');
    }
  }

  /**
   * Perform cache warmup
   */
  async performWarmup() {
    if (this.isWarming) {
      logger.debug('Cache warmup already in progress, skipping');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    try {
      logger.info('Starting cache warmup');

      const warmupTasks = [
        this.warmupPopularPosts(),
        this.warmupActiveUsers(),
        this.warmupTrendingContent(),
        this.warmupSystemStats()
      ];

      // Execute warmup tasks in parallel with timeout
      const results = await Promise.allSettled(
        warmupTasks.map(task => 
          Promise.race([
            task,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Warmup task timeout')), 30000)
            )
          ])
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const duration = Date.now() - startTime;
      this.lastWarmup = new Date();

      logger.info(`Cache warmup completed in ${duration}ms`, {
        successful,
        failed,
        totalTasks: warmupTasks.length
      });

    } catch (error) {
      logger.error('Cache warmup failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm up popular posts
   */
  async warmupPopularPosts() {
    try {
      // Cache first few pages of posts
      const pagesToWarmup = [1, 2, 3];
      
      for (const page of pagesToWarmup) {
        const cacheKey = CACHE_KEYS.POSTS_LIST(page);
        
        // Check if already cached and not expired
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          continue;
        }

        // Fetch and cache posts
        const posts = await postService.getPosts({ page, limit: 20 });
        await cacheService.set(cacheKey, posts.data, CACHE_TTL.MEDIUM);
        
        logger.debug(`Warmed up posts page ${page}`);
      }

      // Warm up individual post details for recent posts
      const recentPosts = await postService.getPosts({ page: 1, limit: 10 });
      for (const post of recentPosts.data.slice(0, 5)) {
        const cacheKey = CACHE_KEYS.POST_DETAIL(post.id);
        const cached = await cacheService.get(cacheKey);
        
        if (!cached) {
          const postDetail = await postService.getPostById(post.id);
          await cacheService.set(cacheKey, postDetail, CACHE_TTL.MEDIUM);
        }
      }

    } catch (error) {
      logger.error('Failed to warm up popular posts:', error);
      throw error;
    }
  }

  /**
   * Warm up active users data
   */
  async warmupActiveUsers() {
    try {
      // This would typically get users with high activity
      // For now, we'll warm up user profiles for recent post authors
      const recentPosts = await postService.getPosts({ page: 1, limit: 20 });
      const userIds = [...new Set(recentPosts.data.map(post => post.authorId))];

      for (const userId of userIds.slice(0, 10)) {
        const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
        const cached = await cacheService.get(cacheKey);
        
        if (!cached) {
          // User profile warming would depend on userService implementation
          // await userService.getUserProfile(userId);
          // await cacheService.set(cacheKey, userProfile, CACHE_TTL.LONG);
        }
      }

    } catch (error) {
      logger.error('Failed to warm up active users:', error);
      throw error;
    }
  }

  /**
   * Warm up trending content
   */
  async warmupTrendingContent() {
    try {
      // Warm up search results for common terms
      const trendingTerms = ['javascript', 'react', 'nodejs', 'tutorial', 'help'];
      
      for (const term of trendingTerms) {
        const cacheKey = CACHE_KEYS.POSTS_SEARCH(term, 1);
        const cached = await cacheService.get(cacheKey);
        
        if (!cached) {
          const searchResults = await postService.searchPosts(term, { page: 1, limit: 20 });
          await cacheService.set(cacheKey, searchResults.data, CACHE_TTL.SHORT);
        }
      }

    } catch (error) {
      logger.error('Failed to warm up trending content:', error);
      throw error;
    }
  }

  /**
   * Warm up system statistics
   */
  async warmupSystemStats() {
    try {
      // Warm up admin stats if available
      const statsKey = CACHE_KEYS.ADMIN_STATS;
      const cached = await cacheService.get(statsKey);
      
      if (!cached) {
        // This would depend on admin service implementation
        // const stats = await adminService.getSystemStats();
        // await cacheService.set(statsKey, stats, CACHE_TTL.STATS);
      }

    } catch (error) {
      logger.error('Failed to warm up system stats:', error);
      throw error;
    }
  }

  /**
   * Warm up specific data on demand
   * @param {string} type - Type of data to warm up
   * @param {Object} params - Parameters for warmup
   */
  async warmupOnDemand(type, params = {}) {
    try {
      switch (type) {
        case 'user_posts':
          await this.warmupUserPosts(params.userId);
          break;
        case 'post_detail':
          await this.warmupPostDetail(params.postId);
          break;
        case 'user_profile':
          await this.warmupUserProfile(params.userId);
          break;
        default:
          throw new Error(`Unknown warmup type: ${type}`);
      }
    } catch (error) {
      logger.error(`On-demand warmup failed for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Warm up user's posts
   * @param {number} userId - User ID
   */
  async warmupUserPosts(userId) {
    const cacheKey = CACHE_KEYS.USER_POSTS(userId);
    const cached = await cacheService.get(cacheKey);
    
    if (!cached) {
      const userPosts = await postService.getPostsByAuthor(userId, { page: 1, limit: 20 });
      await cacheService.set(cacheKey, userPosts, CACHE_TTL.MEDIUM);
    }
  }

  /**
   * Warm up post detail
   * @param {number} postId - Post ID
   */
  async warmupPostDetail(postId) {
    const cacheKey = CACHE_KEYS.POST_DETAIL(postId);
    const cached = await cacheService.get(cacheKey);
    
    if (!cached) {
      const postDetail = await postService.getPostById(postId);
      await cacheService.set(cacheKey, postDetail, CACHE_TTL.MEDIUM);
    }
  }

  /**
   * Warm up user profile
   * @param {number} userId - User ID
   */
  async warmupUserProfile(userId) {
    const cacheKey = CACHE_KEYS.USER_PROFILE(userId);
    const cached = await cacheService.get(cacheKey);
    
    if (!cached) {
      // Would depend on userService implementation
      // const userProfile = await userService.getUserProfile(userId);
      // await cacheService.set(cacheKey, userProfile, CACHE_TTL.LONG);
    }
  }

  /**
   * Get warmup statistics
   */
  getStats() {
    return {
      isWarming: this.isWarming,
      lastWarmup: this.lastWarmup,
      queueLength: this.warmupQueue.length,
      autoWarmupEnabled: !!this.warmupInterval
    };
  }

  /**
   * Shutdown cache warmer
   */
  shutdown() {
    this.stopAutoWarmup();
    this.warmupQueue = [];
    logger.info('Cache warmer shutdown complete');
  }
}

// Singleton instance
const cacheWarmer = new CacheWarmer();

export default cacheWarmer;
