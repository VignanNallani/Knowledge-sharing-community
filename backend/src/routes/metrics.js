import express from 'express';
import { logger } from '../config/index.js';
import cacheService from '../cache/cache.service.js';
import getPrisma from '../config/prisma.js';
import { 
  dbQueryDuration, 
  dbQueriesTotal, 
  dbSlowQueriesTotal,
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolTotal
} from '../utils/metrics.js';

const router = express.Router();

// System metrics endpoint
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Basic system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Database metrics
    const prisma = getPrisma();
    let dbMetrics = {
      connected: false,
      connectionPool: {
        total: 0,
        active: 0,
        idle: 0
      }
    };
    
    try {
      // Test DB connection
      await prisma.$queryRaw`SELECT 1`;
      dbMetrics.connected = true;
      
      // Get connection pool metrics (if available)
      try {
        const poolStats = await prisma.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        
        if (poolStats && poolStats[0]) {
          dbMetrics.connectionPool = {
            total: poolStats[0].total_connections || 0,
            active: poolStats[0].active_connections || 0,
            idle: poolStats[0].idle_connections || 0
          };
        }
      } catch (poolError) {
        logger.debug('Could not fetch pool stats:', poolError.message);
      }
    } catch (dbError) {
      dbMetrics.connected = false;
      logger.debug('DB connection test failed:', dbError.message);
    }
    
    // Cache metrics
    let cacheMetrics = {
      type: 'memory',
      available: true,
      stats: null
    };
    
    try {
      cacheMetrics.stats = await cacheService.getStats();
    } catch (cacheError) {
      cacheMetrics.available = false;
      logger.debug('Cache stats unavailable:', cacheError.message);
    }
    
    // Prometheus metrics summary
    const prometheusMetrics = {
      queryDuration: {
        avg: dbQueryDuration.get(),
        count: dbQueryDuration.get().length || 0
      },
      queriesTotal: dbQueriesTotal.get(),
      slowQueriesTotal: dbSlowQueriesTotal.get(),
      connectionPool: {
        active: dbConnectionPoolActive.get(),
        idle: dbConnectionPoolIdle.get(),
        total: dbConnectionPoolTotal.get()
      }
    };
    
    // Application metrics
    const appMetrics = {
      uptime: process.uptime(),
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
    
    // Performance metrics
    const performanceMetrics = {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100 // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoop: {
        // Note: This would require additional monitoring setup
        lag: null
      }
    };
    
    const responseTime = Date.now() - startTime;
    
    const metrics = {
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      application: appMetrics,
      performance: performanceMetrics,
      database: dbMetrics,
      cache: cacheMetrics,
      prometheus: prometheusMetrics
    };
    
    // Health status based on metrics
    let healthStatus = 'healthy';
    const issues = [];
    
    if (!dbMetrics.connected) {
      healthStatus = 'degraded';
      issues.push('Database disconnected');
    }
    
    if (performanceMetrics.memory.heapUsed > 500) { // 500MB threshold
      healthStatus = 'degraded';
      issues.push('High memory usage');
    }
    
    if (!cacheMetrics.available) {
      healthStatus = 'degraded';
      issues.push('Cache unavailable');
    }
    
    if (issues.length > 0) {
      healthStatus = 'unhealthy';
    }
    
    res.json({
      status: healthStatus,
      issues: issues.length > 0 ? issues : undefined,
      metrics
    });
    
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to collect metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Prometheus metrics endpoint (for scraping)
router.get('/prometheus', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    
    const metrics = [
      `# HELP nodejs_memory_usage_bytes Memory usage in bytes`,
      `# TYPE nodejs_memory_usage_bytes gauge`,
      `nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}`,
      `nodejs_memory_usage_bytes{type="heap_used"} ${memUsage.heapUsed}`,
      `nodejs_memory_usage_bytes{type="heap_total"} ${memUsage.heapTotal}`,
      `nodejs_memory_usage_bytes{type="external"} ${memUsage.external}`,
      `nodejs_memory_usage_bytes{type="array_buffers"} ${memUsage.arrayBuffers}`,
      '',
      `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
      `# TYPE nodejs_process_uptime_seconds counter`,
      `nodejs_process_uptime_seconds ${process.uptime()}`,
      '',
      `# HELP nodejs_process_cpu_total Total CPU usage`,
      `# TYPE nodejs_process_cpu_total counter`,
      `nodejs_process_cpu_total_user ${process.cpuUsage().user}`,
      `nodejs_process_cpu_total_system ${process.cpuUsage().system}`,
      '',
      `# HELP api_requests_total Total number of API requests`,
      `# TYPE api_requests_total counter`,
      `api_requests_total ${dbQueriesTotal.get()}`,
      '',
      `# HELP api_slow_queries_total Total number of slow database queries`,
      `# TYPE api_slow_queries_total counter`,
      `api_slow_queries_total ${dbSlowQueriesTotal.get()}`
    ];
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
    
  } catch (error) {
    logger.error('Prometheus metrics error:', error);
    res.status(500).send('# Error collecting metrics\n');
  }
});

export default router;
