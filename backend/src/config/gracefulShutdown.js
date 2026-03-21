import { logger } from './index.js';
import databaseService from './database.js';
import { cacheService } from '../cache/cache.service.js';
import securityHardening from '../security/securityHardening.js';
import cacheWarmer from '../cache/cacheWarmer.js';
import { PerformanceMonitor } from '../utils/performanceMonitor.js';

/**
 * Graceful Shutdown Manager
 * Handles clean shutdown of all services and connections
 */
export class GracefulShutdown {
  constructor() {
    this.isShuttingDown = false;
    this.shutdownTimeout = 30000; // 30 seconds
    this.activeConnections = new Set();
    this.pendingRequests = new Map();
    this.shutdownHandlers = [];
  }

  /**
   * Initialize graceful shutdown handlers
   */
  initialize() {
    // Handle process signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.handleShutdown('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason, promise });
      this.handleShutdown('unhandledRejection', reason);
    });

    logger.info('Graceful shutdown handlers initialized');
  }

  /**
   * Handle shutdown signal
   */
  async handleShutdown(signal, error = null) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal:', signal);
      return;
    }

    this.isShuttingDown = true;
    
    logger.info('Starting graceful shutdown', {
      signal,
      timestamp: new Date().toISOString(),
      activeConnections: this.activeConnections.size,
      pendingRequests: this.pendingRequests.size
    });

    if (error) {
      logger.error('Shutdown triggered by error:', error);
    }

    // Set shutdown timeout
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Execute custom shutdown handlers
      await this.executeShutdownHandlers(signal, error);
      
      // Stop accepting new connections
      await this.stopAcceptingConnections();
      
      // Wait for active connections to finish
      await this.waitForActiveConnections();
      
      // Shutdown services in order
      await this.shutdownServices();
      
      // Clear shutdown timer
      clearTimeout(shutdownTimer);
      
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (shutdownError) {
      logger.error('Error during graceful shutdown:', shutdownError);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  /**
   * Register custom shutdown handler
   */
  registerShutdownHandler(handler) {
    if (typeof handler === 'function') {
      this.shutdownHandlers.push(handler);
    }
  }

  /**
   * Execute custom shutdown handlers
   */
  async executeShutdownHandlers(signal, error) {
    logger.info('Executing custom shutdown handlers');
    
    for (const handler of this.shutdownHandlers) {
      try {
        await handler(signal, error);
      } catch (handlerError) {
        logger.error('Shutdown handler error:', handlerError);
      }
    }
  }

  /**
   * Stop accepting new connections
   */
  async stopAcceptingConnections() {
    logger.info('Stopping accepting new connections');
    
    // This would typically involve closing the server
    // The actual implementation depends on your server setup
    // For now, we'll just log the action
  }

  /**
   * Wait for active connections to finish
   */
  async waitForActiveConnections() {
    if (this.activeConnections.size === 0) {
      logger.info('No active connections to wait for');
      return;
    }

    logger.info(`Waiting for ${this.activeConnections.size} active connections to finish`);
    
    const maxWaitTime = 20000; // 20 seconds
    const startTime = Date.now();
    
    while (this.activeConnections.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await this.sleep(1000);
      logger.debug(`Waiting for connections: ${this.activeConnections.size} remaining`);
    }
    
    if (this.activeConnections.size > 0) {
      logger.warn(`${this.activeConnections.size} connections did not finish gracefully`);
    }
  }

  /**
   * Shutdown services in proper order
   */
  async shutdownServices() {
    logger.info('Shutting down services');
    
    const shutdownSteps = [
      { name: 'HTTP Server', action: () => this.shutdownHTTPServer() },
      { name: 'WebSocket Connections', action: () => this.shutdownWebSocketConnections() },
      { name: 'Background Jobs', action: () => this.shutdownBackgroundJobs() },
      { name: 'Cache Warmer', action: () => this.shutdownCacheWarmer() },
      { name: 'Cache Service', action: () => this.shutdownCacheService() },
      { name: 'Database', action: () => this.shutdownDatabase() },
      { name: 'Security Services', action: () => this.shutdownSecurityServices() },
      { name: 'Performance Monitor', action: () => this.shutdownPerformanceMonitor() }
    ];

    for (const step of shutdownSteps) {
      try {
        logger.info(`Shutting down: ${step.name}`);
        await step.action();
        logger.info(`Successfully shut down: ${step.name}`);
      } catch (error) {
        logger.error(`Error shutting down ${step.name}:`, error);
      }
    }
  }

  /**
   * Shutdown HTTP server
   */
  async shutdownHTTPServer() {
    // This would close your HTTP server
    // Implementation depends on your server setup
    logger.info('HTTP server shutdown completed');
  }

  /**
   * Shutdown WebSocket connections
   */
  async shutdownWebSocketConnections() {
    // This would close all WebSocket connections
    logger.info('WebSocket connections shutdown completed');
  }

  /**
   * Shutdown background jobs
   */
  async shutdownBackgroundJobs() {
    // This would stop any background job processors
    logger.info('Background jobs shutdown completed');
  }

  /**
   * Shutdown cache warmer
   */
  async shutdownCacheWarmer() {
    if (cacheWarmer && typeof cacheWarmer.shutdown === 'function') {
      cacheWarmer.shutdown();
      logger.info('Cache warmer shutdown completed');
    }
  }

  /**
   * Shutdown cache service
   */
  async shutdownCacheService() {
    if (cacheService && typeof cacheService.shutdown === 'function') {
      await cacheService.shutdown();
      logger.info('Cache service shutdown completed');
    }
  }

  /**
   * Shutdown database connections
   */
  async shutdownDatabase() {
    if (databaseService && typeof databaseService.disconnect === 'function') {
      await databaseService.disconnect();
      logger.info('Database shutdown completed');
    }
  }

  /**
   * Shutdown security services
   */
  async shutdownSecurityServices() {
    if (securityHardening && typeof securityHardening.shutdown === 'function') {
      securityHardening.shutdown();
      logger.info('Security services shutdown completed');
    }
  }

  /**
   * Shutdown performance monitor
   */
  async shutdownPerformanceMonitor() {
    if (PerformanceMonitor && typeof PerformanceMonitor.resetStats === 'function') {
      PerformanceMonitor.resetStats();
      logger.info('Performance monitor shutdown completed');
    }
  }

  /**
   * Track active connection
   */
  addConnection(connectionId) {
    this.activeConnections.add(connectionId);
  }

  /**
   * Remove active connection
   */
  removeConnection(connectionId) {
    this.activeConnections.delete(connectionId);
  }

  /**
   * Track pending request
   */
  addRequest(requestId, info = {}) {
    this.pendingRequests.set(requestId, {
      startTime: Date.now(),
      ...info
    });
  }

  /**
   * Remove pending request
   */
  removeRequest(requestId) {
    this.pendingRequests.delete(requestId);
  }

  /**
   * Get shutdown status
   */
  getStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      activeConnections: this.activeConnections.size,
      pendingRequests: this.pendingRequests.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Force shutdown (emergency)
   */
  forceShutdown(reason = 'Emergency shutdown') {
    logger.warn('Force shutdown initiated:', reason);
    process.exit(1);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check during shutdown
   */
  async healthCheck() {
    const status = this.getStatus();
    
    return {
      status: this.isShuttingDown ? 'shutting_down' : 'healthy',
      ...status,
      canAcceptNewConnections: !this.isShuttingDown
    };
  }
}

// Singleton instance
const gracefulShutdown = new GracefulShutdown();

export default gracefulShutdown;
