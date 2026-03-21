import { errorIntelligence } from '../utils/error-intelligence.js';
import { logError, logWarning, logCritical } from '../config/structured-logger.js';
import { injectTraceContext } from './correlation.middleware.js';

/**
 * Error Tracking Middleware
 * 
 * Integrates with the error intelligence system to provide comprehensive
 * error tracking, classification, and alerting.
 */
export const errorTrackingMiddleware = (error, req, res, next) => {
  try {
    // Extract context for error classification
    const context = extractErrorContext(req, res, error);
    
    // Track error with intelligence system
    const trackingResult = errorIntelligence.trackError(error, context);
    
    // Check if we should alert
    const alertDecision = errorIntelligence.shouldAlert(error, context);
    
    if (alertDecision.shouldAlert) {
      handleAlert(error, context, trackingResult, alertDecision.reason);
    }
    
    // Add error tracking information to response headers
    res.setHeader('X-Error-Fingerprint', trackingResult.fingerprint);
    res.setHeader('X-Error-Category', trackingResult.classification.category);
    res.setHeader('X-Error-Severity', trackingResult.classification.severity);
    
    // Log enhanced error information
    logError('Error tracked by intelligence system', {
      fingerprint: trackingResult.fingerprint,
      classification: trackingResult.classification,
      isNew: trackingResult.isNew,
      shouldAlert: alertDecision.shouldAlert,
      alertReason: alertDecision.reason,
      context
    });

  } catch (trackingError) {
    // Fallback logging if error tracking fails
    logError('Error tracking system failed', {
      originalError: error.message,
      trackingError: trackingError.message,
      context: extractErrorContext(req, res, error)
    });
  }

  next(error);
};

/**
 * Extract relevant context from request for error classification
 */
function extractErrorContext(req, res, error) {
  return {
    component: getComponentFromRequest(req),
    operation: getOperationFromRequest(req),
    endpoint: req.originalUrl || req.url,
    method: req.method,
    statusCode: res.statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    userId: req.user?.id,
    sessionId: req.session?.id,
    errorCode: error.code,
    errorType: error.constructor.name,
    requestBody: sanitizeRequestBody(req.body),
    requestParams: req.params,
    requestQuery: req.query,
    headers: sanitizeHeaders(req.headers),
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME || 'knowledge-sharing-backend'
  };
}

/**
 * Determine component from request path
 */
function getComponentFromRequest(req) {
  const path = req.originalUrl || req.url || '';
  
  if (path.includes('/auth')) return 'Authentication';
  if (path.includes('/posts')) return 'Posts';
  if (path.includes('/comments')) return 'Comments';
  if (path.includes('/likes')) return 'Likes';
  if (path.includes('/users')) return 'Users';
  if (path.includes('/mentorship')) return 'Mentorship';
  if (path.includes('/moderation')) return 'Moderation';
  if (path.includes('/health')) return 'Health';
  if (path.includes('/observability')) return 'Observability';
  
  return 'Unknown';
}

/**
 * Determine operation from request
 */
function getOperationFromRequest(req) {
  const component = getComponentFromRequest(req);
  const method = req.method;
  const path = req.route?.path || req.path || req.originalUrl || '';
  
  // Extract operation name from path
  const operationParts = path.split('/').filter(part => part && !part.startsWith(':'));
  const operation = operationParts[operationParts.length - 1] || 'unknown';
  
  return `${component}_${method}_${operation}`;
}

/**
 * Sanitize request body for logging
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'creditCard', 'ssn', 'bankAccount'
  ];
  
  const sanitized = Array.isArray(body) ? [...body] : { ...body };
  
  const sanitizeValue = (value) => {
    if (value && typeof value === 'object') {
      return sanitizeRequestBody(value);
    }
    return value;
  };
  
  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeValue(value);
    }
  }
  
  return sanitized;
}

/**
 * Sanitize headers for logging
 */
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers;
  
  const sensitiveHeaders = [
    'authorization', 'cookie', 'x-api-key', 'x-auth-token',
    'x-session-id', 'x-csrf-token'
  ];
  
  const sanitized = { ...headers };
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Handle error alerting
 */
function handleAlert(error, context, trackingResult, reason) {
  const alertData = {
    fingerprint: trackingResult.fingerprint,
    classification: trackingResult.classification,
    context,
    reason,
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    }
  };

  // Log critical alert
  if (trackingResult.classification.severity >= 4) { // HIGH or CRITICAL
    logCritical('CRITICAL ERROR ALERT', alertData);
  } else {
    logWarning('ERROR ALERT', alertData);
  }

  // In production, you would integrate with alerting systems
  if (process.env.NODE_ENV === 'production') {
    sendToAlertingSystem(alertData);
  }
}

/**
 * Send alert to external alerting system
 */
function sendToAlertingSystem(alertData) {
  // This would integrate with systems like:
  // - PagerDuty
  // - Slack
  // - Email notifications
  // - Webhook endpoints
  // - Monitoring systems
  
  // For now, we'll just log that an alert would be sent
  logWarning('Alert would be sent to external system', {
    alertSystem: 'production-alerting',
    alertData: {
      fingerprint: alertData.fingerprint,
      severity: alertData.classification.severity,
      category: alertData.classification.category,
      reason: alertData.reason,
      component: alertData.context.component
    }
  });
}

/**
 * Error Recovery Suggestions Middleware
 * 
 * Adds recovery suggestions to error responses when appropriate
 */
export const errorRecoveryMiddleware = (error, req, res, next) => {
  const context = extractErrorContext(req, res, error);
  const suggestions = errorIntelligence.getRecoverySuggestions(error, context);
  
  // Add recovery suggestions to response if it's an error response
  if (res.statusCode >= 400) {
    const originalJson = res.json;
    res.json = function(data) {
      const enhancedData = {
        ...data,
        recovery: {
          suggestions: suggestions.immediate,
          automatedActions: suggestions.automated,
          documentation: getDocumentationLink(error, context)
        }
      };
      return originalJson.call(this, enhancedData);
    };
  }
  
  next(error);
};

/**
 * Get documentation link for error type
 */
function getDocumentationLink(error, context) {
  const component = context.component.toLowerCase();
  const errorType = error.constructor.name.toLowerCase();
  
  // Map to documentation URLs
  const docMap = {
    'validationerror': '/docs/errors/validation',
    'authenticationerror': '/docs/errors/authentication',
    'authorizationerror': '/docs/errors/authorization',
    'databaseerror': '/docs/errors/database',
    'networkerror': '/docs/errors/network'
  };
  
  return docMap[errorType] || `/docs/errors/${component}`;
}

/**
 * Error Rate Monitoring Middleware
 * 
 * Monitors error rates and triggers alerts when thresholds are exceeded
 */
export const errorRateMonitoringMiddleware = () => {
  const errorCounts = new Map();
  const windowSize = 60000; // 1 minute window
  
  return (req, res, next) => {
    const now = Date.now();
    const windowStart = now - windowSize;
    
    // Clean old error counts
    for (const [timestamp, count] of errorCounts) {
      if (timestamp < windowStart) {
        errorCounts.delete(timestamp);
      }
    }
    
    // Override res.end to track error responses
    const originalEnd = res.end;
    res.end = function(...args) {
      if (res.statusCode >= 400) {
        const currentCount = errorCounts.get(now) || 0;
        errorCounts.set(now, currentCount + 1);
        
        // Calculate error rate
        const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const errorRate = totalErrors / (windowSize / 60000); // errors per minute
        
        // Check thresholds
        if (errorRate > 10) { // More than 10 errors per minute
          logWarning('High error rate detected', {
            errorRate,
            totalErrors,
            windowSize: '1 minute',
            endpoint: req.originalUrl,
            method: req.method,
            requestId: req.requestId
          });
        }
        
        if (errorRate > 50) { // More than 50 errors per minute
          logCritical('Critical error rate detected', {
            errorRate,
            totalErrors,
            windowSize: '1 minute',
            endpoint: req.originalUrl,
            method: req.method,
            requestId: req.requestId
          });
        }
      }
      
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

/**
 * Error Context Enrichment Middleware
 * 
 * Enriches error context with additional information
 */
export const errorContextEnrichmentMiddleware = (req, res, next) => {
  // Add system context
  req.errorContext = {
    ...req.errorContext,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid
    },
    service: {
      name: process.env.SERVICE_NAME || 'knowledge-sharing-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  next();
};

export default {
  errorTrackingMiddleware,
  errorRecoveryMiddleware,
  errorRateMonitoringMiddleware,
  errorContextEnrichmentMiddleware
};
