import { structuredLogger } from '../config/structured-logger.js';

/**
 * Production Process Handlers
 * Implements comprehensive process stability and graceful shutdown
 */

class ProcessHandlers {
  constructor() {
    this.isShuttingDown = false;
    this.activeConnections = new Set();
    this.server = null;
  }

  /**
   * Initialize all process handlers
   */
  initialize() {
    this.setupUnhandledRejectionHandler();
    this.setupUncaughtExceptionHandler();
    this.setupGracefulShutdownHandlers();
    this.setupMemoryMonitoring();
    this.setupCPUMonitoring();
  }

  /**
   * Handle unhandled promise rejections
   */
  setupUnhandledRejectionHandler() {
    process.on('unhandledRejection', (reason, promise) => {
      structuredLogger.error('Unhandled Rejection', {
        type: 'unhandledRejection',
        reason: reason?.toString() || 'Unknown reason',
        promise: promise?.toString() || 'Unknown promise',
        stack: reason?.stack,
        timestamp: new Date().toISOString()
      });

      // Log but don't crash - let error middleware handle it
      structuredLogger.logSecurity('unhandled_rejection', 'ERROR', {
        reason: reason?.toString(),
        promise: promise?.toString()
      });
    });
  }

  /**
   * Handle uncaught exceptions
   */
  setupUncaughtExceptionHandler() {
    process.on('uncaughtException', (error) => {
      structuredLogger.error('Uncaught Exception', {
        type: 'uncaughtException',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      structuredLogger.logSecurity('uncaught_exception', 'CRITICAL', {
        message: error.message,
        stack: error.stack
      });

      // Graceful shutdown on uncaught exception
      this.gracefulShutdown('UNCAUGHT_EXCEPTION', 1);
    });
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdownHandlers() {
    // SIGTERM - Termination signal
    process.on('SIGTERM', () => {
      structuredLogger.info('SIGTERM received - initiating graceful shutdown', {
        type: 'signal',
        signal: 'SIGTERM',
        timestamp: new Date().toISOString()
      });
      this.gracefulShutdown('SIGTERM', 0);
    });

    // SIGINT - Interrupt signal (Ctrl+C)
    process.on('SIGINT', () => {
      structuredLogger.info('SIGINT received - initiating graceful shutdown', {
        type: 'signal',
        signal: 'SIGINT',
        timestamp: new Date().toISOString()
      });
      this.gracefulShutdown('SIGINT', 0);
    });

    // SIGUSR2 - Restart signal (for nodemon)
    process.on('SIGUSR2', () => {
      structuredLogger.info('SIGUSR2 received - initiating graceful restart', {
        type: 'signal',
        signal: 'SIGUSR2',
        timestamp: new Date().toISOString()
      });
      this.gracefulShutdown('SIGUSR2', 0);
    });
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      
      // Log memory usage
      structuredLogger.info('Memory Usage', {
        type: 'memory_monitoring',
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        timestamp: new Date().toISOString()
      });

      // Alert on high memory usage
      if (heapUsedMB > 500) { // 500MB threshold
        structuredLogger.logSecurity('high_memory_usage', 'WARNING', {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          threshold: 500
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup CPU monitoring
   */
  setupCPUMonitoring() {
    setInterval(() => {
      const cpuUsage = process.cpuUsage();
      structuredLogger.debug('CPU Usage', {
        type: 'cpu_monitoring',
        user: cpuUsage.user,
        system: cpuUsage.system,
        timestamp: new Date().toISOString()
      });
    }, 60000); // Check every minute
  }

  /**
   * Set server instance for graceful shutdown
   */
  setServer(server) {
    this.server = server;
    
    // Track active connections
    server.on('connection', (socket) => {
      this.activeConnections.add(socket);
      
      socket.on('close', () => {
        this.activeConnections.delete(socket);
      });
    });
  }

  /**
   * Graceful shutdown implementation
   */
  async gracefulShutdown(reason, exitCode = 0) {
    if (this.isShuttingDown) {
      structuredLogger.warn('Shutdown already in progress', {
        type: 'shutdown',
        reason,
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.isShuttingDown = true;
    
    structuredLogger.info('Starting graceful shutdown', {
      type: 'shutdown',
      reason,
      exitCode,
      activeConnections: this.activeConnections.size,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Stop accepting new requests
      if (this.server) {
        this.server.close(async () => {
          structuredLogger.info('HTTP server closed', {
            type: 'shutdown',
            component: 'http_server',
            timestamp: new Date().toISOString()
          });
        });
      }

      // 2. Close active connections with timeout
      const shutdownTimeout = setTimeout(() => {
        structuredLogger.warn('Force closing remaining connections', {
          type: 'shutdown',
          component: 'connections',
          remainingConnections: this.activeConnections.size,
          timestamp: new Date().toISOString()
        });

        this.activeConnections.forEach(socket => {
          try {
            socket.destroy();
          } catch (error) {
            structuredLogger.error('Error closing socket', {
              type: 'shutdown',
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
        });
      }, 5000); // 5 second timeout

      // 3. Close database connections
      await this.closeDatabaseConnections();

      // 4. Clear any remaining timeouts
      clearTimeout(shutdownTimeout);

      // 5. Final log and exit
      structuredLogger.info('Graceful shutdown completed', {
        type: 'shutdown',
        reason,
        exitCode,
        duration: Date.now() - this.shutdownStartTime,
        timestamp: new Date().toISOString()
      });

      process.exit(exitCode);

    } catch (error) {
      structuredLogger.error('Error during graceful shutdown', {
        type: 'shutdown',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      process.exit(1);
    }
  }

  /**
   * Close database connections
   */
  async closeDatabaseConnections() {
    try {
      // Use the lazy Prisma client
      const getPrisma = await import('../config/prisma.js');
      const prisma = getPrisma.default();
      
      if (prisma) {
        await prisma.$disconnect();
        
        structuredLogger.info('Database connections closed', {
          type: 'shutdown',
          component: 'database',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      structuredLogger.error('Error closing database connections', {
        type: 'shutdown',
        component: 'database',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      uptime: Math.round(uptime),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      connections: {
        active: this.activeConnections.size,
        isShuttingDown: this.isShuttingDown
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const processHandlers = new ProcessHandlers();

export default processHandlers;
