// Admission Control Middleware - Prevents Queue Growth
import { logger } from '../config/index.js';

class AdmissionControl {
  constructor(options = {}) {
    // Mathematical configuration based on queueing theory
    this.poolSize = options.poolSize || 10;
    this.targetUtilization = options.targetUtilization || 0.7;
    this.maxActiveQueries = Math.floor(this.poolSize * this.targetUtilization);
    
    // Hysteresis to prevent flapping
    this.rejectThreshold = this.maxActiveQueries + 1; // Reject at 8
    this.resumeThreshold = this.maxActiveQueries - 1;  // Resume at 6
    
    // State tracking
    this.isRejecting = false;
    this.rejectedCount = 0;
    this.acceptedCount = 0;
    
    logger.info('Admission control initialized', {
      poolSize: this.poolSize,
      targetUtilization: this.targetUtilization,
      maxActiveQueries: this.maxActiveQueries,
      rejectThreshold: this.rejectThreshold,
      resumeThreshold: this.resumeThreshold
    });
  }

  // Get active request count from metrics collector
  getActiveRequests(metricsCollector) {
    return metricsCollector.getActiveRequests() || 0;
  }

  // Admission control middleware
  middleware(metricsCollector) {
    return (req, res, next) => {
      const activeRequests = this.getActiveRequests(metricsCollector);
      
      // Check if we should reject based on hysteresis
      const shouldReject = this.isRejecting ? 
        activeRequests >= this.resumeThreshold : 
        activeRequests >= this.rejectThreshold;
      
      if (shouldReject) {
        this.rejectedCount++;
        this.isRejecting = true;
        
        // Log rejection for observability
        logger.warn('Request rejected - admission control', {
          activeRequests,
          rejectThreshold: this.rejectThreshold,
          isRejecting: this.isRejecting,
          path: req.path,
          method: req.method
        });
        
        return res.status(503).json({
          error: 'Server busy',
          message: 'System is at capacity. Please retry later.',
          retryAfter: '5', // Suggest retry after 5 seconds
          capacity: {
            active: activeRequests,
            max: this.maxActiveQueries
          }
        });
      }
      
      // Accept request
      this.acceptedCount++;
      
      // Reset rejection state if we're below resume threshold
      if (this.isRejecting && activeRequests < this.resumeThreshold) {
        this.isRejecting = false;
        logger.info('Admission control - resumed accepting requests', {
          activeRequests,
          resumeThreshold: this.resumeThreshold
        });
      }
      
      next();
    };
  }

  // Get admission control statistics
  getStats() {
    return {
      poolSize: this.poolSize,
      targetUtilization: this.targetUtilization,
      maxActiveQueries: this.maxActiveQueries,
      rejectThreshold: this.rejectThreshold,
      resumeThreshold: this.resumeThreshold,
      isRejecting: this.isRejecting,
      rejectedCount: this.rejectedCount,
      acceptedCount: this.acceptedCount,
      rejectionRate: this.acceptedCount > 0 ? 
        (this.rejectedCount / (this.acceptedCount + this.rejectedCount)) : 0
    };
  }

  // Reset statistics (useful for testing)
  resetStats() {
    this.rejectedCount = 0;
    this.acceptedCount = 0;
    this.isRejecting = false;
  }
}

export default AdmissionControl;
