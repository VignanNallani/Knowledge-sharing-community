import rateLimit from 'express-rate-limit';
import { ERROR_CODES } from '../errors/errorCodes.js';

// Load testing rate limiter - much higher limits for testing
export const loadTestRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes for load testing
  message: {
    success: false,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'Load testing rate limit exceeded.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.round(900000 / 1000);
    res.set('Retry-After', retryAfter.toString());
    
    res.status(429).json({
      success: false,
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Load testing rate limit exceeded.',
      timestamp: new Date().toISOString(),
      rateLimit: {
        retryAfter
      }
    });
  },
});

export default loadTestRateLimiter;
