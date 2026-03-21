import express from 'express';
import { authenticate } from '../middleware/index.js';
import { rateLimiter } from '../middleware/index.js';
import FeedController from '../controllers/feedController.js';

const router = express.Router();

// Apply rate limiting to all feed routes
router.use(rateLimiter);

// Public routes (no authentication required for basic feeds)
router.get('/global', FeedController.getGlobalFeed);
router.get('/trending', FeedController.getTrendingFeed);

// Protected routes (require authentication)
router.use(authenticate);

// Personalized feed (main feed)
router.get('/personalized', FeedController.getPersonalizedFeed);

// Advanced feed features
router.get('/users', FeedController.getFeedByUsers);
router.get('/mixed', FeedController.getMixedFeed);
router.get('/recommended', FeedController.getRecommendedPosts);

// Feed management
router.post('/refresh', FeedController.refreshFeed);

export default router;
