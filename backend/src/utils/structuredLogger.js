/**
 * Structured JSON Logger
 * Provides consistent, structured logging format for production environments
 */

import { ERROR_CODES } from '../errors/errorCodes.js';

class StructuredLogger {
  constructor(serviceName = 'knowledge-sharing-api') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  // Helper to determine if we should log at this level
  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  // Core logging method
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: this.serviceName,
      environment: this.environment,
      message,
      ...meta
    };

    // Add error-specific fields if error object is provided
    if (meta.error) {
      logEntry.error = {
        name: meta.error.name,
        message: meta.error.message,
        code: meta.error.code,
        stack: meta.error.stack,
        isOperational: meta.error.isOperational,
        cause: meta.error.cause?.message
      };
      delete meta.error; // Remove from top level to avoid duplication
    }

    // Output structured log
    console[level](JSON.stringify(logEntry));
  }

  // Convenience methods
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Specialized logging methods
  logError(error, context = {}) {
    this.error(error.message, {
      error,
      statusCode: error.statusCode,
      code: error.code || ERROR_CODES.INTERNAL_ERROR,
      isOperational: error.isOperational !== undefined ? error.isOperational : false,
      ...context
    });
  }

  logRequest(req, res, responseTime) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.requestId,
      traceId: req.traceId,
      spanId: req.spanId,
      userId: req.user?.id
    });
  }

  logDatabaseQuery(query, duration, error = null) {
    const logData = {
      query: typeof query === 'string' ? query.substring(0, 200) + '...' : query,
      duration: `${duration}ms`,
      type: 'database'
    };

    if (error) {
      this.error('Database query failed', { ...logData, error });
    } else {
      this.debug('Database query executed', logData);
    }
  }

  logExternalServiceCall(service, url, method, statusCode, duration, error = null) {
    const logData = {
      service,
      url,
      method,
      statusCode,
      duration: `${duration}ms`,
      type: 'external_service'
    };

    if (error) {
      this.error(`External service call failed: ${service}`, { ...logData, error });
    } else {
      this.debug(`External service call completed: ${service}`, logData);
    }
  }

  logCacheOperation(operation, key, hit = null, error = null) {
    const logData = {
      operation,
      key,
      type: 'cache'
    };

    if (error) {
      this.error(`Cache operation failed: ${operation}`, { ...logData, error });
    } else if (hit !== null) {
      this.debug(`Cache ${operation}: ${hit ? 'HIT' : 'MISS'}`, logData);
    }
  }

  // Security logging
  logSecurityEvent(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      type: 'security',
      ...details
    });
  }

  // Performance logging
  logPerformance(operation, duration, metadata = {}) {
    const logData = {
      operation,
      duration: `${duration}ms`,
      type: 'performance',
      ...metadata
    };

    if (duration > 1000) { // Log slow operations as warnings
      this.warn(`Slow operation detected: ${operation}`, logData);
    } else {
      this.debug(`Performance metric: ${operation}`, logData);
    }
  }
}

// Create and export singleton instance
const logger = new StructuredLogger();

export default logger;
export { StructuredLogger };
