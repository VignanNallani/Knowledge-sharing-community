import express from 'express';
import { authenticate } from '../middleware/index.js';
import { rateLimiter } from '../middleware/index.js';
import InternalController from '../controllers/internalController.js';

const router = express.Router();

// Apply stricter rate limiting to internal routes
router.use(rateLimiter);

// All routes require authentication and admin role
router.use(authenticate);

// Event system statistics routes (admin only)
router.get('/events/stats', InternalController.getEventStats);
router.get('/events/emission-stats', InternalController.getEventEmissionStats);
router.get('/events/listener-stats', InternalController.getListenerStats);
router.get('/events/error-stats', InternalController.getErrorStats);
router.post('/events/reset-stats', InternalController.resetEventStats);

export default router;
