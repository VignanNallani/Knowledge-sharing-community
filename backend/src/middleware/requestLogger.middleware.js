import { v4 as uuidv4 } from 'uuid';
import { structuredLogger } from '../config/structured-logger.js';

/**
 * Request ID middleware
 * Generates and attaches a unique request ID to each request
 */
export const requestIdMiddleware = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  
  // Set context for structured logger
  structuredLogger.setContext('requestId', req.requestId);
  
  next();
};

/**
 * Request logging middleware
 * Logs structured request/response information
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original res.end to intercept response completion
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log request completion using structured logger
    structuredLogger.logRequest(req, res, duration);
    
    // Clear request context
    structuredLogger.clearContext();
    
    // Call original end
    originalEnd.call(res, chunk, encoding);
  };
  
  next();
};

/**
 * Morgan middleware for development
 * Uses structured logger for HTTP request logging
 */
export const morganMiddleware = () => {
  return (req, res, next) => {
    // Use structured logger's request logging
    structuredLogger.logRequest(req, res, 0);
    next();
  };
};

export default {
  requestIdMiddleware,
  requestLogger,
  morganMiddleware
};
