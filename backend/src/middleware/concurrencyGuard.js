// Concurrency Guard - Load Shedding for Production
import { logger } from '../config/index.js';

class ConcurrencyGuard {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 100;
    this.activeRequests = 0;
    this.rejectedRequests = 0;
    this.peakConcurrency = 0;
    this.startTime = Date.now();
    
    // Load shedding thresholds
    this.loadShedThreshold = options.loadShedThreshold || 0.8; // 80% of max
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 0.9; // 90% of max
    
    // Circuit breaker state
    this.circuitOpen = false;
    this.circuitOpenTime = null;
    this.circuitResetTimeout = options.circuitResetTimeout || 30000; // 30 seconds
  }

  acquire() {
    // Check circuit breaker
    if (this.circuitOpen) {
      if (Date.now() - this.circuitOpenTime > this.circuitResetTimeout) {
        this.circuitOpen = false;
        logger.info('Circuit breaker reset');
      } else {
        this.rejectedRequests++;
        return { allowed: false, reason: 'circuit_open' };
      }
    }

    // Check concurrency limit
    if (this.activeRequests >= this.maxConcurrent) {
      this.rejectedRequests++;
      
      // Open circuit breaker if we're at threshold
      if (this.activeRequests >= this.maxConcurrent * this.circuitBreakerThreshold) {
        this.circuitOpen = true;
        this.circuitOpenTime = Date.now();
        logger.warn('Circuit breaker opened', { 
          activeRequests: this.activeRequests,
          maxConcurrent: this.maxConcurrent
        });
      }
      
      return { allowed: false, reason: 'concurrency_limit' };
    }

    // Check load shedding threshold
    if (this.activeRequests >= this.maxConcurrent * this.loadShedThreshold) {
      // Allow but log warning
      logger.warn('Load shedding threshold reached', {
        activeRequests: this.activeRequests,
        maxConcurrent: this.maxConcurrent,
        threshold: this.maxConcurrent * this.loadShedThreshold
      });
    }

    this.activeRequests++;
    this.peakConcurrency = Math.max(this.peakConcurrency, this.activeRequests);
    
    return { 
      allowed: true, 
      requestId: this.generateRequestId(),
      activeRequests: this.activeRequests,
      utilization: this.activeRequests / this.maxConcurrent
    };
  }

  release(requestId) {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    const avgConcurrency = this.peakConcurrency / (uptime / 1000); // Rough estimate
    
    return {
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      rejectedRequests: this.rejectedRequests,
      peakConcurrency: this.peakConcurrency,
      utilization: this.activeRequests / this.maxConcurrent,
      circuitOpen: this.circuitOpen,
      uptime,
      avgConcurrency
    };
  }

  middleware() {
    return (req, res, next) => {
      const result = this.acquire();
      
      if (!result.allowed) {
        const statusCode = result.reason === 'circuit_open' ? 503 : 429;
        const message = result.reason === 'circuit_open' 
          ? 'Service temporarily unavailable (circuit breaker open)'
          : 'Server busy - please try again later';
        
        logger.warn('Request rejected by concurrency guard', {
          reason: result.reason,
          activeRequests: this.activeRequests,
          maxConcurrent: this.maxConcurrent,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(statusCode).json({
          success: false,
          code: result.reason === 'circuit_open' ? 'SERVICE_UNAVAILABLE' : 'TOO_MANY_REQUESTS',
          message,
          timestamp: new Date().toISOString(),
          retryAfter: result.reason === 'circuit_open' ? 30 : 5
        });
      }
      
      // Store request info for cleanup
      req.concurrencyGuard = {
        requestId: result.requestId,
        startTime: Date.now()
      };
      
      // Cleanup on response finish
      res.on('finish', () => {
        this.release(result.requestId);
        
        const duration = Date.now() - req.concurrencyGuard.startTime;
        logger.debug('Request completed', {
          requestId: result.requestId,
          duration,
          activeRequests: this.activeRequests
        });
      });
      
      // Cleanup on error/close
      res.on('error', () => this.release(result.requestId));
      res.on('close', () => this.release(result.requestId));
      
      next();
    };
  }

  updateConfig(newConfig) {
    if (newConfig.maxConcurrent) {
      this.maxConcurrent = newConfig.maxConcurrent;
      logger.info('Concurrency guard config updated', { maxConcurrent: this.maxConcurrent });
    }
    
    if (newConfig.loadShedThreshold) {
      this.loadShedThreshold = newConfig.loadShedThreshold;
    }
    
    if (newConfig.circuitBreakerThreshold) {
      this.circuitBreakerThreshold = newConfig.circuitBreakerThreshold;
    }
  }
}

export default ConcurrencyGuard;
