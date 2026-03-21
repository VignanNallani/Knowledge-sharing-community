import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import logger from '../config/logger.js';
import configLoader from '../config/config-loader.js';

class SecurityMiddleware {
  constructor() {
    this.config = configLoader.getAll();
  }

  // Rate limiting middleware
  createRateLimiter(options = {}) {
    const defaultOptions = {
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: this.config.rateLimit.message,
      standardHeaders: this.config.rateLimit.standardHeaders,
      legacyHeaders: this.config.rateLimit.legacyHeaders,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
          },
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000),
        });
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };
    return rateLimit(mergedOptions);
  }

  // Strict rate limiter for sensitive endpoints
  createStrictRateLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 requests per window
      message: 'Too many attempts, please try again later.',
      skipSuccessfulRequests: false,
    });
  }

  // Auth-specific rate limiter
  createAuthRateLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 attempts per window
      message: 'Too many authentication attempts, please try again later.',
      skipSuccessfulRequests: true,
    });
  }

  // Content creation rate limiter
  createContentRateLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 3, // 3 posts per minute
      message: 'Please wait before creating more content.',
      keyGenerator: (req) => req.user?.id || req.ip,
    });
  }

  // Helmet security headers
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          connectSrc: ["'self'", "https://api.github.com"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
      ieNoOpen: true,
      dnsPrefetchControl: { allow: false },
    });
  }

  // CORS configuration
  getCorsConfig() {
    return {
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowedHeaders,
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400, // 24 hours
      optionsSuccessStatus: 200,
    };
  }

  // Request size limiting
  createRequestSizeLimit(maxSize = null) {
    const limit = maxSize || this.config.security.maxRequestSize;
    return (req, res, next) => {
      const contentLength = req.get('content-length');
      
      if (contentLength && parseInt(contentLength) > this.parseSize(limit)) {
        logger.warn(`Request size limit exceeded: ${contentLength} bytes from IP: ${req.ip}`);
        return res.status(413).json({
          success: false,
          message: 'Request entity too large',
          maxSize: limit,
        });
      }
      
      next();
    };
  }

  // Body parsing limits
  getBodyParserLimits() {
    return {
      limit: this.config.security.maxRequestSize,
      parameterLimit: 1000,
      extended: true,
    };
  }

  // Input validation middleware
  validateInput(validations) {
    return async (req, res, next) => {
      try {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          logger.warn(`Input validation failed:`, {
            ip: req.ip,
            path: req.path,
            errors: errors.array(),
          });
          
          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
          });
        }
        
        next();
      } catch (error) {
        logger.error('Input validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Validation error occurred',
        });
      }
    };
  }

  // Common validation rules
  getValidationRules() {
    return {
      userRegistration: [
        body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Valid email is required'),
        body('username')
          .isLength({ min: 3, max: 30 })
          .matches(/^[a-zA-Z0-9_]+$/)
          .withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
        body('password')
          .isLength({ min: 8 })
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
          .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        body('firstName')
          .isLength({ min: 1, max: 50 })
          .trim()
          .withMessage('First name is required'),
        body('lastName')
          .isLength({ min: 1, max: 50 })
          .trim()
          .withMessage('Last name is required'),
      ],
      
      userLogin: [
        body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Valid email is required'),
        body('password')
          .notEmpty()
          .withMessage('Password is required'),
      ],
      
      postCreation: [
        body('title')
          .isLength({ min: 1, max: 200 })
          .trim()
          .withMessage('Title must be 1-200 characters'),
        body('content')
          .isLength({ min: 1, max: 5000 })
          .trim()
          .withMessage('Content must be 1-5000 characters'),
        body('categoryId')
          .isInt({ min: 1 })
          .withMessage('Valid category ID is required'),
      ],
      
      commentCreation: [
        body('content')
          .isLength({ min: 1, max: 1000 })
          .trim()
          .withMessage('Comment must be 1-1000 characters'),
        body('postId')
          .isInt({ min: 1 })
          .withMessage('Valid post ID is required'),
      ],
    };
  }

  // IP-based blocking middleware
  createIPBlocker(blockedIPs = []) {
    const blockedSet = new Set(blockedIPs);
    
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (blockedSet.has(clientIP)) {
        logger.warn(`Blocked IP attempted access: ${clientIP}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
      
      next();
    };
  }

  // Suspicious activity detection
  createSuspiciousActivityDetector() {
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
    ];

    return (req, res, next) => {
      const checkString = (str) => {
        if (typeof str !== 'string') return false;
        return suspiciousPatterns.some(pattern => pattern.test(str));
      };

      const checkObject = (obj) => {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === 'string' && checkString(value)) {
            return true;
          } else if (typeof value === 'object' && value !== null) {
            if (checkObject(value)) return true;
          }
        }
        return false;
      };

      // Check request body, query params, and headers
      if (checkObject(req.body) || checkObject(req.query) || checkObject(req.headers)) {
        logger.warn(`Suspicious activity detected from IP: ${req.ip}`, {
          path: req.path,
          body: req.body,
          query: req.query,
        });
        
        return res.status(400).json({
          success: false,
          message: 'Invalid request content detected',
        });
      }

      next();
    };
  }

  // Security headers middleware
  addSecurityHeaders() {
    return (req, res, next) => {
      // Remove server information
      res.removeHeader('X-Powered-By');
      
      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Content Security Policy (if not using helmet)
      if (!res.get('Content-Security-Policy')) {
        res.setHeader('Content-Security-Policy', 
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';"
        );
      }
      
      next();
    };
  }

  // Helper method to parse size strings (e.g., '10mb' -> bytes)
  parseSize(sizeStr) {
    const units = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };
    
    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }
    
    const [, value, unit] = match;
    return Math.floor(parseFloat(value) * units[unit]);
  }

  // Comprehensive security middleware
  getSecurityMiddleware() {
    return [
      this.getHelmetConfig(),
      cors(this.getCorsConfig()),
      this.addSecurityHeaders(),
      this.createRequestSizeLimit(),
      this.createSuspiciousActivityDetector(),
    ];
  }
}

// Singleton instance
const securityMiddleware = new SecurityMiddleware();

export default securityMiddleware;
