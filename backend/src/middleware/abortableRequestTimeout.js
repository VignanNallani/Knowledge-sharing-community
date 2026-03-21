// Abortable Request Timeout - True Query Cancellation
import { logger } from '../config/index.js';

class AbortableRequestTimeout {
  constructor(timeoutMs = 10000) {
    this.timeoutMs = timeoutMs;
    this.activeControllers = new Map();
  }

  middleware() {
    return (req, res, next) => {
      // Create AbortController for this request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        
        logger.warn('Request timeout - aborting', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          timeout: this.timeoutMs,
          userAgent: req.headers['user-agent']
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

      // Store controller for cleanup
      const requestId = this.generateRequestId();
      this.activeControllers.set(requestId, controller);
      
      // Attach controller to request for use in services
      req.abortController = controller;
      req.requestId = requestId;

      // Cleanup on response finish
      res.on('finish', () => {
        clearTimeout(timeoutId);
        this.activeControllers.delete(requestId);
      });

      // Cleanup on error/close
      res.on('error', () => {
        clearTimeout(timeoutId);
        this.activeControllers.delete(requestId);
      });

      res.on('close', () => {
        clearTimeout(timeoutId);
        this.activeControllers.delete(requestId);
      });

      next();
    };
  }

  generateRequestId() {
    return `abort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility function for services to use with async operations
  static withTimeout(promise, controller, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        if (controller.signal.aborted) {
          reject(new Error('Request aborted'));
          return;
        }

        const handleAbort = () => {
          reject(new Error('Request aborted due to timeout'));
        };

        controller.signal.addEventListener('abort', handleAbort);
        
        // Cleanup listener
        promise.finally(() => {
          controller.signal.removeEventListener('abort', handleAbort);
        });
      })
    ]);
  }

  // Cancel all active requests (for graceful shutdown)
  cancelAll() {
    logger.warn('Cancelling all active requests', { 
      count: this.activeControllers.size 
    });
    
    for (const [requestId, controller] of this.activeControllers) {
      controller.abort();
    }
    
    this.activeControllers.clear();
  }

  getStats() {
    return {
      activeRequests: this.activeControllers.size,
      timeoutMs: this.timeoutMs
    };
  }
}

export default AbortableRequestTimeout;
