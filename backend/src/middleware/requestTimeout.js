// Request Timeout Middleware - Production Ready
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/index.js';

const DEFAULT_TIMEOUT = 10000; // 10 seconds

class RequestTimeout {
  constructor(timeoutMs = DEFAULT_TIMEOUT) {
    this.timeoutMs = timeoutMs;
  }

  middleware() {
    return (req, res, next) => {
      // Set timeout for the request
      const timeoutId = setTimeout(() => {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timeout: this.timeoutMs
        });

        if (!res.headersSent) {
          res.status(408).json({
            success: false,
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timestamp: new Date().toISOString()
          });
        }
      }, this.timeoutMs);

      // Clear timeout when response finishes
      res.on('finish', () => {
        clearTimeout(timeoutId);
      });

      // Clear timeout on error
      res.on('error', () => {
        clearTimeout(timeoutId);
      });

      // Clear timeout on close
      res.on('close', () => {
        clearTimeout(timeoutId);
      });

      next();
    };
  }
}

export default RequestTimeout;
