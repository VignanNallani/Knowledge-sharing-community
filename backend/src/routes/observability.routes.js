import express from 'express';
import observability from '../utils/observability.js';
import { requireMinimumRole } from '../middleware/rbac.middleware.js';
import { ROLES } from '../config/roles.js';
import { readFileSync } from 'fs';

const router = express.Router();

// Get package.json version
let packageVersion = '1.0.0';
try {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  packageVersion = packageJson.version || '1.0.0';
} catch (error) {
  console.warn('Could not read package.json for version');
}

// Internal performance test route (operator validation only)
router.get('/internal/perf-test', async (req, res) => {
  return res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// Also expose under observability for testing
router.get('/perf-test', async (req, res) => {
  return res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// Enhanced health check endpoint (public)
router.get('/health', async (req, res) => {
  try {
    const health = await observability.getHealthStatus();
    const memoryUsage = process.memoryUsage();
    
    const healthResponse = {
      status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
      database: health.database?.status === 'healthy' ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      version: packageVersion,
      timestamp: new Date().toISOString(),
      checks: health.checks || {}
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json(healthResponse);
  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      database: 'unknown',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: packageVersion,
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    };
    return res.status(503).json(errorResponse);
  }
});

// Metrics endpoint (admin only)
router.get('/metrics', requireMinimumRole(ROLES.ADMIN), (req, res) => {
  const metrics = observability.getMetrics();
  res.json(metrics);
});

// Reset metrics endpoint (superadmin only)
router.post('/metrics/reset', requireMinimumRole(ROLES.SUPERADMIN), (req, res) => {
  observability.resetMetrics();
  res.json({ message: 'Metrics reset successfully' });
});

export default router;
