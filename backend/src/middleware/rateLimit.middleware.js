import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    code: ERROR_CODES.RATE_LIMITED,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for internal routes and health endpoints
    return req.path.startsWith('/internal/') || 
           req.path === '/health' || 
           req.path === '/api/v1/health';
  },
  handler: (req, res) => {
    const retryAfter = Math.round(900000 / 1000);
    res.set('Retry-After', retryAfter.toString());
    
    res.status(429).json({
      success: false,
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Too many requests from this IP, please try again later.',
      timestamp: new Date().toISOString(),
      correlation: {
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      },
      rateLimit: {
        retryAfter
      }
    });
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.set('Retry-After', '900');
    
    res.status(429).json({
      success: false,
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Too many authentication attempts, please try again later.',
      timestamp: new Date().toISOString(),
      correlation: {
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      },
      rateLimit: {
        retryAfter: 900
      }
    });
  }
});

export const commentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 comments per 15 minutes
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'COMMENT_RATE_LIMIT_EXCEEDED',
        message: 'Too many comments, please try again later.',
        retryAfter: 900
      }
    });
  }
});

export const followRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 follows per hour
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'FOLLOW_RATE_LIMIT_EXCEEDED',
        message: 'Too many follow requests, please try again later.',
        retryAfter: 3600
      }
    });
  }
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'SEARCH_RATE_LIMIT_EXCEEDED',
        message: 'Too many search requests, please try again later.',
        retryAfter: 60
      }
    });
  }
});

// Slow down middleware for gradual response delays
export const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: () => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // maximum delay of 20 seconds
  validate: { delayMs: false }, // disable warning
});

// IP-based blocking for suspicious activity
const suspiciousIPs = new Map();

export const suspiciousActivityMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const suspiciousCount = suspiciousIPs.get(clientIP) || 0;
  
  // Track failed auth attempts
  if (req.path.includes('/auth/') && (req.method === 'POST' || req.method === 'PUT')) {
    if (res.statusCode >= 400) {
      suspiciousIPs.set(clientIP, suspiciousCount + 1);
      
      // Block IP after too many failed attempts
      if (suspiciousCount >= 10) {
        return res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Please try again later.',
        });
      }
    }
  }
  
  // Reset counter after successful request
  if (res.statusCode < 400) {
    suspiciousIPs.set(clientIP, 0);
  }
  
  // Clean up old entries periodically
  if (Math.random() < 0.001) { // 0.1% chance
    for (const [ip, count] of suspiciousIPs.entries()) {
      if (count === 0) {
        suspiciousIPs.delete(ip);
      }
    }
  }
  
  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > parseSize(maxSize)) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
      });
    }
    next();
  };
};

function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 0;
  return parseInt(match[1]) * units[match[2]];
}

export default {
  rateLimiter,
  authRateLimiter,
  commentRateLimiter,
  followRateLimiter,
  searchRateLimiter,
  slowDownMiddleware,
  suspiciousActivityMiddleware,
  requestSizeLimit,
};
