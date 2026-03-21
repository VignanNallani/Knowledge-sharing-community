import express from 'express';
import healthChecker from '../utils/health-checker.js';
import { logger } from '../config/index.js';

const router = express.Router();

// Pure liveness probe - FAST, in-memory only
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe - checks dependencies (DB, Redis, etc.)
router.get('/readiness', async (req, res) => {
  try {
    const healthReport = await healthChecker.getHealthReport();
    
    const statusCode = healthReport.status === 'healthy' ? 200 : 
                      healthReport.status === 'degraded' ? 200 : 503;
    
    return res.status(statusCode).json({
      success: healthReport.status !== 'unhealthy',
      message: `Service status: ${healthReport.status}`,
      data: healthReport
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    return res.status(503).json({
      success: false,
      message: 'Readiness check failed',
      error: error.message
    });
  }
});

export default router;
