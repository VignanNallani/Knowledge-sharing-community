import pino from 'pino';
import crypto from 'crypto';

// Generate correlation IDs
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateTraceId() {
  return crypto.randomUUID();
}

export function generateSpanId() {
  return `span_${Math.random().toString(36).substr(2, 8)}`;
}

export function setLogContext(key, value) {
  structuredLogger.setContext(key, value);
}

export function getLogContext() {
  return structuredLogger.getContext();
}

export function clearLogContext() {
  structuredLogger.clearContext();
}

// Create clean structured logger with Pino
class StructuredLogger {
  constructor(options = {}) {
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'knowledge-sharing-backend';
    this.version = options.version || process.env.npm_package_version || '1.0.0';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    
    // Context storage for correlation
    this.context = new Map();
    
    // Initialize Pino logger
    this.pino = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
          // Add structured fields
          const logObject = {
            ...object,
            service: this.serviceName,
            version: this.version,
            environment: this.environment
          };
          
          // Add context if available
          if (this.context.size > 0) {
            logObject.context = { ...logObject.context, ...Object.fromEntries(this.context) };
          }
          
          return logObject;
        }
      },
      timestamp: pino.stdTimeFunctions.isoTime
    });
  }

  // Context management
  setContext(key, value) {
    this.context.set(key, value);
  }

  clearContext() {
    this.context.clear();
  }

  // Standard logging methods
  info(message, meta = {}) {
    this.pino.info(meta, message);
  }

  warn(message, meta = {}) {
    this.pino.warn(meta, message);
  }

  error(message, meta = {}) {
    this.pino.error(meta, message);
  }

  debug(message, meta = {}) {
    this.pino.debug(meta, message);
  }

  // Security logging
  logSecurity(event, severity, details = {}) {
    this.pino.warn({
      type: 'security',
      event,
      severity,
      ...details
    }, `Security Event: ${event}`);
  }

  // Performance logging
  logPerformance(operation, duration, details = {}) {
    this.pino.info({
      type: 'performance',
      operation,
      duration,
      ...details
    }, `Performance: ${operation} completed in ${duration}ms`);
  }

  // Business event logging
  logBusiness(event, userId, details = {}) {
    this.pino.info({
      type: 'business',
      event,
      userId,
      ...details
    }, `Business Event: ${event}`);
  }

  // Request logging
  logRequest(req, res, duration) {
    this.pino.info({
      type: 'request',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  }

  // Error logging with context
  logErrorWithContext(error, context = {}) {
    this.pino.error({
      type: 'error',
      error: error.message,
      stack: error.stack,
      ...context
    }, `Error: ${error.message}`);
  }

  // Business event logging (alias)
  logBusinessEvent(event, userId, details = {}) {
    this.logBusiness(event, userId, details);
  }
}

// Create singleton instance
export const structuredLogger = new StructuredLogger();

// Export functions for external use
export const logRequest = (req, res, duration) => structuredLogger.logRequest(req, res, duration);
export const logErrorWithContext = (error, context) => structuredLogger.logErrorWithContext(error, context);
export const logPerformance = (operation, duration, details) => structuredLogger.logPerformance(operation, duration, details);
export const logSecurity = (event, severity, details) => structuredLogger.logSecurity(event, severity, details);
export const logBusinessEvent = (event, userId, details) => structuredLogger.logBusinessEvent(event, userId, details);
export const logDependency = (service, operation, duration, success) => structuredLogger.logDependency(service, operation, duration, success);
export const logTrace = (message, meta = {}) => structuredLogger.trace(message, meta);
export const logError = (message, meta = {}) => structuredLogger.error(message, meta);
export const logWarning = (message, meta = {}) => structuredLogger.warn(message, meta);
export const logInfo = (message, meta = {}) => structuredLogger.info(message, meta);
export const logCritical = (message, meta = {}) => structuredLogger.error(message, meta);
export const logDebug = (message, meta = {}) => structuredLogger.debug(message, meta);

export function withLogContext(context, fn) {
  return structuredLogger.withLogContext(context, fn);
}

export default structuredLogger;
