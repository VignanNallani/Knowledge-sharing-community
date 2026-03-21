import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import likeService from '../services/like.service.js';
import notificationService from '../services/notification.service.js';
import ValidationMiddleware from '../middleware/validation.middleware.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';

class LikeController extends BaseController {
  // Like post
  static likePost = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(postId) });
    
    const result = await likeService.likePost(parseInt(postId), userId);
    
    // Create notification if like was successful and not self-like
    if (result.liked && result.postAuthorId !== userId) {
      try {
        await notificationService.createNotification(result.postAuthorId, {
          type: 'LIKE',
          message: `${req.user.name} liked your post: ${result.postTitle}`,
          postId: parseInt(postId)
        });
        logger.info('Notification created for post like:', { postAuthorId: result.postAuthorId, postId });
      } catch (notificationError) {
        logger.error('Failed to create notification:', notificationError);
        // Don't fail the like if notification fails
      }
    }
    
    logger.info('Post liked:', { 
      action: 'like_post', 
      postId: parseInt(postId), 
      userId,
      liked: result.liked 
    });
    
    if (result.action === 'already_liked') {
      return Response.conflict(res, 'You have already liked this post');
    }
    
    return Response.created(res, result, 'Post liked successfully');
  });

  // Unlike post
  static unlikePost = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(postId) });
    
    const result = await likeService.unlikePost(parseInt(postId), userId);
    logger.info('Post unliked:', { 
      action: 'unlike_post', 
      postId: parseInt(postId), 
      userId,
      unliked: result.unliked 
    });
    
    if (result.action === 'was_not_liked') {
      return Response.badRequest(res, 'You have not liked this post');
    }
    
    return Response.success(res, result, 'Post unliked successfully');
  });

  // Get like status for multiple posts
  static getLikeStatuses = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postIds } = req.query;
    
    // Validate inputs
    if (!postIds) {
      return Response.badRequest(res, 'Post IDs array is required');
    }
    
    const postIdArray = Array.isArray(postIds) ? postIds : postIds.split(',').map(id => id.trim());
    const validPostIds = postIdArray.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validPostIds.length === 0) {
      return Response.success(res, {}, 'Like status retrieved successfully');
    }
    
    if (validPostIds.length > 50) {
      return Response.badRequest(res, 'Cannot check more than 50 posts at once');
    }
    
    const result = await likeService.getLikeStatuses(validPostIds, userId);
    logger.info('Like statuses retrieved:', { 
      action: 'get_like_statuses', 
      userId,
      requestedPosts: validPostIds.length 
    });
    
    return Response.success(res, result, 'Like status retrieved successfully');
  });

  // Get like count for post
  static getLikeCount = BaseController.asyncHandler(async (req, res) => {
    const { postId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(postId) });
    
    const count = await likeService.getLikeCount(parseInt(postId));
    
    return Response.success(res, { count }, 'Like count retrieved successfully');
  });

  // Get users who liked a post
  static getPostLikers = BaseController.asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const pagination = BaseController.getPaginationParams(req);
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(postId) });
    
    const result = await likeService.getPostLikers(parseInt(postId), pagination);
    
    return Response.paginated(res, result.data, result.pagination);
  });

  // Get user's liked posts
  static getUserLikedPosts = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const pagination = BaseController.getPaginationParams(req);
    
    // Validate inputs
    const result = await likeService.getUserLikedPosts(userId, pagination);
    
    return Response.paginated(res, result.data, result.pagination);
  });

  // Toggle like status
  static toggleLike = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(postId) });
    
    const result = await likeService.toggleLike(parseInt(postId), userId);
    
    // Create notification if like was successful and not self-like
    if (result.action === 'liked' && result.postAuthorId !== userId) {
      try {
        await notificationService.createNotification(result.postAuthorId, {
          type: 'LIKE',
          message: `${req.user.name} liked your post: ${result.postTitle}`,
          postId: parseInt(postId)
        });
        logger.info('Notification created for post like:', { postAuthorId: result.postAuthorId, postId });
      } catch (notificationError) {
        logger.error('Failed to create notification:', notificationError);
        // Don't fail the like if notification fails
      }
    }
    
    if (result.action === 'already_liked') {
      return Response.conflict(res, 'You have already liked this post');
    }
    
    return Response.success(res, result, `Post ${result.action} successfully`);
  });

  // Batch like posts
  static batchLikePosts = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postIds } = req.body;
    
    // Validate inputs
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return Response.badRequest(res, 'Post IDs array is required');
    }
    
    if (postIds.length > 10) {
      return Response.badRequest(res, 'Cannot like more than 10 posts at once');
    }
    
    const result = await likeService.batchLikePosts(postIds, userId);
    
    return Response.success(res, result, `Batch like operation completed`);
  });

  // Get user like statistics
  static getUserLikeStats = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    // Validate inputs
    const result = await likeService.getUserLikeStats(userId);
    
    return Response.success(res, result, 'User like statistics retrieved successfully');
  });

  // Get like analytics
  static getLikeAnalytics = BaseController.asyncHandler(async (req, res) => {
    const { postIds } = req.query;
    const { timeRange } = req.query;
    
    // Validate inputs
    if (!postIds) {
      return Response.badRequest(res, 'Post IDs array is required');
    }
    
    const postIdArray = Array.isArray(postIds) ? postIds : postIds.split(',').map(id => id.trim());
    const validPostIds = postIdArray.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validPostIds.length === 0) {
      return Response.success(res, [], 'Like analytics retrieved successfully');
    }
    
    if (validPostIds.length > 20) {
      return Response.badRequest(res, 'Cannot analyze more than 20 posts at once');
    }
    
    const timeRangeObj = timeRange ? {
      start: new Date(timeRange.start),
      end: new Date(timeRange.end)
    } : null;
    
    const result = await likeService.getLikeAnalytics(validPostIds, timeRangeObj);
    
    return Response.success(res, result, 'Like analytics retrieved successfully');
  });
}

export default LikeController;
