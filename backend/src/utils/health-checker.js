import getPrisma from '../config/prisma.js';
import redis from '../config/redis.js';
import logger from '../config/logger.js';
import configLoader from '../config/config-loader.js';

class HealthChecker {
  constructor() {
    this.config = configLoader.get('health');
    this.checks = new Map();
    this.lastResults = new Map();
    
    // Register default health checks
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async () => {
      const start = Date.now();
      
      try {
        const prisma = getPrisma();
        await prisma.$queryRaw`SELECT 1`;
        const duration = Date.now() - start;
        
        return {
          status: 'healthy',
          duration,
          message: 'Database connection successful',
          metadata: {
            connectionTime: duration,
            timestamp: new Date().toISOString(),
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          duration: Date.now() - start,
          message: 'Database connection failed',
          error: error.message,
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };
      }
    });

    // Redis health check (if enabled)
    if (configLoader.get('redis.enabled')) {
      this.registerCheck('redis', async () => {
        const start = Date.now();
        
        try {
          const client = redis.getClient();
          await client.ping();
          const duration = Date.now() - start;
          
          return {
            status: 'healthy',
            duration,
            message: 'Redis connection successful',
            metadata: {
              connectionTime: duration,
              timestamp: new Date().toISOString(),
            }
          };
        } catch (error) {
          return {
            status: 'unhealthy',
            duration: Date.now() - start,
            message: 'Redis connection failed',
            error: error.message,
            metadata: {
              timestamp: new Date().toISOString(),
            }
          };
        }
      });
    }

    // Memory health check
    this.registerCheck('memory', async () => {
      const start = Date.now();
      const memUsage = process.memoryUsage();
      
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const status = memoryUsagePercent > 90 ? 'unhealthy' : 
                    memoryUsagePercent > 75 ? 'degraded' : 'healthy';
      
      return {
        status,
        duration: Date.now() - start,
        message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        metadata: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
          rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
          usagePercent: Math.round(memoryUsagePercent * 100) / 100,
          timestamp: new Date().toISOString(),
        }
      };
    });

    // CPU health check
    this.registerCheck('cpu', async () => {
      const start = Date.now();
      const cpuUsage = process.cpuUsage();
      
      return {
        status: 'healthy',
        duration: Date.now() - start,
        message: 'CPU usage normal',
        metadata: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          timestamp: new Date().toISOString(),
        }
      };
    });

    // Disk space health check
    this.registerCheck('disk', async () => {
      const start = Date.now();
      
      try {
        const fs = await import('fs');
        const stats = fs.statSync('.');
        
        return {
          status: 'healthy',
          duration: Date.now() - start,
          message: 'Disk space available',
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };
      } catch (error) {
        return {
          status: 'unknown',
          duration: Date.now() - start,
          message: 'Could not check disk space',
          error: error.message,
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };
      }
    });
  }

  registerCheck(name, checkFunction) {
    if (typeof checkFunction !== 'function') {
      throw new Error('Check function must be a function');
    }
    
    this.checks.set(name, {
      name,
      check: checkFunction,
      timeout: this.config.timeout,
      retries: this.config.retries,
    });
    
    logger.debug(`Health check registered: ${name}`);
  }

  async runCheck(name, retries = null) {
    const checkConfig = this.checks.get(name);
    if (!checkConfig) {
      throw new Error(`Health check not found: ${name}`);
    }

    const maxRetries = retries !== null ? retries : checkConfig.retries;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
        });

        const result = await Promise.race([
          checkConfig.check(),
          timeoutPromise
        ]);

        this.lastResults.set(name, {
          ...result,
          timestamp: new Date().toISOString(),
          attempt: attempt + 1,
        });

        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          logger.warn(`Health check ${name} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    const failedResult = {
      status: 'unhealthy',
      duration: 0,
      message: `Health check failed after ${maxRetries + 1} attempts`,
      error: lastError.message,
      metadata: {
        timestamp: new Date().toISOString(),
        attempts: maxRetries + 1,
      }
    };

    this.lastResults.set(name, failedResult);
    return failedResult;
  }

  async runAllChecks() {
    const checkNames = Array.from(this.checks.keys());
    const results = {};
    
    const promises = checkNames.map(async (name) => {
      try {
        const result = await this.runCheck(name);
        return { name, result };
      } catch (error) {
        const errorResult = {
          status: 'error',
          duration: 0,
          message: 'Health check failed to execute',
          error: error.message,
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };
        return { name, result: errorResult };
      }
    });

    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach((promiseResult, index) => {
      if (promiseResult.status === 'fulfilled') {
        const { name, result } = promiseResult.value;
        results[name] = result;
      } else {
        const name = checkNames[index];
        results[name] = {
          status: 'error',
          duration: 0,
          message: 'Health check failed to execute',
          error: promiseResult.reason?.message || 'Unknown error',
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };
      }
    });

    return results;
  }

  getOverallStatus(results) {
    const statuses = Object.values(results).map(r => r.status);
    
    if (statuses.every(s => s === 'healthy')) {
      return 'healthy';
    } else if (statuses.some(s => s === 'unhealthy' || s === 'error')) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }

  async getHealthReport() {
    const startTime = Date.now();
    const results = await this.runAllChecks();
    const overallStatus = this.getOverallStatus(results);
    const duration = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: configLoader.get('nodeEnv'),
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        degraded: Object.values(results).filter(r => r.status === 'degraded').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        error: Object.values(results).filter(r => r.status === 'error').length,
      }
    };
  }

  getLastResult(name) {
    return this.lastResults.get(name);
  }

  getAllLastResults() {
    return Object.fromEntries(this.lastResults);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Graceful shutdown
  async shutdown() {
    try {
      const prisma = getPrisma();
      if (prisma) {
        await prisma.$disconnect();
      }
      logger.info('Health checker shut down successfully');
    } catch (error) {
      logger.error('Error during health checker shutdown:', error);
    }
  }
}

// Singleton instance
const healthChecker = new HealthChecker();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await healthChecker.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await healthChecker.shutdown();
  process.exit(0);
});

export default healthChecker;
