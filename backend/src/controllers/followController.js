import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import followService from '../services/follow.service.js';
import ValidationMiddleware from '../middleware/validation.middleware.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';

class FollowController extends BaseController {
  // Follow/unfollow user (toggle)
  static followUser = BaseController.asyncHandler(async (req, res) => {
    const followerId = req.user.id;
    const { targetUserId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(targetUserId) });
    
    // Check if already following
    const isFollowing = await followService.isFollowing(followerId, parseInt(targetUserId));
    
    if (isFollowing) {
      // Unfollow if already following
      const result = await followService.unfollowUser(followerId, parseInt(targetUserId));
      logger.info('User unfollowed:', { 
        action: 'unfollow_user', 
        followingId: parseInt(targetUserId), 
        followerId
      });
      
      return Response.success(res, { following: false }, 'User unfollowed successfully');
    } else {
      // Follow if not already following
      const follow = await followService.followUser(followerId, parseInt(targetUserId));
      logger.info('User followed:', { 
        action: 'follow_user', 
        followingId: parseInt(targetUserId), 
        followerId
      });
      
      return Response.success(res, { following: true, follow }, 'User followed successfully');
    }
  });

  // Unfollow user
  static unfollowUser = BaseController.asyncHandler(async (req, res) => {
    const followerId = req.user.id;
    const { targetUserId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(targetUserId) });
    
    const result = await followService.unfollowUser(followerId, parseInt(targetUserId));
    logger.info('User unfollowed:', { 
      action: 'unfollow_user', 
      followingId: parseInt(targetUserId), 
      unfollowed: result.unfollowed 
    });
    
    return Response.success(res, result, 'User unfollowed successfully');
  });

  // Get followers of user
  static getFollowers = BaseController.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const pagination = this.getPaginationParams(req);
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId) });
    
    const result = await followService.getFollowers(parseInt(userId), pagination);
    logger.info('Followers retrieved:', { 
      action: 'get_followers', 
      userId: parseInt(userId), 
      count: result.data.length 
    });
    
    return Response.paginated(res, result.data, result.pagination);
  });

  // Get following of user
  static getFollowing = BaseController.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const pagination = this.getPaginationParams(req);
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId) });
    
    const result = await followService.getFollowing(parseInt(userId), pagination);
    logger.info('Following retrieved:', { 
      action: 'get_following', 
      userId: parseInt(userId), 
      count: result.data.length 
    });
    
    return Response.paginated(res, result.data, result.pagination);
  });

  // Get follower count
  static getFollowersCount = BaseController.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId) });
    
    const count = await followService.getFollowersCount(parseInt(userId));
    logger.info('Followers count retrieved:', { 
      action: 'get_followers_count', 
      userId: parseInt(userId) 
    });
    
    return Response.success(res, { count }, 'Followers count retrieved successfully');
  });

  // Get following count
  static getFollowingCount = BaseController.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId) });
    
    const count = await followService.getFollowingCount(parseInt(userId));
    logger.info('Following count retrieved:', { 
      action: 'get_following_count', 
      userId: parseInt(userId) 
    });
    
    return Response.success(res, { count }, 'Following count retrieved successfully');
  });

  // Check if following user
  static isFollowing = BaseController.asyncHandler(async (req, res) => {
    const followerId = this.getUserId(req);
    const { followingId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(followingId) });
    
    const isFollowing = await followService.isFollowing(followerId, parseInt(followingId));
    logger.info('Follow status checked:', { 
      action: 'is_following', 
      followerId: parseInt(followerId), 
      followingId: parseInt(followingId), 
      isFollowing 
    });
    
    return Response.success(res, { isFollowing }, 'Follow status retrieved successfully');
  });

  // Get follow relationship between two users
  static getFollowRelationship = BaseController.asyncHandler(async (req, res) => {
    const { userId1, userId2 } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId1) });
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId2) });
    
    const relationship = await followService.getFollowRelationship(parseInt(userId1), parseInt(userId2));
    this.logRequest(req, { action: 'get_follow_relationship', userId1: parseInt(userId1), userId2: parseInt(userId2) });
    
    return this.success(res, relationship, 'Follow relationship retrieved successfully');
  });

  // Get user social stats
  static getUserSocialStats = BaseController.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId) });
    
    const stats = await followService.getUserSocialStats(parseInt(userId));
    logger.info('User social stats retrieved:', { 
      action: 'get_user_social_stats', 
      userId: parseInt(userId), 
      totalLikes: stats.totalLikes 
    });
    
    return Response.success(res, stats, 'User social stats retrieved successfully');
  });

  // Batch follow status check
  static getFollowStatus = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const { userIds } = req.body;
    
    // Validate inputs
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return this.badRequest(res, 'User IDs array is required');
    }
    
    if (userIds.length > 50) {
      return this.badRequest(res, 'Cannot check more than 50 users at once');
    }
    
    const validUserIds = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    const statusMap = await followService.getFollowStatus(userId, validUserIds);
    logger.info('Follow status retrieved:', { 
      action: 'get_follow_status', 
      checkedUsers: validUserIds.length 
    });
    
    return Response.success(res, statusMap, 'Follow status retrieved successfully');
  });

  // Get mutual followers
  static getMutualFollowers = BaseController.asyncHandler(async (req, res) => {
    const { userId1, userId2 } = req.params;
    const pagination = this.getPaginationParams(req);
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId1) });
    ValidationMiddleware.schemas.id.validate({ id: parseInt(userId2) });
    
    const result = await followService.getMutualFollowers(parseInt(userId1), parseInt(userId2), pagination);
    logger.info('Mutual followers retrieved:', { 
      action: 'get_mutual_followers', 
      userId1: parseInt(userId1), 
      userId2: parseInt(userId2), 
      count: result.data.length 
    });
    
    return Response.paginated(res, result.data, result.pagination);
  });
}

export default FollowController;
