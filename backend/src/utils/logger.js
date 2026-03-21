import { 
  structuredLogger, 
  logCritical, 
  logError, 
  logWarning, 
  logInfo, 
  logDebug, 
  logTrace,
  logRequest,
  logErrorWithContext,
  logBusinessEvent,
  logPerformance,
  logSecurity,
  logDependency,
  setLogContext,
  getLogContext,
  clearLogContext,
  withLogContext,
  generateRequestId,
  generateTraceId,
  generateSpanId
} from '../config/structured-logger.js';

/**
 * Application Logger Utility
 * 
 * This provides a convenient interface for structured logging throughout the application.
 * It wraps the structured logger and provides additional convenience methods.
 */
class AppLogger {
  constructor(component = 'Application') {
    this.component = component;
  }

  // Basic logging methods
  critical(message, meta = {}) {
    logCritical(message, { component: this.component, ...meta });
  }

  error(message, meta = {}) {
    logError(message, { component: this.component, ...meta });
  }

  warning(message, meta = {}) {
    logWarning(message, { component: this.component, ...meta });
  }

  info(message, meta = {}) {
    logInfo(message, { component: this.component, ...meta });
  }

  debug(message, meta = {}) {
    logDebug(message, { component: this.component, ...meta });
  }

  trace(message, meta = {}) {
    logTrace(message, { component: this.component, ...meta });
  }

  // Specialized logging methods
  logOperation(operation, data = {}) {
    this.info(`Operation: ${operation}`, {
      type: 'operation',
      operation,
      data,
      context: { component: this.component, operation }
    });
  }

  logOperationStart(operation, data = {}) {
    this.info(`Operation started: ${operation}`, {
      type: 'operation_start',
      operation,
      data,
      context: { component: this.component, operation }
    });
  }

  logOperationEnd(operation, duration, data = {}) {
    this.info(`Operation completed: ${operation}`, {
      type: 'operation_end',
      operation,
      duration,
      data,
      context: { component: this.component, operation }
    });

    // Also log as performance metric
    logPerformance(operation, duration, {
      component: this.component,
      ...data
    });
  }

  logOperationError(operation, error, data = {}) {
    logErrorWithContext(error, null, {
      component: this.component,
      operation,
      data,
      context: { component: this.component, operation }
    });
  }

  // Database operation logging
  logQuery(query, duration, success = true, error = null) {
    if (success) {
      logPerformance('database_query', duration, {
        component: this.component,
        operation: 'database_query',
        query: query.substring(0, 200), // Limit query length
        success: true
      });
    } else {
      logErrorWithContext(error, null, {
        component: this.component,
        operation: 'database_query',
        query: query.substring(0, 200),
        success: false
      });
    }
  }

  // Cache operation logging
  logCacheOperation(operation, key, hit = null, duration = null) {
    this.info(`Cache ${operation}: ${key}`, {
      type: 'cache_operation',
      cacheOperation: operation,
      key,
      hit,
      duration,
      context: { component: this.component, operation: `cache_${operation}` }
    });
  }

  // API call logging
  logApiCall(method, url, statusCode, duration, error = null) {
    if (error) {
      this.error(`API call failed: ${method} ${url}`, {
        type: 'api_call_error',
        method,
        url,
        statusCode,
        duration,
        error: error.message,
        context: { component: this.component, operation: 'api_call' }
      });
    } else {
      this.info(`API call: ${method} ${url}`, {
        type: 'api_call',
        method,
        url,
        statusCode,
        duration,
        context: { component: this.component, operation: 'api_call' }
      });
    }
  }

  // Validation logging
  logValidation(validationType, data, errors = null) {
    if (errors) {
      this.warning(`Validation failed: ${validationType}`, {
        type: 'validation_error',
        validationType,
        data: sanitizeData(data),
        errors,
        context: { component: this.component, operation: 'validation' }
      });
    } else {
      this.debug(`Validation passed: ${validationType}`, {
        type: 'validation_success',
        validationType,
        context: { component: this.component, operation: 'validation' }
      });
    }
  }

  // Authorization logging
  logAuthorization(resource, action, userId, success = true) {
    if (success) {
      this.info(`Authorization granted: ${action} on ${resource}`, {
        type: 'authorization_success',
        resource,
        action,
        userId,
        context: { component: this.component, operation: 'authorization' }
      });
    } else {
      logSecurity('authorization_denied', 'WARNING', {
        resource,
        action,
        userId,
        context: { component: this.component, operation: 'authorization' }
      });
    }
  }

  // Create a child logger with additional context
  child(additionalContext) {
    const childComponent = `${this.component}:${additionalContext.component || 'child'}`;
    const childLogger = new AppLogger(childComponent);
    
    // Add additional context to all log entries
    const originalMethods = {};
    const methods = ['critical', 'error', 'warning', 'info', 'debug', 'trace'];
    
    methods.forEach(method => {
      originalMethods[method] = childLogger[method].bind(childLogger);
      childLogger[method] = (message, meta = {}) => {
        return originalMethods[method](message, { ...additionalContext, ...meta });
      };
    });
    
    return childLogger;
  }

  // Create a logger with request context
  withRequest(req) {
    return this.child({
      requestId: req.requestId,
      traceId: req.traceId,
      spanId: req.spanId,
      userId: req.user?.id,
      method: req.method,
      url: req.originalUrl || req.url
    });
  }

  // Create a logger with user context
  withUser(user) {
    return this.child({
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role
    });
  }

  // Create a logger with operation context
  withOperation(operation) {
    return this.child({
      operation
    });
  }
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 
    'authorization', 'cookie', 'session', 'creditCard',
    'ssn', 'socialSecurityNumber', 'bankAccount'
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitizeValue = (value) => {
    if (value && typeof value === 'object') {
      return sanitizeData(value);
    }
    return value;
  };

  if (Array.isArray(sanitized)) {
    return sanitized.map(sanitizeValue);
  }

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
 * Create a logger instance for a specific component
 */
export const createLogger = (component) => {
  return new AppLogger(component);
};

// Default logger instance
export const logger = new AppLogger();

// Export convenience methods for backward compatibility
export {
  logCritical,
  logError,
  logWarning,
  logInfo,
  logDebug,
  logTrace,
  logRequest,
  logErrorWithContext,
  logBusinessEvent,
  logPerformance,
  logSecurity,
  logDependency,
  setLogContext,
  getLogContext,
  clearLogContext,
  withLogContext,
  generateRequestId,
  generateTraceId,
  generateSpanId
};

export default logger;
