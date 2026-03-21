// Gradual Load Shedding - Production Memory Management
import { logger } from '../config/index.js';

class LoadShedder {
  constructor(options = {}) {
    this.memoryThresholds = {
      warning: options.warningThreshold || 0.7,    // 70%
      loadShed: options.loadShedThreshold || 0.8,   // 80%
      critical: options.criticalThreshold || 0.9,    // 90%
      emergency: options.emergencyThreshold || 0.95   // 95%
    };
    
    this.maxHeapSize = options.maxHeapSize || 500 * 1024 * 1024; // 500MB
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    
    this.loadShedActive = false;
    this.emergencyMode = false;
    this.checkTimer = null;
    
    // Load shedding strategies
    this.strategies = {
      rejectWrites: false,
      increaseRateLimiting: false,
      enableAggressiveTimeouts: false,
      enableCircuitBreaker: false
    };
  }

  start() {
    if (this.checkTimer) return;
    
    this.checkTimer = setInterval(() => {
      this.checkMemoryAndShedLoad();
    }, this.checkInterval);
    
    logger.info('Load shedder started', { thresholds: this.memoryThresholds });
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      logger.info('Load shedder stopped');
    }
  }

  checkMemoryAndShedLoad() {
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / this.maxHeapSize;
    
    logger.debug('Memory check', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      maxHeap: `${(this.maxHeapSize / 1024 / 1024).toFixed(2)}MB`,
      ratio: `${(heapUsedRatio * 100).toFixed(2)}%`,
      loadShedActive: this.loadShedActive,
      emergencyMode: this.emergencyMode
    });

    if (heapUsedRatio >= this.memoryThresholds.emergency) {
      this.handleEmergencyMode(memUsage, heapUsedRatio);
    } else if (heapUsedRatio >= this.memoryThresholds.critical) {
      this.handleCriticalLevel(memUsage, heapUsedRatio);
    } else if (heapUsedRatio >= this.memoryThresholds.loadShed) {
      this.handleLoadShedding(memUsage, heapUsedRatio);
    } else if (heapUsedRatio >= this.memoryThresholds.warning) {
      this.handleWarningLevel(memUsage, heapUsedRatio);
    } else {
      this.handleNormalLevel(memUsage, heapUsedRatio);
    }
  }

  handleWarningLevel(memUsage, ratio) {
    logger.warn('Memory usage high - warning level', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      ratio: `${(ratio * 100).toFixed(2)}%`
    });
    
    // No action yet, just monitoring
  }

  handleLoadShedding(memUsage, ratio) {
    if (!this.loadShedActive) {
      this.loadShedActive = true;
      logger.warn('Load shedding activated', {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${(ratio * 100).toFixed(2)}%`
      });
    }
    
    // Strategy 1: Reject write operations
    this.strategies.rejectWrites = true;
    
    // Strategy 2: Increase rate limiting strictness
    this.strategies.increaseRateLimiting = true;
    
    // Emit event for other components to react
    process.emit('load-shed:activate', {
      level: 'load_shed',
      strategies: this.strategies,
      memUsage,
      ratio
    });
  }

  handleCriticalLevel(memUsage, ratio) {
    logger.error('Memory usage critical', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      ratio: `${(ratio * 100).toFixed(2)}%`
    });
    
    // Activate all load shedding strategies
    this.strategies.rejectWrites = true;
    this.strategies.increaseRateLimiting = true;
    this.strategies.enableAggressiveTimeouts = true;
    this.strategies.enableCircuitBreaker = true;
    
    // Emit critical event
    process.emit('load-shed:critical', {
      level: 'critical',
      strategies: this.strategies,
      memUsage,
      ratio
    });
  }

  handleEmergencyMode(memUsage, ratio) {
    if (!this.emergencyMode) {
      this.emergencyMode = true;
      logger.error('Emergency mode activated - initiating graceful shutdown', {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${(ratio * 100).toFixed(2)}%`
      });
      
      // Trigger graceful shutdown
      process.emit('memory-guard:shutdown', { 
        reason: 'emergency_memory_exceeded',
        memUsage,
        ratio
      });
    }
  }

  handleNormalLevel(memUsage, ratio) {
    if (this.loadShedActive || this.emergencyMode) {
      this.loadShedActive = false;
      this.emergencyMode = false;
      
      // Reset all strategies
      Object.keys(this.strategies).forEach(key => {
        this.strategies[key] = false;
      });
      
      logger.info('Load shedding deactivated - memory normal', {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        ratio: `${(ratio * 100).toFixed(2)}%`
      });
      
      // Emit recovery event
      process.emit('load-shed:deactivate', {
        level: 'normal',
        memUsage,
        ratio
      });
    }
  }

  shouldRejectWrite() {
    return this.strategies.rejectWrites;
  }

  shouldIncreaseRateLimiting() {
    return this.strategies.increaseRateLimiting;
  }

  shouldEnableAggressiveTimeouts() {
    return this.strategies.enableAggressiveTimeouts;
  }

  shouldEnableCircuitBreaker() {
    return this.strategies.enableCircuitBreaker;
  }

  getLoadSheddingLevel() {
    if (this.emergencyMode) return 'emergency';
    if (this.strategies.enableCircuitBreaker) return 'critical';
    if (this.loadShedActive) return 'load_shed';
    return 'normal';
  }

  getStats() {
    const memUsage = process.memoryUsage();
    const heapUsedRatio = memUsage.heapUsed / this.maxHeapSize;
    
    return {
      level: this.getLoadSheddingLevel(),
      loadShedActive: this.loadShedActive,
      emergencyMode: this.emergencyMode,
      heapUsed: memUsage.heapUsed,
      maxHeap: this.maxHeapSize,
      ratio: heapUsedRatio,
      strategies: { ...this.strategies }
    };
  }

  middleware() {
    return (req, res, next) => {
      // Check if write operations should be rejected
      if (this.shouldRejectWrite() && this.isWriteOperation(req)) {
        logger.warn('Write operation rejected due to load shedding', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          loadShedLevel: this.getLoadSheddingLevel()
        });
        
        return res.status(503).json({
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable - write operations disabled',
          timestamp: new Date().toISOString(),
          retryAfter: 30
        });
      }
      
      // Add load shedding headers
      res.set({
        'X-Load-Shed-Level': this.getLoadSheddingLevel(),
        'X-Memory-Usage': `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
      
      next();
    };
  }

  isWriteOperation(req) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return writeMethods.includes(req.method);
  }
}

export default LoadShedder;
