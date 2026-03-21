import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  discoverMentors,
  createMentorshipRequest
} from '../controllers/mentorship.controller.simple.js';

const router = express.Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/v1/mentorship/find
 * Simple mentor discovery endpoint
 */
router.get('/find', discoverMentors);

/**
 * POST /api/v1/mentorship/request
 * Create mentorship request (protected)
 */
router.post('/request', authenticate, createMentorshipRequest);

export default router;
