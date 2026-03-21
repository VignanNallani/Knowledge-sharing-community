import crypto from 'crypto';
import { observability } from '../utils/observability.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Mentorship Security Service
 * Handles security-related operations, fraud detection, and data protection
 */
class MentorshipSecurityService {
  constructor() {
    this.suspiciousPatterns = new Map();
    this.blockedUsers = new Set();
    this.rateLimitStore = new Map();
    this.encryptionKey = process.env.MENTORSHIP_ENCRYPTION_KEY || crypto.randomBytes(32);
  }

  // ==================== DATA PROTECTION ====================

  /**
   * Encrypt sensitive data
   */
  encryptSensitiveData(data) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('mentorship-data'));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      observability.trackError(error);
      throw new ApiError(500, 'Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const algorithm = 'aes-256-gcm';
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      
      decipher.setAAD(Buffer.from('mentorship-data'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      observability.trackError(error);
      throw new ApiError(500, 'Failed to decrypt sensitive data');
    }
  }

  /**
   * Anonymize user data for analytics
   */
  anonymizeUserData(userData) {
    const anonymized = { ...userData };
    
    // Replace direct identifiers with hashes
    if (anonymized.email) {
      anonymized.emailHash = this.hashEmail(anonymized.email);
      delete anonymized.email;
    }
    
    if (anonymized.name) {
      anonymized.nameInitial = anonymized.name.charAt(0) + '***';
      delete anonymized.name;
    }
    
    if (anonymized.phoneNumber) {
      anonymized.phoneHash = this.hashPhone(anonymized.phoneNumber);
      delete anonymized.phoneNumber;
    }
    
    return anonymized;
  }

  /**
   * Hash email for analytics
   */
  hashEmail(email) {
    return crypto.createHash('sha256')
      .update(email.toLowerCase())
      .digest('hex');
  }

  /**
   * Hash phone number for analytics
   */
  hashPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return crypto.createHash('sha256')
      .update(cleanPhone)
      .digest('hex');
  }

  // ==================== FRAUD DETECTION ====================

  /**
   * Analyze user behavior for fraud patterns
   */
  async analyzeUserBehavior(userId, action, context = {}) {
    const behaviorKey = `behavior_${userId}`;
    const currentBehavior = this.suspiciousPatterns.get(behaviorKey) || {
      actions: [],
      riskScore: 0,
      flags: []
    };

    // Record action
    currentBehavior.actions.push({
      action,
      timestamp: new Date(),
      context
    });

    // Analyze patterns
    const analysis = await this.detectFraudPatterns(currentBehavior.actions);
    
    currentBehavior.riskScore = analysis.riskScore;
    currentBehavior.flags = analysis.flags;
    
    this.suspiciousPatterns.set(behaviorKey, currentBehavior);

    // Take action if high risk
    if (analysis.riskScore >= 80) {
      await this.handleHighRiskUser(userId, analysis);
    }

    return analysis;
  }

  /**
   * Detect fraud patterns in user actions
   */
  async detectFraudPatterns(actions) {
    const recentActions = actions.filter(a => 
      new Date() - new Date(a.timestamp) < 24 * 60 * 60 * 1000
    );

    const analysis = {
      riskScore: 0,
      flags: [],
      patterns: {}
    };

    // Pattern 1: Rapid mentorship requests
    const requests = recentActions.filter(a => a.action === 'mentorship_request');
    if (requests.length > 10) {
      analysis.riskScore += 30;
      analysis.flags.push('rapid_requests');
      analysis.patterns.rapidRequests = requests.length;
    }

    // Pattern 2: Multiple account creation
    const profileCreations = recentActions.filter(a => a.action === 'profile_creation');
    if (profileCreations.length > 2) {
      analysis.riskScore += 40;
      analysis.flags.push('multiple_profiles');
      analysis.patterns.multipleProfiles = profileCreations.length;
    }

    // Pattern 3: Suspicious feedback patterns
    const feedback = recentActions.filter(a => a.action === 'feedback_submission');
    if (feedback.length > 20) {
      analysis.riskScore += 25;
      analysis.flags.push('excessive_feedback');
      analysis.patterns.excessiveFeedback = feedback.length;
    }

    // Pattern 4: Time-based anomalies
    const nightActions = recentActions.filter(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour >= 2 && hour <= 5;
    });
    
    if (nightActions.length > recentActions.length * 0.5) {
      analysis.riskScore += 15;
      analysis.flags.push('unusual_timing');
      analysis.patterns.unusualTiming = nightActions.length;
    }

    // Pattern 5: Geographic anomalies (if location data available)
    const locations = recentActions
      .filter(a => a.context?.location)
      .map(a => a.context.location);

    if (locations.length > 1) {
      const uniqueLocations = new Set(locations);
      if (uniqueLocations.size > 3) {
        analysis.riskScore += 20;
        analysis.flags.push('geographic_anomaly');
        analysis.patterns.geographicAnomaly = uniqueLocations.size;
      }
    }

    return analysis;
  }

  /**
   * Handle high-risk users
   */
  async handleHighRiskUser(userId, analysis) {
    // Log security event
    observability.trackSecurityEvent('high_risk_user_detected', {
      userId,
      riskScore: analysis.riskScore,
      flags: analysis.flags,
      patterns: analysis.patterns
    });

    // Apply temporary restrictions
    if (analysis.riskScore >= 90) {
      this.blockedUsers.add(userId);
      
      // Schedule unblock after 24 hours
      setTimeout(() => {
        this.blockedUsers.delete(userId);
      }, 24 * 60 * 60 * 1000);
    }

    // Require additional verification
    if (analysis.riskScore >= 80) {
      // This would trigger additional verification steps
      await this.requireAdditionalVerification(userId);
    }
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  /**
   * Require additional verification
   */
  async requireAdditionalVerification(userId) {
    // Implementation for additional verification
    // This could include email verification, phone verification, etc.
    observability.trackSecurityEvent('additional_verification_required', {
      userId
    });
  }

  // ==================== RATE LIMITING ====================

  /**
   * Advanced rate limiting with user-specific limits
   */
  checkRateLimit(userId, action, limits = {}) {
    const key = `${action}_${userId}`;
    const now = Date.now();
    const userLimits = this.rateLimitStore.get(key) || {
      requests: [],
      count: 0
    };

    // Clean old requests
    const windowMs = limits.windowMs || 15 * 60 * 1000; // 15 minutes default
    userLimits.requests = userLimits.requests.filter(timestamp => 
      now - timestamp < windowMs
    );

    // Check limit
    const maxRequests = limits.max || 10;
    if (userLimits.requests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: userLimits.requests[0] + windowMs
      };
    }

    // Add current request
    userLimits.requests.push(now);
    userLimits.count++;
    this.rateLimitStore.set(key, userLimits);

    return {
      allowed: true,
      remaining: maxRequests - userLimits.requests.length,
      resetTime: now + windowMs
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(userId, action) {
    const key = `${action}_${userId}`;
    const userLimits = this.rateLimitStore.get(key);
    
    if (!userLimits) {
      return { allowed: true, remaining: 10, resetTime: Date.now() + 15 * 60 * 1000 };
    }

    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const recentRequests = userLimits.requests.filter(timestamp => 
      now - timestamp < windowMs
    );

    return {
      allowed: recentRequests.length < 10,
      remaining: Math.max(0, 10 - recentRequests.length),
      resetTime: recentRequests.length > 0 ? recentRequests[0] + windowMs : now + windowMs
    };
  }

  // ==================== CONTENT MODERATION ====================

  /**
   * Moderate user-generated content
   */
  async moderateContent(content, contentType = 'text') {
    const moderation = {
      approved: true,
      score: 0,
      flags: [],
      filteredContent: content
    };

    if (contentType === 'text') {
      // Check for inappropriate content
      const inappropriatePatterns = [
        /\b(hate|racist|sexist|homophobic|transphobic)\b/i,
        /\b(violence|threat|kill|harm|hurt)\b/i,
        /\b(scam|fraud|fake|phishing)\b/i,
        /\b(spam|advertisement|promo|marketing)\b/i
      ];

      for (const pattern of inappropriatePatterns) {
        if (pattern.test(content)) {
          moderation.approved = false;
          moderation.score += 25;
          moderation.flags.push('inappropriate_content');
        }
      }

      // Check for personal information
      const personalInfoPatterns = [
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
        /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit cards
      ];

      for (const pattern of personalInfoPatterns) {
        if (pattern.test(content)) {
          moderation.score += 15;
          moderation.flags.push('personal_information');
          // Filter out the personal information
          moderation.filteredContent = content.replace(pattern, '[REDACTED]');
        }
      }

      // Check for excessive capitalization (shouting)
      const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
      if (uppercaseRatio > 0.5) {
        moderation.score += 10;
        moderation.flags.push('excessive_capitalization');
      }

      // Check for repetitive content
      const words = content.toLowerCase().split(/\s+/);
      const uniqueWords = new Set(words);
      const repetitionRatio = 1 - (uniqueWords.size / words.length);
      if (repetitionRatio > 0.7) {
        moderation.score += 20;
        moderation.flags.push('repetitive_content');
      }
    }

    // Auto-reject high scoring content
    if (moderation.score >= 50) {
      moderation.approved = false;
    }

    // Log moderation results
    observability.trackSecurityEvent('content_moderated', {
      contentType,
      score: moderation.score,
      flags: moderation.flags,
      approved: moderation.approved
    });

    return moderation;
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html) {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    return sanitized;
  }

  // ==================== AUDIT LOGGING ====================

  /**
   * Log security events
   */
  logSecurityEvent(event, data) {
    const auditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event,
      data: this.anonymizeUserData(data),
      severity: this.determineSeverity(event, data)
    };

    // In production, this would be stored in a secure audit log system
    observability.trackSecurityEvent(event, auditLog);

    return auditLog;
  }

  /**
   * Determine event severity
   */
  determineSeverity(event, data) {
    const highSeverityEvents = [
      'account_takeover_attempt',
      'data_breach_attempt',
      'fraud_detected',
      'high_risk_user_detected'
    ];

    const mediumSeverityEvents = [
      'suspicious_activity',
      'rate_limit_exceeded',
      'content_moderated',
      'authentication_failure'
    ];

    if (highSeverityEvents.includes(event)) return 'HIGH';
    if (mediumSeverityEvents.includes(event)) return 'MEDIUM';
    return 'LOW';
  }

  // ==================== ACCESS CONTROL ====================

  /**
   * Check data access permissions
   */
  checkDataAccess(userId, resourceType, resourceId, action) {
    const accessRules = {
      'mentor_profile': {
        'read': ['owner', 'admin', 'public'],
        'write': ['owner', 'admin'],
        'delete': ['owner', 'admin']
      },
      'mentee_profile': {
        'read': ['owner', 'admin'],
        'write': ['owner', 'admin'],
        'delete': ['owner', 'admin']
      },
      'mentorship_request': {
        'read': ['mentor', 'mentee', 'admin'],
        'write': ['mentor', 'mentee', 'admin'],
        'delete': ['mentee', 'admin']
      },
      'mentorship_relationship': {
        'read': ['mentor', 'mentee', 'admin'],
        'write': ['mentor', 'mentee', 'admin'],
        'delete': ['admin']
      },
      'feedback': {
        'read': ['author', 'recipient', 'admin'],
        'write': ['author', 'admin'],
        'delete': ['author', 'admin']
      }
    };

    const rules = accessRules[resourceType]?.[action];
    if (!rules) {
      return { allowed: false, reason: 'Invalid resource type or action' };
    }

    // This would need to be implemented based on actual user roles and ownership
    // For now, return a basic check
    return { allowed: true, reason: 'Access granted' };
  }

  /**
   * Generate secure session token
   */
  generateSecureToken(payload) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto.createHmac('sha256', this.encryptionKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify secure token
   */
  verifySecureToken(token) {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      const expectedSignature = crypto.createHmac('sha256', this.encryptionKey)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
      
      // Check expiration
      if (payload.exp && Date.now() > payload.exp * 1000) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired token');
    }
  }

  // ==================== PRIVACY CONTROLS ====================

  /**
   * Apply privacy settings to data
   */
  applyPrivacySettings(data, userPrivacySettings) {
    const filtered = { ...data };

    // Apply privacy controls based on user settings
    if (userPrivacySettings?.hideRealName) {
      filtered.displayName = this.generateDisplayName(data.name);
      delete filtered.name;
    }

    if (userPrivacySettings?.hideEmail) {
      delete filtered.email;
    }

    if (userPrivacySettings?.hideLocation) {
      delete filtered.location;
      delete filtered.timezone;
    }

    if (userPrivacySettings?.hideExperience) {
      delete filtered.yearsOfExperience;
      delete filtered.company;
    }

    return filtered;
  }

  /**
   * Generate display name from real name
   */
  generateDisplayName(realName) {
    if (!realName) return 'Anonymous User';
    
    const names = realName.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0) + '***';
    }
    
    return names[0].charAt(0) + '*** ' + names[names.length - 1].charAt(0) + '***';
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(userId) {
    // This would collect all user data from various tables
    const userData = {
      profile: {},
      mentorshipData: {},
      activity: {},
      settings: {}
    };

    // Log data export
    this.logSecurityEvent('data_export_requested', {
      userId,
      dataType: 'full_user_data'
    });

    return userData;
  }

  /**
   * Delete user data (GDPR compliance)
   */
  async deleteUserData(userId) {
    // This would securely delete or anonymize all user data
    // Log data deletion
    this.logSecurityEvent('data_deletion_requested', {
      userId,
      dataType: 'full_user_data'
    });

    return true;
  }
}

export const mentorshipSecurityService = new MentorshipSecurityService();
export default mentorshipSecurityService;
