import BaseRepository from '../base/BaseRepository.js';
import prisma from '../config/prisma.js';

class LikeRepository extends BaseRepository {
  constructor() {
    super(prisma.like, 'Like');
  }

  // Check if user already liked post
  async isLikedByUser(postId, userId) {
    try {
      const like = await prisma.like.findUnique({
        where: {
          postId_userId: {
            postId,
            userId
          }
        }
      });
      return !!like;
    } catch (error) {
      throw error;
    }
  }

  // Create like (idempotent)
  async createLike(postId, userId) {
    try {
      // Check if already liked to prevent duplicates
      const existingLike = await this.isLikedByUser(postId, userId);
      if (existingLike) {
        return { liked: false, action: 'already_liked' };
      }

      const like = await prisma.like.create({
        data: {
          postId,
          userId,
          createdAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          },
          post: {
            select: {
              id: true,
              title: true,
              authorId: true
            }
          }
        }
      });

      return { liked: true, like };
    } catch (error) {
      throw error;
    }
  }

  // Remove like (idempotent)
  async removeLike(postId, userId) {
    try {
      const result = await prisma.like.deleteMany({
        where: {
          postId,
          userId
        }
      });
      
      return { 
        unliked: result.count > 0, 
        action: result.count > 0 ? 'unliked' : 'was_not_liked' 
      };
    } catch (error) {
      throw error;
    }
  }

  // Get like status for multiple posts (batch operation)
  async getLikeStatuses(postIds, userId) {
    try {
      if (!Array.isArray(postIds) || postIds.length === 0) {
        return {};
      }

      if (postIds.length > 50) {
        throw new Error('Cannot check more than 50 posts at once');
      }

      const likes = await prisma.like.findMany({
        where: {
          postId: { in: postIds },
          userId
        },
        select: {
          postId: true
        }
      });

      // Create a map of liked post IDs
      const likedPostIds = {};
      likes.forEach(like => {
        likedPostIds[like.postId] = true;
      });

      // Ensure all post IDs are present in the result
      const statusMap = {};
      postIds.forEach(postId => {
        statusMap[postId] = likedPostIds[postId] || false;
      });

      return statusMap;
    } catch (error) {
      throw error;
    }
  }

  // Get like count for post
  async getLikeCount(postId) {
    try {
      return await prisma.like.count({
        where: { postId }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get users who liked a post (for notifications)
  async getPostLikers(postId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const likes = await prisma.like.findMany({
        where: { postId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      const total = await prisma.like.count({ where: { postId } });

      return {
        data: likes.map(like => ({
          ...like.user,
          likedAt: like.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user's liked posts with pagination
  async getUserLikedPosts(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const likes = await prisma.like.findMany({
        where: { userId },
        include: {
          post: {
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
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      const total = await prisma.like.count({ where: { userId } });

      const transformedPosts = likes.map(like => ({
        ...like.post,
        commentsCount: like.post._count.comments,
        likesCount: like.post._count.likes,
        likedAt: like.createdAt
      }));

      return {
        data: transformedPosts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Batch like operations for analytics
  async getLikeAnalytics(postIds, timeRange = null) {
    try {
      const where = { postId: { in: postIds } };
      
      if (timeRange) {
        where.createdAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const analytics = await prisma.like.groupBy({
        by: ['postId'],
        where,
        _count: true,
        _max: {
          createdAt: true
        },
        _min: {
          createdAt: true
        }
      });

      return analytics.map(group => ({
        postId: group.postId,
        totalLikes: group._count,
        firstLikeAt: group._min.createdAt,
        lastLikeAt: group._max.createdAt
      }));
    } catch (error) {
      throw error;
    }
  }

  // Legacy exports for backward compatibility
  findPostLike = ({ postId, userId }) =>
    prisma.like.findFirst({
      where: { postId, userId },
    });

  createLikeLegacy = ({ postId, userId }) =>
    prisma.like.create({
      data: { postId, userId },
    });

  deleteLike = (likeId) =>
    prisma.like.delete({
      where: { id: likeId },
    });
}

export default new LikeRepository();
