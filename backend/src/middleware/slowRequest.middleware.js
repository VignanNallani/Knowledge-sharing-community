import { logger } from '../config/index.js';

/**
 * Middleware to log slow requests (>500ms)
 */
export const slowRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to log response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    if (duration > 500) {
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} - ${duration}ms`, {
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        requestId: req.id
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

export default slowRequestLogger;
