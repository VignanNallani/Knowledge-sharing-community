import express from 'express';
import { authenticate } from '../middleware/index.js';
import { rateLimiter } from '../middleware/index.js';
import FollowController from '../controllers/followController.js';

const router = express.Router();

// Apply rate limiting to all follow routes
router.use(rateLimiter);

// All routes require authentication
router.use(authenticate);

// Follow/Unfollow operations
router.post('/:targetUserId', FollowController.followUser);
router.delete('/:targetUserId', FollowController.unfollowUser);

// Get followers/following with pagination
router.get('/followers/:userId', FollowController.getFollowers);
router.get('/following/:userId', FollowController.getFollowing);

// Get counts
router.get('/followers/:userId/count', FollowController.getFollowersCount);
router.get('/following/:userId/count', FollowController.getFollowingCount);

// Follow status checks
router.get('/is-following/:followingId', FollowController.isFollowing);
router.get('/relationship/:userId1/:userId2', FollowController.getFollowRelationship);
router.post('/status', FollowController.getFollowStatus);

// Social stats
router.get('/stats/:userId', FollowController.getUserSocialStats);

// Mutual followers
router.get('/mutual/:userId1/:userId2', FollowController.getMutualFollowers);

export default router;
