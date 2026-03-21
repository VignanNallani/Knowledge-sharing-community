// Distributed Rate Limiter - Redis-backed for Production Clusters
import Redis from 'ioredis';
import { logger } from '../config/index.js';

class DistributedRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.keyPrefix = options.keyPrefix || 'rate_limit:';
    this.redis = new Redis(options.redis || {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    // Redis Lua script for atomic sliding window
    this.slidingWindowScript = `
      local key = KEYS[1]
      local window = tonumber(ARGV[1])
      local now = tonumber(ARGV[2])
      local max_requests = tonumber(ARGV[3])
      
      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
      
      -- Count current requests
      local current = redis.call('ZCARD', key)
      
      if current < max_requests then
        -- Add new request
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, math.ceil(window / 1000))
        return {1, max_requests - current - 1}
      else
        -- Get oldest request for reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_time = oldest[2] and oldest[2] + window or now + window
        return {0, 0, reset_time}
      end
    `;
    
    this.redis.defineCommand('slidingWindow', {
      numberOfKeys: 1,
      lua: this.slidingWindowScript
    });
  }

  async isAllowed(key) {
    try {
      const redisKey = this.keyPrefix + key;
      const now = Date.now();
      
      const result = await this.redis.slidingWindow(
        redisKey,
        this.windowMs,
        now,
        this.maxRequests
      );
      
      const [allowed, remaining, resetTime] = result;
      
      return {
        allowed: allowed === 1,
        remaining,
        resetTime: resetTime || now + this.windowMs
      };
    } catch (error) {
      logger.error('Rate limiter Redis error', { error: error.message, key });
      // Fail open - allow request if Redis is down
      return { allowed: true, remaining: this.maxRequests, resetTime: Date.now() + this.windowMs };
    }
  }

  async getStats(key) {
    try {
      const redisKey = this.keyPrefix + key;
      const now = Date.now();
      
      // Count requests in current window
      await this.redis.zremrangebyscore(redisKey, 0, now - this.windowMs);
      const current = await this.redis.zcard(redisKey);
      
      return {
        current,
        max: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - current),
        resetTime: now + this.windowMs
      };
    } catch (error) {
      logger.error('Rate limiter stats error', { error: error.message, key });
      return { current: 0, max: this.maxRequests, remaining: this.maxRequests, resetTime: Date.now() + this.windowMs };
    }
  }

  async reset(key) {
    try {
      const redisKey = this.keyPrefix + key;
      await this.redis.del(redisKey);
      logger.info('Rate limiter reset', { key });
    } catch (error) {
      logger.error('Rate limiter reset error', { error: error.message, key });
    }
  }

  async disconnect() {
    await this.redis.disconnect();
  }
}

export default DistributedRateLimiter;
