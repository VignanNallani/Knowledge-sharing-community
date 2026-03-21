import BaseService from '../base/BaseService.js';
import feedRepository from '../repositories/feed.repo.js';
import likeRepository from '../repositories/post.repo.js';
import { ErrorFactory } from '../errors/index.js';

class FeedService extends BaseService {
  constructor() {
    super(feedRepository);
  }

  // Get personalized feed for user
  async getPersonalizedFeed(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { 
        cursor = null, 
        limit = 20, 
        includeComments = false,
        includeOwnPosts = true 
      } = options;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      // Get feed from repository
      const feedResult = await feedRepository.getPersonalizedFeed(userId, {
        cursor,
        limit,
        includeComments,
        includeOwnPosts
      });

      // Enhance with like status if user is authenticated
      if (userId) {
        feedResult.data = await this.enhancePostsWithLikeStatus(feedResult.data, userId);
      }

      return feedResult;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getPersonalizedFeed', error);
    }
  }

  // Get global feed (all posts)
  async getGlobalFeed(options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20, 
        includeComments = false 
      } = options;

      // Validate pagination parameters
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      return await feedRepository.getGlobalFeed({
        cursor,
        limit,
        includeComments
      });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getGlobalFeed', error);
    }
  }

  // Get trending posts
  async getTrendingFeed(options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20, 
        timeWindow = '7d' 
      } = options;

      // Validate parameters
      if (limit < 1 || limit > 50) {
        throw new Error('Trending limit must be between 1 and 50');
      }

      const validTimeWindows = ['24h', '7d', '30d'];
      if (!validTimeWindows.includes(timeWindow)) {
        throw new Error('Time window must be one of: 24h, 7d, 30d');
      }

      return await feedRepository.getTrendingFeed({
        cursor,
        limit,
        timeWindow
      });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getTrendingFeed', error);
    }
  }

  // Get feed by specific users (multi-user feed)
  async getFeedByUsers(userIds, options = {}) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs array is required');
      }

      if (userIds.length > 20) {
        throw new Error('Cannot fetch feed for more than 20 users at once');
      }

      const { cursor = null, limit = 20 } = options;

      // Get posts from specific users
      const posts = await this.repository.findMany({
        where: {
          authorId: { in: userIds }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } })
      });

      const hasMore = posts.length > limit;
      const feedPosts = posts.slice(0, limit);

      const transformedPosts = feedPosts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        isLikedByCurrentUser: false, // Will be enhanced if userId provided
        _count: undefined
      }));

      const nextCursor = hasMore ? feedPosts[feedPosts.length - 1].id : null;

      return {
        data: transformedPosts,
        pagination: {
          hasNext: hasMore,
          hasPrev: cursor !== null,
          nextCursor,
          total: await this.repository.count({
            where: { authorId: { in: userIds } }
          }),
          page: cursor ? Math.ceil(await this.repository.count({
            where: { authorId: { in: userIds } }
          }) / limit) : 1,
          limit
        }
      };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getFeedByUsers', error);
    }
  }

  // Enhance posts with like status for current user
  async enhancePostsWithLikeStatus(posts, userId) {
    try {
      if (!userId) {
        return posts;
      }

      // Get post IDs
      const postIds = posts.map(post => post.id);
      
      if (postIds.length === 0) {
        return posts;
      }

      // Get like status for all posts at once
      const likes = await likeRepository.findPostLike({
        postId: { in: postIds },
        userId
      });

      // Create a map of liked post IDs
      const likedPostIds = new Set(likes.map(like => like.postId));

      // Enhance posts with like status
      return posts.map(post => ({
        ...post,
        isLikedByCurrentUser: likedPostIds.has(post.id)
      }));
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('enhancePostsWithLikeStatus', error);
    }
  }

  // Get feed with mixed content (posts + activities)
  async getMixedFeed(userId, options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20,
        includeActivities = true,
        postLimit = 15,
        activityLimit = 5
      } = options;

      // Get personalized posts
      const postsResult = await this.getPersonalizedFeed(userId, {
        cursor,
        limit: postLimit,
        includeComments: false,
        includeOwnPosts: true
      });

      let activities = [];
      if (includeActivities) {
        // Get recent activities from followed users
        activities = await this.getRecentActivities(userId, activityLimit);
      }

      // Merge and sort by timestamp
      const mixedFeed = [
        ...postsResult.data.map(post => ({
          type: 'post',
          data: post,
          timestamp: post.createdAt
        })),
        ...activities.map(activity => ({
          type: 'activity',
          data: activity,
          timestamp: activity.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        data: mixedFeed,
        pagination: postsResult.pagination,
        hasMore: postsResult.pagination.hasNext
      };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getMixedFeed', error);
    }
  }

  // Get recent activities from followed users
  async getRecentActivities(userId, limit = 10) {
    try {
      // This would require importing activity service
      // For now, return empty array
      return [];
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getRecentActivities', error);
    }
  }

  // Get recommended posts based on user's interests
  async getRecommendedPosts(userId, options = {}) {
    try {
      const { limit = 20, includeComments = false } = options;

      // Get user's following to understand interests
      const followingIds = await feedRepository.getFollowingIds(userId);
      
      if (followingIds.length === 0) {
        // If user follows no one, return trending posts
        return await this.getTrendingFeed({ limit, includeComments });
      }

      // Get posts from followed users and find popular tags
      const posts = await this.repository.findMany({
        where: {
          authorId: { in: followingIds }
        },
        include: {
          author: true,
          tags: {
            include: {
              tag: true
            }
          }
        },
        take: 100, // Get more posts for analysis
        orderBy: { createdAt: 'desc' }
      });

      // Extract and count popular tags
      const tagCounts = {};
      posts.forEach(post => {
        post.tags?.forEach(postTag => {
          const tagName = postTag.tag.name;
          tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
        });
      });

      // Get top tags
      const topTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tagName]) => tagName);

      if (topTags.length === 0) {
        return await this.getTrendingFeed({ limit, includeComments });
      }

      // Find posts with top tags that user hasn't seen
      const recommendedPosts = await this.repository.findMany({
        where: {
          authorId: { not: userId }, // Exclude user's own posts
          tags: {
            some: {
              tag: {
                name: { in: topTags }
              }
            }
          }
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      const transformedPosts = recommendedPosts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        isLikedByCurrentUser: false,
        _count: undefined
      }));

      return {
        data: transformedPosts,
        pagination: {
          hasNext: false,
          hasPrev: false,
          nextCursor: null,
          total: transformedPosts.length,
          page: 1,
          limit
        }
      };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getRecommendedPosts', error);
    }
  }
}

export default new FeedService();
