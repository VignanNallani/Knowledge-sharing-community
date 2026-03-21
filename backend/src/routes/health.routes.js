import express from 'express';
import client from 'prom-client';
import redisManager from '../config/redis.js';
import databaseService from '../config/database.js';
import queueService from '../queues/index.js';
import { cacheService } from '../cache/cache.service.js';
import { PerformanceMonitor } from '../utils/performanceMonitor.js';
import { logger } from '../config/index.js';

const router = express.Router();

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which can be used to identify metrics
register.setDefaultLabels({
  app: 'knowledge-sharing-community',
  env: process.env.NODE_ENV || 'development',
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

const databaseConnections = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

const queueJobsTotal = new client.Gauge({
  name: 'queue_jobs_total',
  help: 'Total number of jobs in queues',
  labelNames: ['queue_name', 'state'],
  registers: [register],
});

const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  registers: [register],
});

// Health check endpoint - PURE LIVENESS PROBE (Fast, in-memory only)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe endpoint - Enhanced
router.get('/readiness', async (req, res) => {
  try {
    const checks = {
      database: false,
      redis: false,
      queues: false,
      cache: false
    };

    // Check database connectivity
    try {
      await databaseService.healthCheck();
      checks.database = true;
    } catch (error) {
      logger.error('Database readiness check failed:', error);
    }

    // Check Redis connectivity
    try {
      await checkRedisHealth();
      checks.redis = true;
    } catch (error) {
      logger.error('Redis readiness check failed:', error);
    }

    // Check queue connectivity
    try {
      await checkQueueHealth();
      checks.queues = true;
    } catch (error) {
      logger.error('Queue readiness check failed:', error);
    }

    // Check cache connectivity
    try {
      await checkCacheHealth();
      checks.cache = true;
    } catch (error) {
      logger.error('Cache readiness check failed:', error);
    }

    const isReady = Object.values(checks).every(check => check);
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      success: isReady,
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });

  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      success: false,
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe endpoint
router.get('/liveness', (req, res) => {
  const uptime = process.uptime();
  const isAlive = uptime > 0;

  res.status(isAlive ? 200 : 503).json({
    success: isAlive,
    alive: isAlive,
    uptime: Math.round(uptime),
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    // Update custom metrics
    await updateMetrics();

    // Set the content type header
    res.set('Content-Type', register.contentType);
    
    // Return the metrics in the Prometheus format
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Metrics collection failed:', error);
    res.status(500).end('Metrics collection failed');
  }
});

// Health check helpers - Enhanced
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    const healthResult = await databaseService.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return {
      ...healthResult,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Database health check failed: ${error.message}`);
  }
}

async function checkCacheHealth() {
  const startTime = Date.now();
  
  try {
    // Test cache set/get
    const testKey = 'health_check_test';
    const testValue = { test: true, timestamp: Date.now() };
    
    await cacheService.set(testKey, testValue, 5000);
    const retrieved = await cacheService.get(testKey);
    await cacheService.delete(testKey);
    
    if (!retrieved || retrieved.test !== true) {
      throw new Error('Cache read/write test failed');
    }
    
    const responseTime = Date.now() - startTime;
    const stats = await cacheService.getStats();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Cache health check failed: ${error.message}`);
  }
}

async function checkRedisHealth() {
  const startTime = Date.now();
  
  try {
    const redis = await redisManager.getClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    await redis.ping();
    const responseTime = Date.now() - startTime;
    
    const info = await redis.info('memory');
    const memoryInfo = parseRedisMemoryInfo(info);
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      memory: memoryInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Redis health check failed: ${error.message}`);
  }
}

async function checkQueueHealth() {
  try {
    const stats = await queueService.getQueueStats();
    
    return {
      status: 'healthy',
      queues: stats.queues,
      totalQueues: stats.totalQueues,
      workers: stats.workers,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Queue health check failed: ${error.message}`);
  }
}

function parseRedisMemoryInfo(info) {
  const lines = info.split('\r\n');
  const memory = {};
  
  lines.forEach(line => {
    if (line.includes('used_memory_human:')) {
      memory.used = line.split(':')[1];
    }
    if (line.includes('used_memory_peak_human:')) {
      memory.peak = line.split(':')[1];
    }
    if (line.includes('used_memory_rss_human:')) {
      memory.rss = line.split(':')[1];
    }
  });

  return memory;
}

// Update metrics
async function updateMetrics() {
  try {
    // Update queue metrics
    const queueStats = await queueService.getQueueStats();
    if (queueStats.queues) {
      Object.entries(queueStats.queues).forEach(([queueName, counts]) => {
        if (typeof counts === 'object') {
          Object.entries(counts).forEach(([state, value]) => {
            if (typeof value === 'number') {
              queueJobsTotal.set({ queue_name: queueName, state }, value);
            }
          });
        }
      });
    }

    // Update cache metrics (if available)
    if (cacheService.getStats) {
      const cacheStats = await cacheService.getStats();
      if (cacheStats.hitRate !== undefined) {
        cacheHitRate.set(cacheStats.hitRate);
      }
    }

  } catch (error) {
    logger.error('Failed to update metrics:', error);
  }
}

// Middleware to track HTTP metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
};

// Export metrics for use in other parts of the application
export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  databaseConnections,
  queueJobsTotal,
  cacheHitRate
};

export default router;
