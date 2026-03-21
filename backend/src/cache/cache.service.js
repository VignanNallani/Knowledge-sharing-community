import { logger } from '../config/index.js';
import redisManager from '../config/redis.js';
import { CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from './cache.keys.js';

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 300000; // 5 minutes in milliseconds
    this.redisClient = null;
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, JSON.stringify(value));
    this.ttlMap.set(key, Date.now() + ttl);
    logger.debug(`Cache SET: ${key}`);
  }

  get(key) {
    const ttl = this.ttlMap.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      return null;
    }

    const value = this.cache.get(key);
    if (value) {
      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(value);
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    logger.debug(`Cache DELETE: ${key}`);
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    logger.info('Cache cleared');
  }

  has(key) {
    const ttl = this.ttlMap.get(key);
    if (ttl && Date.now() > ttl) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, ttl] of this.ttlMap.entries()) {
      if (now > ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // Cache invalidation patterns
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    logger.info(`Cache invalidation: ${invalidated} entries matched pattern ${pattern}`);
    return invalidated;
  }

  // Cache statistics
  async getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Cache warming
  async warmUp(dataLoader) {
    logger.info('Starting cache warm-up');
    try {
      await dataLoader(this);
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed:', error);
    }
  }
}

// Memory-based cache service (for development)
class MemoryCacheService extends CacheService {
  constructor() {
    super();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  get(key) {
    const value = super.get(key);
    if (value !== null) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return value;
  }

  set(key, value, ttl) {
    super.set(key, value, ttl);
    this.stats.sets++;
  }

  delete(key) {
    super.delete(key);
    this.stats.deletes++;
  }

  getStats() {
    return {
      ...super.getStats(),
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }
}

// Enhanced Redis cache service (for production)
class RedisCacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes in seconds
    this.keyPrefix = 'ksc:';
    this.fallbackCache = new MemoryCacheService(); // Fallback to memory cache
    this.hardFailEnabled = false; // Cache should be optional, not mandatory
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        if (this.hardFailEnabled) {
          throw new Error('Redis connection required in production mode but not available');
        }
        logger.warn('Redis not available, using memory fallback for SET');
        return this.fallbackCache.set(key, value, ttl * 1000); // Convert to ms
      }
      
      const fullKey = `${this.keyPrefix}${key}`;
      await redis.setEx(fullKey, ttl, JSON.stringify(value));
      logger.debug(`[CACHE SET] Redis: ${fullKey}`);
      return true;
    } catch (error) {
      if (this.hardFailEnabled) {
        logger.error('Redis SET failed in production mode:', error);
        throw error; // Don't fallback in production
      }
      logger.error('Redis SET error, falling back to memory:', error);
      return this.fallbackCache.set(key, value, ttl * 1000);
    }
  }

  async get(key) {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        if (this.hardFailEnabled) {
          throw new Error('Redis connection required in production mode but not available');
        }
        logger.debug('Redis not available, using memory fallback for GET');
        return this.fallbackCache.get(key);
      }
      
      const fullKey = `${this.keyPrefix}${key}`;
      const value = await redis.get(fullKey);
      
      if (value) {
        logger.debug(`[CACHE HIT] Redis: ${fullKey}`);
        return JSON.parse(value);
      }
      logger.debug(`[CACHE MISS] Redis: ${fullKey}`);
      return null;
    } catch (error) {
      if (this.hardFailEnabled) {
        logger.error('Redis GET failed in production mode:', error);
        throw error; // Don't fallback in production
      }
      logger.error('Redis GET error, falling back to memory:', error);
      return this.fallbackCache.get(key);
    }
  }

  async delete(key) {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        if (this.hardFailEnabled) {
          throw new Error('Redis connection required in production mode but not available');
        }
        logger.debug('Redis not available, using memory fallback for DELETE');
        return this.fallbackCache.delete(key);
      }
      
      const fullKey = `${this.keyPrefix}${key}`;
      await redis.del(fullKey);
      logger.debug(`[CACHE DELETE] Redis: ${fullKey}`);
      return true;
    } catch (error) {
      if (this.hardFailEnabled) {
        logger.error('Redis DELETE failed in production mode:', error);
        throw error; // Don't fallback in production
      }
      logger.error('Redis DELETE error, falling back to memory:', error);
      return this.fallbackCache.delete(key);
    }
  }

  async clear() {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        logger.debug('Redis not available, using memory fallback for CLEAR');
        return this.fallbackCache.clear();
      }
      
      // Only clear keys with our prefix
      const pattern = `${this.keyPrefix}*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Redis cache cleared: ${keys.length} keys removed`);
      }
      return true;
    } catch (error) {
      logger.error('Redis CLEAR error, falling back to memory:', error);
      return this.fallbackCache.clear();
    }
  }

  async has(key) {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        return this.fallbackCache.has(key);
      }
      
      const fullKey = `${this.keyPrefix}${key}`;
      const exists = await redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.error('Redis EXISTS error, falling back to memory:', error);
      return this.fallbackCache.has(key);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        if (this.hardFailEnabled) {
          throw new Error('Redis connection required in production mode but not available');
        }
        // Use memory cache pattern invalidation
        const regex = new RegExp(pattern);
        let invalidated = 0;
        for (const [key] of this.fallbackCache.cache.entries()) {
          if (regex.test(key)) {
            this.fallbackCache.delete(key);
            invalidated++;
          }
        }
        logger.debug(`[CACHE INVALIDATE] Memory pattern: ${pattern}, ${invalidated} entries`);
        return invalidated;
      }
      
      const fullPattern = `${this.keyPrefix}${pattern}`;
      const keys = await redis.keys(fullPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`[CACHE INVALIDATE] Redis pattern: ${fullPattern}, ${keys.length} entries`);
      }
      return keys.length;
    } catch (error) {
      if (this.hardFailEnabled) {
        logger.error('Redis invalidation failed in production mode:', error);
        throw error; // Don't fallback in production
      }
      logger.error('Redis invalidation error, falling back to memory:', error);
      const regex = new RegExp(pattern);
      let invalidated = 0;
      for (const [key] of this.fallbackCache.cache.entries()) {
        if (regex.test(key)) {
          this.fallbackCache.delete(key);
          invalidated++;
        }
      }
      logger.debug(`[CACHE INVALIDATE] Memory fallback pattern: ${pattern}, ${invalidated} entries`);
      return invalidated;
    }
  }

  async getStats() {
    try {
      const redis = await redisManager.getClient();
      if (!redis) {
        return this.fallbackCache.getStats();
      }
      
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');
      const dbSize = await redis.dbSize();
      
      return {
        memory: info,
        keyspace,
        dbSize,
        connected: redisManager.isReady(),
      };
    } catch (error) {
      logger.error('Redis STATS error, falling back to memory:', error);
      return this.fallbackCache.getStats();
    }
  }

  async shutdown() {
    // Shutdown fallback cache first to clear its interval
    if (this.fallbackCache?.shutdown) {
      this.fallbackCache.shutdown();
    }

    // Disconnect Redis client if connected
    try {
      const redis = await redisManager.getClient();
      if (redis && redis.isOpen) {
        await redis.quit();
        logger.info('Redis client disconnected');
      }
    } catch (error) {
      logger.warn('Error disconnecting Redis client during shutdown:', error);
    }

    logger.info('Redis cache service shutdown complete');
  }

  // Cache invalidation helpers
  async invalidateUser(userId) {
    const pattern = `*user:*${userId}*`;
    return await this.invalidatePattern(pattern);
  }

  async invalidatePost(postId) {
    const pattern = `*post:*${postId}*`;
    return await this.invalidatePattern(pattern);
  }

  async invalidateMentorship(mentorshipId) {
    const pattern = `*mentorship:*${mentorshipId}*`;
    return await this.invalidatePattern(pattern);
  }

  async invalidateMentorSlots(mentorId) {
    const patterns = [
      `*mentor:slots:${mentorId}*`,
      `*slots:available*`
    ];
    
    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.invalidatePattern(pattern);
    }
    return totalInvalidated;
  }
}

// Cache factory
const createCacheService = () => {
  if (process.env.NODE_ENV === 'production' || process.env.REDIS_URL) {
    logger.info('Using Redis cache service');
    return new RedisCacheService();
  } else {
    logger.info('Using memory cache service');
    return new MemoryCacheService();
  }
};

export const cacheService = createCacheService();

// Cache middleware factory
export const cacheMiddleware = (options = {}) => {
  const {
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    ttl = 300000, // 5 minutes
    condition = () => true,
    invalidateOn = [],
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const cachedResponse = cacheService.get(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      cacheService.set(cacheKey, data, ttl);
      return originalJson.call(this, data);
    };

    next();
  };
};

export default cacheService;
