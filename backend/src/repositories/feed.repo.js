import BaseRepository from '../base/BaseRepository.js';
import prisma from '../config/prisma.js';

class FeedRepository extends BaseRepository {
  constructor() {
    super(prisma.post, 'Post');
  }

  // Get personalized feed for user
  async getPersonalizedFeed(userId, options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20, 
        includeComments = false 
      } = options;

      // Get users that current user follows
      const followingIds = await this.getFollowingIds(userId);
      
      if (followingIds.length === 0) {
        return {
          data: [],
          pagination: {
            hasNext: false,
            hasPrev: false,
            nextCursor: null,
            total: 0,
            page: 1,
            limit
          }
        };
      }

      // Build where clause for posts from followed users
      const where = {
        authorId: { in: followingIds },
        // Optionally include user's own posts
        ...(options.includeOwnPosts && { OR: [{ authorId: userId }] })
      };

      // Query posts with cursor-based pagination
      const posts = await prisma.post.findMany({
        where,
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
          },
          ...(includeComments && {
            comments: {
              where: { parentCommentId: null },
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true
                  }
                }
              }
            }
          })
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Get one extra to check if there are more
        ...(cursor && { cursor: { id: cursor } })
      });

      // Process posts and check if there are more
      const hasMore = posts.length > limit;
      const feedPosts = posts.slice(0, limit);

      // Transform posts to feed format
      const transformedPosts = feedPosts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        isLikedByCurrentUser: post._count.likes > 0, // Will be updated in service layer
        _count: undefined,
        comments: includeComments ? post.comments : undefined
      }));

      const nextCursor = hasMore ? feedPosts[feedPosts.length - 1].id : null;

      return {
        data: transformedPosts,
        pagination: {
          hasNext: hasMore,
          hasPrev: cursor !== null,
          nextCursor,
          total: await this.getFeedCount(userId, where),
          page: cursor ? Math.ceil(await this.getFeedCount(userId, where) / limit) : 1,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get following IDs efficiently
  async getFollowingIds(userId) {
    try {
      const following = await prisma.follower.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });
      return following.map(f => f.followingId);
    } catch (error) {
      throw error;
    }
  }

  // Get total feed count
  async getFeedCount(userId, where) {
    try {
      return await prisma.post.count({ where });
    } catch (error) {
      throw error;
    }
  }

  // Get global feed (all posts, not personalized)
  async getGlobalFeed(options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20,
        includeComments = false 
      } = options;

      const posts = await prisma.post.findMany({
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
          },
          ...(includeComments && {
            comments: {
              where: { parentCommentId: null },
              take: 3,
              orderBy: { createdAt: 'desc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true
                  }
                }
              }
            }
          })
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
        isLikedByCurrentUser: false, // Will be updated in service layer
        _count: undefined,
        comments: includeComments ? post.comments : undefined
      }));

      const nextCursor = hasMore ? feedPosts[feedPosts.length - 1].id : null;

      return {
        data: transformedPosts,
        pagination: {
          hasNext: hasMore,
          hasPrev: cursor !== null,
          nextCursor,
          total: await this.getGlobalFeedCount(),
          page: cursor ? Math.ceil(await this.getGlobalFeedCount() / limit) : 1,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get global feed count
  async getGlobalFeedCount() {
    try {
      return await prisma.post.count();
    } catch (error) {
      throw error;
    }
  }

  // Get trending posts (posts with high engagement)
  async getTrendingFeed(options = {}) {
    try {
      const { 
        cursor = null, 
        limit = 20,
        timeWindow = '7d' // Default to last 7 days
      } = options;

      // Calculate date threshold
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeWindow));

      const posts = await prisma.post.findMany({
        where: {
          createdAt: { gte: dateThreshold }
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
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
          { createdAt: 'desc' }
        ],
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } })
      });

      const hasMore = posts.length > limit;
      const feedPosts = posts.slice(0, limit);

      const transformedPosts = feedPosts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        isLikedByCurrentUser: false, // Will be updated in service layer
        _count: undefined
      }));

      const nextCursor = hasMore ? feedPosts[feedPosts.length - 1].id : null;

      return {
        data: transformedPosts,
        pagination: {
          hasNext: hasMore,
          hasPrev: cursor !== null,
          nextCursor,
          total: await this.getTrendingCount(timeWindow),
          page: cursor ? Math.ceil(await this.getTrendingCount(timeWindow) / limit) : 1,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get trending posts count
  async getTrendingCount(timeWindow = '7d') {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeWindow));
      
      return await prisma.post.count({
        where: {
          createdAt: { gte: dateThreshold }
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Legacy exports for backward compatibility
  findMany = (options = {}) => prisma.post.findMany(options);
  count = (where = {}) => prisma.post.count({ where });
  findUnique = (options = {}) => prisma.post.findUnique(options);
}

export default new FeedRepository();
