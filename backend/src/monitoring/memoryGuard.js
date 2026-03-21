// Memory Guard - Production Memory Protection
import { logger } from '../config/index.js';

class MemoryGuard {
  constructor(options = {}) {
    this.maxHeapThreshold = options.maxHeapThreshold || 500 * 1024 * 1024; // 500MB
    this.maxHeapUsedThreshold = options.maxHeapUsedThreshold || 400 * 1024 * 1024; // 400MB
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.gracefulShutdownTimeout = options.gracefulShutdownTimeout || 10000; // 10 seconds
    this.isShuttingDown = false;
    this.intervalId = null;
  }

  start() {
    if (this.intervalId) {
      return; // Already started
    }

    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);

    logger.info('Memory guard started', {
      maxHeapThreshold: this.maxHeapThreshold,
      maxHeapUsedThreshold: this.maxHeapUsedThreshold,
      checkInterval: this.checkInterval
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Memory guard stopped');
    }
  }

  checkMemoryUsage() {
    if (this.isShuttingDown) {
      return;
    }

    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;

    // Log memory usage
    logger.debug('Memory usage', {
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      heapTotal: `${heapTotalMB.toFixed(2)}MB`,
      rss: `${rssMB.toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
    });

    // Check thresholds
    if (memUsage.heapUsed > this.maxHeapThreshold) {
      logger.error('Memory threshold exceeded - triggering graceful shutdown', {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        threshold: `${(this.maxHeapThreshold / 1024 / 1024).toFixed(2)}MB`,
        rss: `${rssMB.toFixed(2)}MB`
      });
      this.triggerGracefulShutdown('memory_threshold_exceeded');
    } else if (memUsage.heapUsed > this.maxHeapUsedThreshold) {
      logger.warn('Memory usage approaching threshold', {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        threshold: `${(this.maxHeapUsedThreshold / 1024 / 1024).toFixed(2)}MB`,
        rss: `${rssMB.toFixed(2)}MB`
      });
    }
  }

  triggerGracefulShutdown(reason) {
    if (this.isShuttingDown) {
      return; // Already shutting down
    }

    this.isShuttingDown = true;
    
    logger.warn('Initiating graceful shutdown', { reason });

    // Emit event to notify the main process
    process.emit('memory-guard:shutdown', { reason });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout - forcing exit');
      process.exit(1);
    }, this.gracefulShutdownTimeout);
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      heapUsedMB: memUsage.heapUsed / 1024 / 1024,
      heapTotalMB: memUsage.heapTotal / 1024 / 1024,
      rssMB: memUsage.rss / 1024 / 1024,
      isNearThreshold: memUsage.heapUsed > this.maxHeapUsedThreshold,
      isOverThreshold: memUsage.heapUsed > this.maxHeapThreshold
    };
  }
}

export default MemoryGuard;
