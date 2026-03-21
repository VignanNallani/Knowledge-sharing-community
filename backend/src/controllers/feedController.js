import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import feedService from '../services/feed.service.js';
import ValidationMiddleware from '../middleware/validation.middleware.js';

class FeedController extends BaseController {
  // Get personalized feed
  static getPersonalizedFeed = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { cursor, includeComments, includeOwnPosts } = req.query;
    
    // Validate inputs
    if (cursor && isNaN(parseInt(cursor))) {
      return this.badRequest(res, 'Invalid cursor parameter');
    }
    
    const includeCommentsBool = includeComments === 'true';
    const includeOwnPostsBool = includeOwnPosts === 'true';
    
    const result = await feedService.getPersonalizedFeed(userId, {
      cursor: cursor ? parseInt(cursor) : null,
      limit: pagination.limit,
      includeComments: includeCommentsBool,
      includeOwnPosts: includeOwnPostsBool
    });
    
    this.logRequest(req, { 
      action: 'get_personalized_feed', 
      userId, 
      count: result.data.length,
      cursor,
      includeComments: includeCommentsBool 
    });
    
    return this.success(res, result, 'Personalized feed retrieved successfully');
  });

  // Get global feed
  static getGlobalFeed = BaseController.asyncHandler(async (req, res) => {
    const pagination = this.getPaginationParams(req);
    const { cursor, includeComments } = req.query;
    
    // Validate inputs
    if (cursor && isNaN(parseInt(cursor))) {
      return this.badRequest(res, 'Invalid cursor parameter');
    }
    
    const includeCommentsBool = includeComments === 'true';
    
    const result = await feedService.getGlobalFeed({
      cursor: cursor ? parseInt(cursor) : null,
      limit: pagination.limit,
      includeComments: includeCommentsBool
    });
    
    this.logRequest(req, { 
      action: 'get_global_feed', 
      count: result.data.length,
      cursor,
      includeComments: includeCommentsBool 
    });
    
    return this.success(res, result, 'Global feed retrieved successfully');
  });

  // Get trending feed
  static getTrendingFeed = BaseController.asyncHandler(async (req, res) => {
    const pagination = this.getPaginationParams(req);
    const { cursor, timeWindow } = req.query;
    
    // Validate inputs
    if (cursor && isNaN(parseInt(cursor))) {
      return this.badRequest(res, 'Invalid cursor parameter');
    }
    
    const validTimeWindows = ['24h', '7d', '30d'];
    const selectedTimeWindow = validTimeWindows.includes(timeWindow) ? timeWindow : '7d';
    
    const result = await feedService.getTrendingFeed({
      cursor: cursor ? parseInt(cursor) : null,
      limit: pagination.limit,
      timeWindow: selectedTimeWindow
    });
    
    this.logRequest(req, { 
      action: 'get_trending_feed', 
      count: result.data.length,
      cursor,
      timeWindow: selectedTimeWindow 
    });
    
    return this.success(res, result, 'Trending feed retrieved successfully');
  });

  // Get feed by specific users
  static getFeedByUsers = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { userIds } = req.body;
    
    // Validate inputs
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return this.badRequest(res, 'User IDs array is required');
    }
    
    if (userIds.length > 20) {
      return this.badRequest(res, 'Cannot fetch feed for more than 20 users at once');
    }
    
    const result = await feedService.getFeedByUsers(userIds, {
      cursor: pagination.cursor,
      limit: pagination.limit
    });
    
    this.logRequest(req, { 
      action: 'get_feed_by_users', 
      userId,
      requestedUsers: userIds.length,
      count: result.data.length 
    });
    
    return this.success(res, result, 'Multi-user feed retrieved successfully');
  });

  // Get mixed feed (posts + activities)
  static getMixedFeed = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { cursor, includeActivities, postLimit, activityLimit } = req.query;
    
    // Validate inputs
    if (cursor && isNaN(parseInt(cursor))) {
      return this.badRequest(res, 'Invalid cursor parameter');
    }
    
    const includeActivitiesBool = includeActivities === 'true';
    const postLimitNum = postLimit ? parseInt(postLimit) : 15;
    const activityLimitNum = activityLimit ? parseInt(activityLimit) : 5;
    
    const result = await feedService.getMixedFeed(userId, {
      cursor: cursor ? parseInt(cursor) : null,
      limit: pagination.limit,
      includeActivities: includeActivitiesBool,
      postLimit: postLimitNum,
      activityLimit: activityLimitNum
    });
    
    this.logRequest(req, { 
      action: 'get_mixed_feed', 
      userId,
      count: result.data.length,
      includeActivities: includeActivitiesBool 
    });
    
    return this.success(res, result, 'Mixed feed retrieved successfully');
  });

  // Get recommended posts
  static getRecommendedPosts = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { includeComments } = req.query;
    
    // Validate inputs
    const includeCommentsBool = includeComments === 'true';
    
    const result = await feedService.getRecommendedPosts(userId, {
      limit: pagination.limit,
      includeComments: includeCommentsBool
    });
    
    this.logRequest(req, { 
      action: 'get_recommended_posts', 
      userId,
      count: result.data.length 
    });
    
    return this.success(res, result, 'Recommended posts retrieved successfully');
  });

  // Refresh feed (clear cache and get fresh data)
  static refreshFeed = BaseController.asyncHandler(async (req, res) => {
    const userId = this.getUserId(req);
    const pagination = this.getPaginationParams(req);
    const { feedType = 'personalized' } = req.body;
    
    // Validate feed type
    const validFeedTypes = ['personalized', 'global', 'trending'];
    if (!validFeedTypes.includes(feedType)) {
      return this.badRequest(res, 'Invalid feed type. Must be one of: personalized, global, trending');
    }
    
    let result;
    switch (feedType) {
      case 'personalized':
        result = await feedService.getPersonalizedFeed(userId, {
          cursor: null,
          limit: pagination.limit,
          includeComments: false,
          includeOwnPosts: true
        });
        break;
      case 'global':
        result = await feedService.getGlobalFeed({
          cursor: null,
          limit: pagination.limit,
          includeComments: false
        });
        break;
      case 'trending':
        result = await feedService.getTrendingFeed({
          cursor: null,
          limit: pagination.limit,
          timeWindow: '7d'
        });
        break;
    }
    
    this.logRequest(req, { 
      action: 'refresh_feed', 
      userId,
      feedType,
      count: result.data.length 
    });
    
    return this.success(res, result, `${feedType} feed refreshed successfully`);
  });
}

export default FeedController;
