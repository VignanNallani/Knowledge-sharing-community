// Graceful Shutdown Handler - Production Ready
import { logger } from '../config/index.js';
import { cleanupRateLimiters } from '../middleware/rateLimitMiddleware.js';
import MemoryGuard from './memoryGuard.js';

class GracefulShutdown {
  constructor(options = {}) {
    this.shutdownTimeout = options.shutdownTimeout || 10000; // 10 seconds
    this.isShuttingDown = false;
    this.activeRequests = new Set();
    this.server = null;
    this.memoryGuard = null;
  }

  initialize(server, memoryGuard) {
    this.server = server;
    this.memoryGuard = memoryGuard;

    // Listen for shutdown signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    
    // Listen for memory guard shutdown
    process.on('memory-guard:shutdown', (data) => {
      this.handleShutdown('memory_threshold_exceeded', data.reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      this.handleShutdown('uncaught_exception');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      this.handleShutdown('unhandled_rejection');
    });

    logger.info('Graceful shutdown handler initialized');
  }

  handleShutdown(signal, reason = '') {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress', { signal });
      return;
    }

    this.isShuttingDown = true;
    
    logger.warn('Starting graceful shutdown', { 
      signal, 
      reason,
      activeRequests: this.activeRequests.size,
      uptime: process.uptime()
    });

    // Stop accepting new connections
    if (this.server) {
      this.server.close((err) => {
        if (err) {
          logger.error('Error during server close', { error: err.message });
        } else {
          logger.info('Server closed successfully');
        }
        this.cleanup();
      });
    } else {
      this.cleanup();
    }

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout - forcing exit');
      this.forceExit();
    }, this.shutdownTimeout);
  }

  trackRequest(req, res) {
    if (this.isShuttingDown) {
      // Reject new requests during shutdown
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is shutting down',
          timestamp: new Date().toISOString()
        });
      }
      return false;
    }

    // Track active request
    this.activeRequests.add(req);
    
    // Remove request when finished
    const cleanup = () => {
      this.activeRequests.delete(req);
    };

    res.on('finish', cleanup);
    res.on('error', cleanup);
    res.on('close', cleanup);

    return true;
  }

  async cleanup() {
    logger.info('Starting cleanup process');

    try {
      // Stop memory guard
      if (this.memoryGuard) {
        this.memoryGuard.stop();
      }

      // Cleanup rate limiters
      cleanupRateLimiters();

      // Close database connections
      await this.closeDatabaseConnections();

      // Clear any other resources
      await this.clearResources();

      logger.info('Cleanup completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during cleanup', { error: error.message, stack: error.stack });
      this.forceExit();
    }
  }

  async closeDatabaseConnections() {
    // This would be implemented based on your database setup
    // For Prisma, you would disconnect
    try {
      const { getPrisma } = await import('../config/prisma.js');
      const prisma = getPrisma();
      await prisma.$disconnect();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error: error.message });
    }
  }

  async clearResources() {
    // Clear any other resources like caches, timers, etc.
    // This would be implemented based on your specific needs
    logger.info('Additional resources cleared');
  }

  forceExit() {
    logger.error('Forcing process exit');
    process.exit(1);
  }

  getStats() {
    return {
      isShuttingDown: this.isShuttingDown,
      activeRequests: this.activeRequests.size,
      uptime: process.uptime(),
      memoryStats: this.memoryGuard ? this.memoryGuard.getMemoryStats() : null
    };
  }
}

export default GracefulShutdown;
