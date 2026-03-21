// Rate Limiting Middleware - Production Ready
import RateLimiter from './rateLimiter.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/index.js';

// Rate limit configurations
const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  login: { windowMs: 900000, maxRequests: 20 }, // 20 per 15 minutes per IP (development)
  register: { windowMs: 60000, maxRequests: 3 }, // 3 per minute per IP
  refreshToken: { windowMs: 60000, maxRequests: 10 }, // 10 per minute per user
  
  // Write operations - user-based limits
  createPost: { windowMs: 60000, maxRequests: 20 }, // 20 per minute per user
  createComment: { windowMs: 60000, maxRequests: 30 }, // 30 per minute per user
  
  // Read operations - more lenient
  read: { windowMs: 60000, maxRequests: 200 }, // 200 per minute per IP
};

// Create rate limiters
const limiters = {};
Object.entries(RATE_LIMITS).forEach(([key, config]) => {
  limiters[key] = new RateLimiter(config);
});

// Rate limiting middleware factory
export const createRateLimitMiddleware = (type) => {
  const limiter = limiters[type];
  if (!limiter) {
    throw new Error(`Unknown rate limiter type: ${type}`);
  }

  return (req, res, next) => {
    try {
      const key = limiter.keyGenerator(req);
      
      if (!limiter.isAllowed(key)) {
        const stats = limiter.getStats(key);
        logger.warn('Rate limit exceeded', {
          type,
          key,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          stats
        });

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': stats.max,
          'X-RateLimit-Remaining': Math.max(0, stats.max - stats.current),
          'X-RateLimit-Reset': new Date(stats.resetTime).toISOString()
        });

        return next(ApiError.tooManyRequests('Too many requests. Please try again later.'));
      }

      // Set rate limit headers for successful requests
      const stats = limiter.getStats(key);
      res.set({
        'X-RateLimit-Limit': stats.max,
        'X-RateLimit-Remaining': Math.max(0, stats.max - stats.current - 1),
        'X-RateLimit-Reset': new Date(stats.resetTime).toISOString()
      });

      next();
    } catch (error) {
      logger.error('Rate limiting error', { error, type, ip: req.ip });
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
};

// Specific middleware instances
export const loginRateLimit = createRateLimitMiddleware('login');
export const registerRateLimit = createRateLimitMiddleware('register');
export const refreshTokenRateLimit = createRateLimitMiddleware('refreshToken');
export const createPostRateLimit = createRateLimitMiddleware('createPost');
export const createCommentRateLimit = createRateLimitMiddleware('createComment');
export const readRateLimit = createRateLimitMiddleware('read');

// Cleanup function for graceful shutdown
export const cleanupRateLimiters = () => {
  Object.values(limiters).forEach(limiter => limiter.destroy());
};
