import { ApiError } from '../utils/ApiError.js';
import securityHardening from '../security/securityHardening.js';
import { logger } from '../config/index.js';

/**
 * Enhanced Security Middleware with OWASP protections
 */
export class EnhancedSecurityMiddleware {
  /**
   * CSRF protection middleware
   */
  static csrfProtection() {
    return (req, res, next) => {
      // Skip CSRF for GET requests and safe endpoints
      if (req.method === 'GET' || this.isSafeEndpoint(req.path)) {
        return next();
      }

      const csrfToken = req.get('X-CSRF-Token') || req.body?.csrf_token;
      
      if (!securityHardening.validateCSRFToken(req, csrfToken)) {
        return res.status(403).json({
          success: false,
          error: 'CSRF token validation failed'
        });
      }

      next();
    };
  }

  /**
   * Advanced rate limiting with exponential backoff
   */
  static advancedRateLimit(options = {}) {
    const {
      maxAttempts = 5,
      windowMs = 900000, // 15 minutes
      blockDurationMs = 3600000, // 1 hour
      keyGenerator = (req) => req.ip
    } = options;

    return (req, res, next) => {
      try {
        const identifier = keyGenerator(req);
        securityHardening.checkRateLimit(identifier, {
          maxAttempts,
          windowMs,
          blockDurationMs
        });
        next();
      } catch (error) {
        if (error.statusCode === 429) {
          return res.status(429).json({
            success: false,
            error: error.message,
            retryAfter: Math.ceil(blockDurationMs / 1000)
          });
        }
        next(error);
      }
    };
  }

  /**
   * Input validation middleware
   */
  static validateInput(validationRules = {}) {
    return (req, res, next) => {
      try {
        // Skip validation for safe endpoints
        if (this.isSafeEndpoint(req.path)) {
          return next();
        }

        // Validate request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.validateObject(req.body, validationRules.body || {});
        }

        // Validate query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.validateObject(req.query, validationRules.query || {});
        }

        // Validate URL parameters
        if (req.params && typeof req.params === 'object') {
          req.params = this.validateObject(req.params, validationRules.params || {});
        }

        next();
      } catch (error) {
        if (error.statusCode === 400) {
          return res.status(400).json({
            success: false,
            error: error.message
          });
        }
        next(error);
      }
    };
  }

  /**
   * IP blocking middleware
   */
  static ipBlocker() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      
      if (securityHardening.isIPBlocked(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied from this IP address'
        });
      }

      next();
    };
  }

  /**
   * Suspicious activity detection
   */
  static suspiciousActivityDetector() {
    return (req, res, next) => {
      // Track suspicious activity patterns
      const clientIP = this.getClientIP(req);
      const userAgent = req.get('User-Agent');
      
      // Detect various suspicious patterns
      this.detectSuspiciousPatterns(req, clientIP, userAgent);
      
      // Track response for anomaly detection
      const originalSend = res.send;
      res.send = function(data) {
        // Track failed authentication attempts
        if (res.statusCode === 401) {
          securityHardening.detectSuspiciousActivity(clientIP, 'failed_auth', {
            path: req.path,
            method: req.method,
            userAgent
          });
        }
        
        // Track suspicious error patterns
        if (res.statusCode >= 400) {
          securityHardening.detectSuspiciousActivity(clientIP, 'error_response', {
            statusCode: res.statusCode,
            path: req.path,
            method: req.method
          });
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Content Security Policy middleware
   */
  static contentSecurityPolicy(options = {}) {
    return (req, res, next) => {
      const csp = securityHardening.buildCSP(options);
      res.set('Content-Security-Policy', csp);
      next();
    };
  }

  /**
   * Secure headers middleware
   */
  static secureHeaders() {
    return (req, res, next) => {
      // Additional security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin'
      });

      next();
    };
  }

  /**
   * Validate object with security rules
   */
  static validateObject(obj, rules) {
    const validated = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const rule = rules[key] || {};
      
      try {
        validated[key] = securityHardening.validateInput(value, rule);
      } catch (error) {
        logger.warn('Input validation failed', {
          field: key,
          value: String(value).substring(0, 100),
          error: error.message
        });
        throw error;
      }
    }
    
    return validated;
  }

  /**
   * Detect suspicious patterns in request
   */
  static detectSuspiciousPatterns(req, ip, userAgent) {
    // Detect suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      securityHardening.detectSuspiciousActivity(ip, 'suspicious_ua', {
        userAgent: userAgent.substring(0, 200)
      });
    }

    // Detect suspicious request patterns
    if (this.isSuspiciousRequest(req)) {
      securityHardening.detectSuspiciousActivity(ip, 'suspicious_request', {
        path: req.path,
        method: req.method,
        headers: Object.keys(req.headers).slice(0, 10)
      });
    }

    // Detect potential attack patterns
    if (this.isPotentialAttack(req)) {
      securityHardening.detectSuspiciousActivity(ip, 'potential_attack', {
        path: req.path,
        method: req.method,
        query: req.query,
        body: typeof req.body === 'object' ? Object.keys(req.body) : null
      });
    }
  }

  /**
   * Check if user agent is suspicious
   */
  static isSuspiciousUserAgent(userAgent) {
    if (!userAgent) return true; // No user agent is suspicious
    
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /perl/i,
      /php/i,
      /ruby/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check if request is suspicious
   */
  static isSuspiciousRequest(req) {
    // Check for common attack paths
    const attackPaths = [
      '/admin',
      '/wp-admin',
      '/phpmyadmin',
      '/.env',
      '/config',
      '/backup',
      '/test',
      '/debug'
    ];

    return attackPaths.some(path => req.path.toLowerCase().includes(path));
  }

  /**
   * Check if request is a potential attack
   */
  static isPotentialAttack(req) {
    // Check for SQL injection patterns in URL
    const sqlPatterns = [
      /union.*select/i,
      /select.*from/i,
      /insert.*into/i,
      /update.*set/i,
      /delete.*from/i,
      /drop.*table/i
    ];

    const url = req.url.toLowerCase();
    return sqlPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Get client IP address
   */
  static getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'];
  }

  /**
   * Check if endpoint is safe (doesn't need security checks)
   */
  static isSafeEndpoint(path) {
    const safeEndpoints = [
      '/health',
      '/readiness',
      '/liveness',
      '/metrics',
      '/api/docs',
      '/favicon.ico',
      '/robots.txt'
    ];

    return safeEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  /**
   * Generate CSRF token for responses
   */
  static generateCSRFToken(req, res) {
    const token = securityHardening.generateCSRFToken(req, res);
    return token;
  }
}

// Export individual middleware functions
export const csrfProtection = EnhancedSecurityMiddleware.csrfProtection();
export const advancedRateLimit = (options) => EnhancedSecurityMiddleware.advancedRateLimit(options);
export const validateInput = (rules) => EnhancedSecurityMiddleware.validateInput(rules);
export const ipBlocker = EnhancedSecurityMiddleware.ipBlocker();
export const suspiciousActivityDetector = EnhancedSecurityMiddleware.suspiciousActivityDetector();
export const contentSecurityPolicy = (options) => EnhancedSecurityMiddleware.contentSecurityPolicy(options);
export const secureHeaders = EnhancedSecurityMiddleware.secureHeaders();

// Export the class for custom usage
export default EnhancedSecurityMiddleware;
