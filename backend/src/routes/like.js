import express from 'express';
import { authMiddleware } from '../middleware/index.js';
import { rateLimiter } from '../middleware/index.js';
import LikeController from '../controllers/likeController.js';

const router = express.Router();

// Apply rate limiting to all like routes
router.use(rateLimiter);

// All routes require authentication
router.use(authMiddleware);

// Like/Unlike operations
router.post('/:postId', LikeController.likePost);
router.delete('/:postId', LikeController.unlikePost);

// Get like status and counts
router.get('/status', LikeController.getLikeStatuses);
router.get('/count/:postId', LikeController.getLikeCount);
router.get('/post/:postId/likers', LikeController.getPostLikers);

// User's liked posts
router.get('/user/:userId/liked', LikeController.getUserLikedPosts);

// Toggle like status
router.post('/toggle/:postId', LikeController.toggleLike);

// Batch operations
router.post('/batch', LikeController.batchLikePosts);

// Analytics and statistics
router.get('/user/:userId/stats', LikeController.getUserLikeStats);
router.get('/analytics', LikeController.getLikeAnalytics);

export default router;
