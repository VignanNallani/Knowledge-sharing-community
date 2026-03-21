import crypto from 'crypto';
import { logError, logWarning, logInfo } from '../config/structured-logger.js';

/**
 * Error Intelligence System
 * 
 * Provides comprehensive error classification, fingerprinting, and analysis
 * for production-grade error tracking and alerting.
 */

// Error severity levels
export const ERROR_SEVERITY = {
  CRITICAL: 5,  // System down, data loss, security breach
  HIGH: 4,      // Major functionality loss, performance degradation
  MEDIUM: 3,    // Partial functionality loss, workarounds available
  LOW: 2,       // Minor issues, cosmetic problems
  INFO: 1       // Expected errors, handled gracefully
};

// Error categories
export const ERROR_CATEGORIES = {
  SYSTEM: 'system',
  APPLICATION: 'application',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  EXTERNAL: 'external',
  BUSINESS: 'business',
  NETWORK: 'network',
  DATABASE: 'database',
  CACHE: 'cache',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation'
};

// Error taxonomy with patterns and classifications
export const ERROR_TAXONOMY = {
  // System errors
  SYSTEM: {
    patterns: [
      /OutOfMemoryError/i,
      /StackOverflowError/i,
      /ENOTFOUND/i,
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /ENETUNREACH/i
    ],
    severity: ERROR_SEVERITY.CRITICAL,
    recoveryHints: [
      'Check system resources',
      'Verify network connectivity',
      'Restart affected services',
      'Scale up resources'
    ]
  },

  // Database errors
  DATABASE: {
    patterns: [
      /connection.*timeout/i,
      /connection.*refused/i,
      /deadlock/i,
      /constraint.*violation/i,
      /duplicate.*key/i,
      /foreign.*key/i,
      /table.*not.*found/i,
      /syntax.*error/i
    ],
    severity: ERROR_SEVERITY.HIGH,
    recoveryHints: [
      'Check database connection',
      'Verify query syntax',
      'Check constraints',
      'Review transaction logic',
      'Check database server status'
    ]
  },

  // Authentication errors
  AUTHENTICATION: {
    patterns: [
      /invalid.*token/i,
      /token.*expired/i,
      /unauthorized/i,
      /authentication.*failed/i,
      /invalid.*credentials/i,
      /jwt.*malformed/i
    ],
    severity: ERROR_SEVERITY.MEDIUM,
    recoveryHints: [
      'Refresh authentication token',
      'Check user credentials',
      'Verify token format',
      'Check token expiration'
    ]
  },

  // Authorization errors
  AUTHORIZATION: {
    patterns: [
      /access.*denied/i,
      /permission.*denied/i,
      /insufficient.*privileges/i,
      /forbidden/i,
      /role.*required/i
    ],
    severity: ERROR_SEVERITY.MEDIUM,
    recoveryHints: [
      'Check user permissions',
      'Verify role assignments',
      'Review access control rules',
      'Contact administrator'
    ]
  },

  // Validation errors
  VALIDATION: {
    patterns: [
      /validation.*failed/i,
      /invalid.*input/i,
      /required.*field/i,
      /format.*invalid/i,
      /constraint.*validation/i
    ],
    severity: ERROR_SEVERITY.LOW,
    recoveryHints: [
      'Check input format',
      'Verify required fields',
      'Review validation rules',
      'Check data types'
    ]
  },

  // Network errors
  NETWORK: {
    patterns: [
      /network.*error/i,
      /connection.*reset/i,
      /connection.*aborted/i,
      /socket.*timeout/i,
      /dns.*lookup/i,
      /ssl.*error/i
    ],
    severity: ERROR_SEVERITY.HIGH,
    recoveryHints: [
      'Check network connectivity',
      'Verify DNS configuration',
      'Check SSL certificates',
      'Review firewall rules',
      'Check load balancer status'
    ]
  },

  // External service errors
  EXTERNAL: {
    patterns: [
      /external.*service/i,
      /third.*party/i,
      /api.*timeout/i,
      /service.*unavailable/i,
      /rate.*limit/i,
      /quota.*exceeded/i
    ],
    severity: ERROR_SEVERITY.MEDIUM,
    recoveryHints: [
      'Check external service status',
      'Implement retry logic',
      'Review rate limits',
      'Check API credentials',
      'Consider circuit breaker'
    ]
  },

  // Performance errors
  PERFORMANCE: {
    patterns: [
      /timeout/i,
      /slow.*query/i,
      /memory.*leak/i,
      /high.*cpu/i,
      /resource.*exhausted/i,
      /queue.*full/i
    ],
    severity: ERROR_SEVERITY.HIGH,
    recoveryHints: [
      'Optimize database queries',
      'Add caching',
      'Scale resources',
      'Review algorithm complexity',
      'Monitor resource usage'
    ]
  },

  // Security errors
  SECURITY: {
    patterns: [
      /sql.*injection/i,
      /xss/i,
      /csrf/i,
      /security.*violation/i,
      /malicious.*request/i,
      /brute.*force/i
    ],
    severity: ERROR_SEVERITY.CRITICAL,
    recoveryHints: [
      'Block malicious IP',
      'Review security logs',
      'Update security rules',
      'Notify security team',
      'Check for data breach'
    ]
  }
};

class ErrorIntelligence {
  constructor() {
    this.errorPatterns = new Map();
    this.errorCounts = new Map();
    this.errorGroups = new Map();
    this.lastErrors = new Map();
    this.initializePatterns();
  }

  /**
   * Initialize error patterns from taxonomy
   */
  initializePatterns() {
    for (const [category, config] of Object.entries(ERROR_TAXONOMY)) {
      for (const pattern of config.patterns) {
        this.errorPatterns.set(pattern.toString(), {
          category,
          severity: config.severity,
          recoveryHints: config.recoveryHints
        });
      }
    }
  }

  /**
   * Classify an error based on its properties
   */
  classifyError(error, context = {}) {
    const classification = {
      category: ERROR_CATEGORIES.APPLICATION,
      severity: ERROR_SEVERITY.MEDIUM,
      confidence: 0,
      recoveryHints: [],
      patterns: []
    };

    const errorText = this.getErrorText(error);
    const stackTrace = error.stack || '';
    const contextText = JSON.stringify(context);

    // Check against known patterns
    for (const [patternStr, patternConfig] of this.errorPatterns) {
      const pattern = new RegExp(patternStr);
      let matches = 0;
      
      if (pattern.test(errorText)) matches++;
      if (pattern.test(stackTrace)) matches++;
      if (pattern.test(contextText)) matches++;

      if (matches > 0) {
        classification.patterns.push(patternStr);
        classification.confidence += matches * 0.3;
        
        // Update classification if this pattern has higher severity
        if (patternConfig.severity > classification.severity) {
          classification.category = patternConfig.category;
          classification.severity = patternConfig.severity;
          classification.recoveryHints = patternConfig.recoveryHints;
        }
      }
    }

    // Normalize confidence
    classification.confidence = Math.min(classification.confidence, 1.0);

    // Additional classification based on error properties
    if (error.name) {
      classification.errorType = error.name;
    }

    if (error.code) {
      classification.errorCode = error.code;
    }

    return classification;
  }

  /**
   * Generate error fingerprint for deduplication
   */
  generateFingerprint(error, context = {}) {
    const normalizedError = this.normalizeError(error);
    const normalizedContext = this.normalizeContext(context);
    
    const fingerprintData = {
      message: normalizedError.message,
      stackTrace: normalizedError.stackTrace,
      errorType: normalizedError.type,
      component: normalizedContext.component,
      operation: normalizedContext.operation,
      errorCode: normalizedError.code
    };

    const fingerprintString = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort());
    return crypto.createHash('sha256').update(fingerprintString).digest('hex').substring(0, 16);
  }

  /**
   * Normalize error for consistent fingerprinting
   */
  normalizeError(error) {
    if (!error) {
      return {
        message: 'Unknown error',
        stackTrace: '',
        type: 'Unknown',
        code: null
      };
    }

    // Extract stack trace and normalize it
    let stackTrace = error.stack || '';
    if (stackTrace) {
      // Remove line numbers and file paths for consistency
      stackTrace = stackTrace
        .replace(/:\d+:\d+/g, ':*:') // Normalize line numbers
        .replace(/at.*\(.*\)/g, 'at (*)') // Normalize file paths
        .replace(/\\+/g, '/'); // Normalize path separators
    }

    // Normalize message by removing dynamic values
    let message = error.message || 'Unknown error';
    message = message
      .replace(/\d+/g, '*') // Replace numbers
      .replace(/['"][^'"]*['"]/g, '"*"') // Replace string literals
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '*') // Replace UUIDs
      .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\b/g, '*'); // Replace timestamps

    return {
      message,
      stackTrace,
      type: error.constructor.name || 'Error',
      code: error.code || null
    };
  }

  /**
   * Normalize context for consistent fingerprinting
   */
  normalizeContext(context) {
    return {
      component: context.component || 'Unknown',
      operation: context.operation || 'Unknown',
      endpoint: context.endpoint || null,
      method: context.method || null
    };
  }

  /**
   * Get error text for pattern matching
   */
  getErrorText(error) {
    if (!error) return '';
    
    const parts = [
      error.message || '',
      error.name || '',
      error.code || '',
      error.stack || '',
      JSON.stringify(error)
    ];
    
    return parts.join(' ').toLowerCase();
  }

  /**
   * Track error occurrence for grouping and analysis
   */
  trackError(error, context = {}) {
    const fingerprint = this.generateFingerprint(error, context);
    const classification = this.classifyError(error, context);
    const timestamp = Date.now();

    // Update error counts
    const currentCount = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, currentCount + 1);

    // Update last occurrence
    this.lastErrors.set(fingerprint, timestamp);

    // Group similar errors
    if (!this.errorGroups.has(fingerprint)) {
      this.errorGroups.set(fingerprint, {
        fingerprint,
        firstSeen: timestamp,
        lastSeen: timestamp,
        count: 0,
        classification,
        sampleError: error,
        sampleContext: context,
        occurrences: []
      });
    }

    const group = this.errorGroups.get(fingerprint);
    group.count++;
    group.lastSeen = timestamp;
    group.occurrences.push({
      timestamp,
      context: { ...context },
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      }
    });

    // Keep only last 100 occurrences to prevent memory issues
    if (group.occurrences.length > 100) {
      group.occurrences = group.occurrences.slice(-100);
    }

    // Log the error with intelligence data
    logError('Error tracked by intelligence system', {
      fingerprint,
      classification,
      count: group.count,
      firstSeen: new Date(group.firstSeen).toISOString(),
      lastSeen: new Date(group.lastSeen).toISOString(),
      context
    });

    return {
      fingerprint,
      classification,
      group,
      isNew: currentCount === 0
    };
  }

  /**
   * Get error statistics and analytics
   */
  getErrorAnalytics(timeWindow = 3600000) { // Default 1 hour
    const now = Date.now();
    const windowStart = now - timeWindow;

    const analytics = {
      totalErrors: 0,
      uniqueErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByComponent: {},
      topErrors: [],
      recentErrors: [],
      errorRate: 0,
      timeWindow
    };

    // Process error groups
    for (const [fingerprint, group] of this.errorGroups) {
      // Filter by time window
      const recentOccurrences = group.occurrences.filter(occ => occ.timestamp >= windowStart);
      
      if (recentOccurrences.length === 0) continue;

      analytics.totalErrors += recentOccurrences.length;
      analytics.uniqueErrors++;

      // Category breakdown
      const category = group.classification.category;
      analytics.errorsByCategory[category] = (analytics.errorsByCategory[category] || 0) + recentOccurrences.length;

      // Severity breakdown
      const severity = group.classification.severity;
      analytics.errorsBySeverity[severity] = (analytics.errorsBySeverity[severity] || 0) + recentOccurrences.length;

      // Component breakdown
      const component = group.sampleContext.component || 'Unknown';
      analytics.errorsByComponent[component] = (analytics.errorsByComponent[component] || 0) + recentOccurrences.length;

      // Top errors
      analytics.topErrors.push({
        fingerprint,
        count: recentOccurrences.length,
        category,
        severity,
        message: group.sampleError.message,
        component,
        firstSeen: group.firstSeen,
        lastSeen: group.lastSeen
      });

      // Recent errors
      analytics.recentErrors.push(...recentOccurrences.map(occ => ({
        ...occ,
        fingerprint,
        category,
        severity
      })));
    }

    // Sort top errors by count
    analytics.topErrors.sort((a, b) => b.count - a.count);
    analytics.topErrors = analytics.topErrors.slice(0, 10);

    // Sort recent errors by timestamp
    analytics.recentErrors.sort((a, b) => b.timestamp - a.timestamp);
    analytics.recentErrors = analytics.recentErrors.slice(0, 50);

    // Calculate error rate (errors per minute)
    analytics.errorRate = timeWindow > 0 ? (analytics.totalErrors / (timeWindow / 60000)) : 0;

    return analytics;
  }

  /**
   * Get error trends over time
   */
  getErrorTrends(buckets = 24) { // Default 24 buckets (hourly for a day)
    const now = Date.now();
    const bucketSize = (24 * 60 * 60 * 1000) / buckets; // Day divided by buckets
    const trends = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = now - (buckets - i) * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      
      let errorCount = 0;
      let criticalCount = 0;

      for (const group of this.errorGroups.values()) {
        const bucketOccurrences = group.occurrences.filter(
          occ => occ.timestamp >= bucketStart && occ.timestamp < bucketEnd
        );
        
        errorCount += bucketOccurrences.length;
        criticalCount += bucketOccurrences.filter(
          occ => group.classification.severity === ERROR_SEVERITY.CRITICAL
        ).length;
      }

      trends.push({
        timestamp: bucketStart,
        errorCount,
        criticalCount,
        timeRange: {
          start: new Date(bucketStart).toISOString(),
          end: new Date(bucketEnd).toISOString()
        }
      });
    }

    return trends;
  }

  /**
   * Get recovery suggestions for an error
   */
  getRecoverySuggestions(error, context = {}) {
    const classification = this.classifyError(error, context);
    const suggestions = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      automated: []
    };

    // Add classification-based suggestions
    if (classification.recoveryHints) {
      classification.recoveryHints.forEach(hint => {
        if (hint.includes('Check') || hint.includes('Verify')) {
          suggestions.immediate.push(hint);
        } else if (hint.includes('Implement') || hint.includes('Add')) {
          suggestions.shortTerm.push(hint);
        } else if (hint.includes('Scale') || hint.includes('Optimize')) {
          suggestions.longTerm.push(hint);
        }
      });
    }

    // Add context-specific suggestions
    if (context.component === 'Database') {
      suggestions.immediate.push('Check database connection pool');
      suggestions.shortTerm.push('Review query performance');
      suggestions.longTerm.push('Consider database optimization');
    }

    if (context.component === 'External') {
      suggestions.immediate.push('Check external service status');
      suggestions.shortTerm.push('Implement retry with exponential backoff');
      suggestions.longTerm.push('Consider circuit breaker pattern');
    }

    // Add automated recovery suggestions
    if (classification.severity <= ERROR_SEVERITY.MEDIUM) {
      suggestions.automated.push('Auto-retry with backoff');
    }

    if (classification.category === ERROR_CATEGORIES.NETWORK) {
      suggestions.automated.push('Failover to backup endpoint');
    }

    return suggestions;
  }

  /**
   * Check if error should trigger immediate alert
   */
  shouldAlert(error, context = {}) {
    const classification = this.classifyError(error, context);
    const fingerprint = this.generateFingerprint(error, context);
    const group = this.errorGroups.get(fingerprint);

    // Always alert on critical errors
    if (classification.severity === ERROR_SEVERITY.CRITICAL) {
      return { shouldAlert: true, reason: 'Critical severity' };
    }

    // Alert on high severity errors
    if (classification.severity === ERROR_SEVERITY.HIGH) {
      return { shouldAlert: true, reason: 'High severity' };
    }

    // Alert on error bursts (same error occurring frequently)
    if (group && group.count > 10) {
      return { shouldAlert: true, reason: 'Error burst detected' };
    }

    // Alert on new errors in production
    if (process.env.NODE_ENV === 'production' && group && group.count === 1) {
      return { shouldAlert: true, reason: 'New error in production' };
    }

    // Alert on security errors
    if (classification.category === ERROR_CATEGORIES.SECURITY) {
      return { shouldAlert: true, reason: 'Security-related error' };
    }

    return { shouldAlert: false, reason: 'No alert criteria met' };
  }

  /**
   * Clear old error data to prevent memory issues
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    for (const [fingerprint, group] of this.errorGroups) {
      if (group.lastSeen < cutoff) {
        this.errorGroups.delete(fingerprint);
        this.errorCounts.delete(fingerprint);
        this.lastErrors.delete(fingerprint);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logInfo(`Cleaned up ${cleaned} old error groups`);
    }

    return cleaned;
  }

  /**
   * Get system health based on error patterns
   */
  getSystemHealth() {
    const analytics = this.getErrorAnalytics(300000); // Last 5 minutes
    const trends = this.getErrorTrends(12); // Last 12 buckets (5 minutes each)

    const health = {
      status: 'healthy',
      score: 100,
      issues: [],
      metrics: {
        errorRate: analytics.errorRate,
        totalErrors: analytics.totalErrors,
        uniqueErrors: analytics.uniqueErrors,
        criticalErrors: analytics.errorsBySeverity[ERROR_SEVERITY.CRITICAL] || 0,
        highErrors: analytics.errorsBySeverity[ERROR_SEVERITY.HIGH] || 0
      },
      timestamp: new Date().toISOString()
    };

    // Determine health status
    if (health.metrics.criticalErrors > 0) {
      health.status = 'critical';
      health.score = Math.max(0, health.score - (health.metrics.criticalErrors * 20));
      health.issues.push(`${health.metrics.criticalErrors} critical errors`);
    }

    if (health.metrics.highErrors > 5) {
      health.status = health.status === 'critical' ? 'critical' : 'degraded';
      health.score = Math.max(0, health.score - (health.metrics.highErrors * 10));
      health.issues.push(`${health.metrics.highErrors} high severity errors`);
    }

    if (health.metrics.errorRate > 10) { // More than 10 errors per minute
      health.status = health.status === 'critical' ? 'critical' : 'degraded';
      health.score = Math.max(0, health.score - 20);
      health.issues.push(`High error rate: ${health.metrics.errorRate.toFixed(2)}/min`);
    }

    // Check trends
    const recentTrend = trends.slice(-3); // Last 3 buckets
    const isIncreasing = recentTrend.every((bucket, i) => 
      i === 0 || bucket.errorCount >= recentTrend[i - 1].errorCount
    );

    if (isIncreasing && recentTrend[recentTrend.length - 1].errorCount > 5) {
      health.status = health.status === 'critical' ? 'critical' : 'degraded';
      health.score = Math.max(0, health.score - 15);
      health.issues.push('Error rate is increasing');
    }

    return health;
  }
}

// Create singleton instance
export const errorIntelligence = new ErrorIntelligence();

export default ErrorIntelligence;
