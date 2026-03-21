import BaseService from '../base/BaseService.js';
import likeRepository from '../repositories/like.repo.js';
import { ErrorFactory } from '../errors/index.js';
import eventBus from '../core/events/eventBus.js';
import EVENT_TYPES from '../core/events/eventTypes.js';
import databaseService from '../config/database.js';
import getPrisma from '../config/prisma.js';
import socketService from '../config/socket.js';

class LikeService extends BaseService {
  constructor() {
    super(likeRepository);
  }

  // Like post (idempotent) - Transaction safe using raw SQL
  async likePost(postId, userId) {
    try {
      if (!postId || !userId) {
        throw new Error('Post ID and User ID are required');
      }

      // Use transaction to prevent race conditions
      const result = await databaseService.transaction(async (tx) => {
        // Check if post exists and is accessible
        const post = await tx.post.findUnique({
          where: { id: postId },
          select: { id: true, authorId: true, title: true }
        });

        if (!post) {
          throw ErrorFactory.notFound('Post');
        }

        // Raw SQL insert with ON CONFLICT DO NOTHING for idempotency
        const likeResult = await tx.$executeRawUnsafe(
          `INSERT INTO likes ("postId", "userId") 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING
           RETURNING id`,
          postId, userId
        );

        const wasLiked = likeResult.length > 0;

        return { liked: wasLiked, post, postAuthorId: post.authorId, postTitle: post.title };
      }, {
        timeout: 3000,
        isolationLevel: 'ReadCommitted'
      });
      
      // Emit event only if actually liked (outside transaction)
      if (result.liked && EVENT_TYPES?.POST_LIKED) {
        eventBus.emit(EVENT_TYPES.POST_LIKED, {
          postId,
          userId,
          postAuthorId: result.post.authorId
        });
      }

      // Emit real-time socket events
      if (result.liked) {
        socketService.emitToPost(postId, 'new_like', {
          postId,
          userId,
          postAuthorId: result.post.authorId,
          postTitle: result.postTitle
        });

        // Emit notification to post author if it's not their own like
        if (result.post.authorId !== userId) {
          socketService.emitToUser(result.post.authorId, 'new_notification', {
            type: 'like',
            message: `Someone liked your post`,
            data: {
              postId,
              likerId: userId,
              postTitle: result.postTitle
            }
          });
        }
      }

      return result;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('likePost', error);
    }
  }

  // Unlike post (idempotent) - Transaction safe using raw SQL
  async unlikePost(postId, userId) {
    try {
      if (!postId || !userId) {
        throw new Error('Post ID and User ID are required');
      }

      // Use transaction to prevent race conditions
      const result = await databaseService.transaction(async (tx) => {
        // Check if post exists
        const post = await tx.post.findUnique({
          where: { id: postId },
          select: { id: true, authorId: true }
        });

        if (!post) {
          throw ErrorFactory.notFound('Post');
        }

        // Raw SQL delete
        const deleteResult = await tx.$executeRawUnsafe(
          `DELETE FROM likes 
           WHERE "postId" = $1 AND "userId" = $2`,
          postId, userId
        );

        const wasUnliked = deleteResult > 0;

        return { unliked: wasUnliked, post };
      }, {
        timeout: 3000,
        isolationLevel: 'ReadCommitted'
      });
      
      // Emit event only if actually unliked (outside transaction)
      if (result.unliked && EVENT_TYPES?.POST_UNLIKED) {
        eventBus.emit(EVENT_TYPES.POST_UNLIKED, {
          postId,
          userId,
          postAuthorId: result.post?.authorId
        });
      }

      // Emit real-time socket events
      if (result.unliked) {
        socketService.emitToPost(postId, 'post_unliked', {
          postId,
          userId,
          postAuthorId: result.post?.authorId
        });
      }

      return result;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('unlikePost', error);
    }
  }

  // Toggle like status (like/unlike in one operation) - simplified
  async toggleLike(postId, userId) {
    try {
      if (!postId || !userId) {
        throw new Error('Post ID and User ID are required');
      }

      // Check if currently liked using raw SQL
      const existingLike = await getPrisma().$queryRawUnsafe(
        `SELECT id FROM likes WHERE "postId" = $1 AND "userId" = $2`,
        postId, userId
      );
      
      const isCurrentlyLiked = existingLike.length > 0;
      
      if (isCurrentlyLiked) {
        const result = await this.unlikePost(postId, userId);
        return { ...result, action: 'unliked' };
      } else {
        const result = await this.likePost(postId, userId);
        return { ...result, action: 'liked' };
      }
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('toggleLike', error);
    }
  }

  // Get like status for multiple posts using raw SQL
  async getLikeStatuses(postIds, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const placeholders = postIds.map((_, i) => `$${i + 2}`).join(',');
      const query = `
        SELECT postId, COUNT(*) > 0 as liked
        FROM likes 
        WHERE "userId" = $1 AND postId IN (${placeholders})
        GROUP BY postId
      `;

      const results = await getPrisma().$queryRawUnsafe(query, userId, ...postIds);
      
      return results.reduce((acc, row) => {
        acc[row.postid] = row.liked;
        return acc;
      }, {});
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getLikeStatuses', error);
    }
  }

  // Get like count for post using raw SQL
  async getLikeCount(postId) {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }

      const result = await getPrisma().$queryRawUnsafe(`
        SELECT COUNT(*) as count 
        FROM likes 
        WHERE "postId" = $1
      `, postId);

      return parseInt(result[0].count);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getLikeCount', error);
    }
  }

  // Get users who liked a post
  async getPostLikers(postId, options = {}) {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }

      const { page = 1, limit = 20 } = options;
      
      return await likeRepository.getPostLikers(postId, { page, limit });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getPostLikers', error);
    }
  }

  // Get user's liked posts
  async getUserLikedPosts(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { page = 1, limit = 20 } = options;
      
      return await likeRepository.getUserLikedPosts(userId, { page, limit });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getUserLikedPosts', error);
    }
  }

  // Get like analytics for posts
  async getLikeAnalytics(postIds, timeRange = null) {
    try {
      if (!Array.isArray(postIds) || postIds.length === 0) {
        throw new Error('Post IDs array is required');
      }

      // Use raw SQL for analytics
      const timeCondition = timeRange 
        ? `AND createdAt BETWEEN $2 AND $3`
        : '';
      
      const query = `
        SELECT 
          postId,
          COUNT(*) as likeCount,
          DATE_TRUNC('day', createdAt) as date
        FROM likes 
        WHERE postId IN (${postIds.map((_, i) => `$${i + 4}`).join(',')})
          ${timeCondition}
        GROUP BY postId, DATE_TRUNC('day', createdAt)
        ORDER BY date DESC
      `;

      const params = timeRange 
        ? [query, ...postIds, timeRange.start, timeRange.end]
        : [query, ...postIds];

      return await getPrisma().$queryRawUnsafe(...params);
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getLikeAnalytics', error);
    }
  }

  // Get user's like statistics using raw SQL
  async getUserLikeStats(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const stats = await getPrisma().$queryRawUnsafe(`
        SELECT 
          COUNT(*) as totalLikes,
          COUNT(DISTINCT postId) as totalLikedPosts
        FROM likes 
        WHERE "userId" = $1
      `, userId);

      const mostLikedPost = await getPrisma().$queryRawUnsafe(`
        SELECT 
          p.id,
          p.title,
          p."likesCount"
        FROM likes l
        JOIN posts p ON l."postId" = p.id
        WHERE l."userId" = $1
        ORDER BY p."likesCount" DESC
        LIMIT 1
      `, userId);

      return {
        userId,
        totalLikes: parseInt(stats[0].totalLikes),
        totalLikedPosts: parseInt(stats[0].totalLikedPosts),
        mostLikedPost: mostLikedPost.length > 0 ? mostLikedPost[0] : null
      };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getUserLikeStats', error);
    }
  }

  // Batch like operations using raw SQL
  async batchLikePosts(postIds, userId) {
    try {
      if (!Array.isArray(postIds) || postIds.length === 0) {
        throw new Error('Post IDs array is required');
      }

      if (postIds.length > 10) {
        throw new Error('Cannot like more than 10 posts at once');
      }

      const results = await Promise.all(
        postIds.map(postId => this.toggleLike(postId, userId))
      );

      const successfulLikes = results.filter(result => result.action === 'liked');
      const totalLiked = successfulLikes.length;

      return {
        totalLiked,
        alreadyLiked: postIds.length - totalLiked,
        results: results.reduce((acc, result) => {
          acc[result.postId] = result.action === 'liked';
          return acc;
        }, {})
      };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('batchLikePosts', error);
    }
  }
}

export default new LikeService();
