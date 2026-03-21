import crypto from 'crypto';
import { logger } from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * OWASP Security Hardening Module
 * Implements additional security measures beyond basic middleware
 */
export class SecurityHardening {
  constructor() {
    this.failedAttempts = new Map(); // Track failed attempts per IP/user
    this.blockedIPs = new Set(); // Blocked IP addresses
    this.suspiciousPatterns = new Map(); // Track suspicious activity patterns
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  /**
   * Rate limiting with exponential backoff
   * @param {string} identifier - IP address or user ID
   * @param {Object} options - Rate limiting options
   */
  checkRateLimit(identifier, options = {}) {
    const {
      maxAttempts = 5,
      windowMs = 900000, // 15 minutes
      blockDurationMs = 3600000, // 1 hour
      exponentialBackoff = true
    } = options;

    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blockedUntil: 0
      });
    }

    const record = this.failedAttempts.get(key);
    
    // Check if currently blocked
    if (record.blockedUntil > now) {
      const remainingTime = Math.ceil((record.blockedUntil - now) / 1000);
      throw new ApiError(429, `Rate limit exceeded. Try again in ${remainingTime} seconds.`);
    }

    // Reset if window has passed
    if (now - record.firstAttempt > windowMs) {
      record.attempts = 0;
      record.firstAttempt = now;
    }

    record.attempts++;
    record.lastAttempt = now;

    // Calculate block duration with exponential backoff
    let blockDuration = blockDurationMs;
    if (exponentialBackoff) {
      blockDuration = Math.min(blockDurationMs * Math.pow(2, record.attempts - maxAttempts), 86400000); // Max 24 hours
    }

    // Block if exceeded max attempts
    if (record.attempts >= maxAttempts) {
      record.blockedUntil = now + blockDuration;
      
      logger.warn('Rate limit triggered - IP blocked', {
        identifier,
        attempts: record.attempts,
        blockDuration: blockDuration / 1000,
        blockedUntil: new Date(record.blockedUntil).toISOString()
      });
      
      throw new ApiError(429, `Rate limit exceeded. Try again in ${Math.ceil(blockDuration / 1000)} seconds.`);
    }
  }

  /**
   * Input validation with comprehensive security checks
   * @param {*} input - Input to validate
   * @param {Object} rules - Validation rules
   */
  validateInput(input, rules = {}) {
    const {
      maxLength = 10000,
      allowHTML = false,
      allowSQL = false,
      allowJS = false,
      allowedChars = null,
      sanitize = true
    } = rules;

    if (input === null || input === undefined) {
      return input;
    }

    const stringValue = String(input);
    
    // Length validation
    if (stringValue.length > maxLength) {
      throw new ApiError(400, `Input exceeds maximum length of ${maxLength} characters`);
    }

    // Character validation
    if (allowedChars && !new RegExp(`^[${allowedChars}]*$`).test(stringValue)) {
      throw new ApiError(400, 'Input contains invalid characters');
    }

    // Security pattern detection
    const securityPatterns = [
      // XSS patterns
      ...(!allowJS ? [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi
      ] : []),
      
      // SQL injection patterns
      ...(!allowSQL ? [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(--|\*|;|'|"|<|>|\/\*|\*\/)/gi,
        /(\bOR\b.*=.*\bOR\b)/gi,
        /(\bAND\b.*=.*\bAND\b)/gi
      ] : []),
      
      // HTML patterns
      ...(!allowHTML ? [
        /<[^>]*>/g
      ] : []),
      
      // Path traversal
      /\.\.[\/\\]/g,
      
      // Command injection
      /[;&|`$(){}[\]]/g
    ];

    for (const pattern of securityPatterns) {
      if (pattern.test(stringValue)) {
        logger.warn('Suspicious input pattern detected', {
          input: stringValue.substring(0, 100),
          pattern: pattern.source
        });
        throw new ApiError(400, 'Input contains potentially malicious content');
      }
    }

    return sanitize ? this.sanitizeInput(stringValue) : stringValue;
  }

  /**
   * Advanced input sanitization
   * @param {string} input - Input to sanitize
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * CSRF protection with double submit cookie
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  generateCSRFToken(req, res) {
    const token = crypto.randomBytes(32).toString('hex');
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    };
    
    res.cookie('csrf_token', token, cookieOptions);
    return token;
  }

  /**
   * Validate CSRF token
   * @param {Object} req - Express request object
   * @param {string} token - Token to validate
   */
  validateCSRFToken(req, token) {
    const cookieToken = req.cookies?.csrf_token;
    
    if (!cookieToken || !token) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'hex'),
      Buffer.from(token, 'hex')
    );
  }

  /**
   * Content Security Policy builder
   * @param {Object} options - CSP options
   */
  buildCSP(options = {}) {
    const {
      scriptSrc = ["'self'"],
      styleSrc = ["'self'", "'unsafe-inline'"],
      imgSrc = ["'self'", "data:", "https:"],
      connectSrc = ["'self'"],
      fontSrc = ["'self'"],
      objectSrc = ["'none'"],
      mediaSrc = ["'self'"],
      frameSrc = ["'none'"],
      workerSrc = ["'self'"],
      manifestSrc = ["'self'"],
      upgradeInsecureRequests = true
    } = options;

    const directives = {
      'default-src': ["'self'"],
      'script-src': scriptSrc,
      'style-src': styleSrc,
      'img-src': imgSrc,
      'connect-src': connectSrc,
      'font-src': fontSrc,
      'object-src': objectSrc,
      'media-src': mediaSrc,
      'frame-src': frameSrc,
      'worker-src': workerSrc,
      'manifest-src': manifestSrc,
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': upgradeInsecureRequests
    };

    return Object.entries(directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  /**
   * Detect suspicious activity patterns
   * @param {string} identifier - IP address or user ID
   * @param {string} activity - Activity type
   * @param {Object} metadata - Additional metadata
   */
  detectSuspiciousActivity(identifier, activity, metadata = {}) {
    const key = `suspicious_${identifier}`;
    const now = Date.now();
    
    if (!this.suspiciousPatterns.has(key)) {
      this.suspiciousPatterns.set(key, {
        activities: [],
        firstActivity: now,
        lastActivity: now
      });
    }

    const pattern = this.suspiciousPatterns.get(key);
    pattern.activities.push({
      activity,
      timestamp: now,
      metadata
    });
    pattern.lastActivity = now;

    // Keep only recent activities (last hour)
    const oneHourAgo = now - 3600000;
    pattern.activities = pattern.activities.filter(a => a.timestamp > oneHourAgo);

    // Analyze for suspicious patterns
    const suspiciousIndicators = this.analyzeSuspiciousPatterns(pattern.activities);
    
    if (suspiciousIndicators.length > 0) {
      logger.warn('Suspicious activity pattern detected', {
        identifier,
        indicators: suspiciousIndicators,
        activities: pattern.activities.length
      });
      
      // Consider blocking if highly suspicious
      if (suspiciousIndicators.some(i => i.severity === 'high')) {
        this.blockIP(identifier, 3600000); // Block for 1 hour
      }
    }
  }

  /**
   * Analyze activity patterns for suspicious behavior
   * @param {Array} activities - Array of activities
   */
  analyzeSuspiciousPatterns(activities) {
    const indicators = [];
    
    // High frequency of requests
    if (activities.length > 100) {
      indicators.push({
        type: 'high_frequency',
        severity: 'medium',
        description: 'Unusually high request frequency'
      });
    }

    // Multiple failed login attempts
    const failedLogins = activities.filter(a => a.activity === 'failed_login').length;
    if (failedLogins > 10) {
      indicators.push({
        type: 'brute_force',
        severity: 'high',
        description: 'Multiple failed login attempts detected'
      });
    }

    // Rapid succession of different activities
    const uniqueActivities = new Set(activities.map(a => a.activity)).size;
    if (uniqueActivities > 20 && activities.length < 60) {
      indicators.push({
        type: 'automated_behavior',
        severity: 'medium',
        description: 'Automated behavior pattern detected'
      });
    }

    return indicators;
  }

  /**
   * Block IP address
   * @param {string} ip - IP address to block
   * @param {number} duration - Block duration in milliseconds
   */
  blockIP(ip, duration = 3600000) {
    this.blockedIPs.add(ip);
    
    logger.warn('IP address blocked', {
      ip,
      duration: duration / 1000,
      blockedUntil: new Date(Date.now() + duration).toISOString()
    });

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      logger.info('IP address unblocked', { ip });
    }, duration);
  }

  /**
   * Check if IP is blocked
   * @param {string} ip - IP address to check
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash password with salt
   * @param {string} password - Password to hash
   * @param {string} salt - Salt to use
   */
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Verify password hash
   * @param {string} password - Password to verify
   * @param {string} hash - Hash to verify against
   * @param {string} salt - Salt used for hashing
   */
  verifyPassword(password, hash, salt) {
    const computedHash = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  }

  /**
   * Clean up old records
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean up failed attempts
    for (const [key, record] of this.failedAttempts.entries()) {
      if (record.lastAttempt < oneHourAgo && record.blockedUntil < now) {
        this.failedAttempts.delete(key);
      }
    }

    // Clean up suspicious patterns
    for (const [key, pattern] of this.suspiciousPatterns.entries()) {
      if (pattern.lastActivity < oneHourAgo) {
        this.suspiciousPatterns.delete(key);
      }
    }

    logger.debug('Security cleanup completed');
  }

  /**
   * Get security statistics
   */
  getStats() {
    return {
      blockedIPs: this.blockedIPs.size,
      trackedFailedAttempts: this.failedAttempts.size,
      suspiciousPatterns: this.suspiciousPatterns.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown security hardening
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.failedAttempts.clear();
    this.blockedIPs.clear();
    this.suspiciousPatterns.clear();
    
    logger.info('Security hardening shutdown complete');
  }
}

// Singleton instance
const securityHardening = new SecurityHardening();

export default securityHardening;
