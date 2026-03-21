import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import { logActivity } from './activityService.js';
import commentRepository from '../repositories/comment.repo.js';
import postRepository from '../repositories/post.repo.js';
import commentDto from '../dto/comment.dto.js';
import { ActivityType } from '@prisma/client';
import redisManager from '../config/redis.js';
import { logger } from '../config/index.js';
import databaseService from '../config/database.js';
import socketService from '../config/socket.js';

class CommentService {
  async invalidatePostCache(postId) {
    try {
      // Invalidate post cache entries
      const cacheKeys = [
        `post:${postId}`,
        `posts:page:*`,
        `comments:post:${postId}:*`
      ];
      
      for (const key of cacheKeys) {
        await redisManager.del(key);
      }
      
      logger.debug(`Cache invalidated for post ${postId}`);
    } catch (error) {
      logger.warn('Failed to invalidate cache:', error);
      // Don't fail the operation if cache invalidation fails
    }
  }
  async createComment(commentData, userId) {
    const { postId, content, parentCommentId } = commentData;

    if (!content?.trim()) {
      throw new ApiError(400, 'Comment content required');
    }

    // Atomic transaction to prevent race conditions
    const comment = await databaseService.transaction(async (tx) => {
      let finalPostId = postId;
      
      // If this is a reply, get postId from parent comment
      if (parentCommentId && !postId) {
        const parent = await tx.comment.findUnique({
          where: { id: parseInt(parentCommentId) },
          select: { id: true, postId: true }
        });

        if (!parent) {
          throw new ApiError(400, 'Invalid parent comment');
        }

        finalPostId = parent.postId;
      }

      // Verify post exists within transaction
      const post = await tx.post.findUnique({
        where: { id: parseInt(finalPostId) },
        select: { id: true, title: true, authorId: true }
      });

      if (!post) {
        throw new ApiError(404, 'Post not found');
      }

      // Validate parent comment if provided (separate from above check)
      if (parentCommentId && postId) {
        const parent = await tx.comment.findUnique({
          where: { id: parseInt(parentCommentId) },
          select: { id: true, postId: true }
        });

        if (!parent || parent.postId !== parseInt(postId)) {
          throw new ApiError(400, 'Invalid parent comment');
        }
      }

      // Create comment atomically
      return await tx.comment.create({
        data: {
          content,
          postId: parseInt(finalPostId),
          parentCommentId: parentCommentId ? parseInt(parentCommentId) : null,
          authorId: userId,
        },
        include: { 
          author: {
            select: {
              id: true,
              name: true,
              role: true,
              profileImageUrl: true
            }
          }
        },
      });
    }, {
      timeout: 5000,
      isolationLevel: 'Serializable'
    });

    // Invalidate cache and log activity outside transaction
    await this.invalidatePostCache(parseInt(postId));

    await logActivity({
      type: ActivityType.COMMENT_ADDED,
      message: `commented on a post`,
      userId,
      metadata: {
        commentId: comment.id,
        postId: finalPostId,
        isReply: !!parentCommentId
      }
    });

    // Emit real-time events
    const newCommentData = commentDto.detail(comment);
    
    // Emit to post room for real-time updates
    socketService.emitToPost(finalPostId, 'new_comment', {
      comment: newCommentData,
      postId: finalPostId,
      authorId: userId,
      isReply: !!parentCommentId
    });

    // Emit notification to post author if it's not their own comment
    if (post.authorId !== userId) {
      socketService.emitToUser(post.authorId, 'new_notification', {
        type: 'comment',
        message: `${comment.author.name} commented on your post`,
        data: {
          commentId: comment.id,
          postId: finalPostId,
          commentContent: comment.content,
          authorName: comment.author.name
        }
      });
    }

    return commentDto.create(comment, post.authorId, post.title);
  }

  async getComments(postId, query, userId = null) {
    const { skip, limit, page } = paginate(query);

    const comments = await commentRepository.findComments({
      where: { postId: parseInt(postId), parentCommentId: null },
      skip,
      take: limit,
      include: {
        author: { 
            select: { 
              id: true, 
              name: true, 
              role: true, 
              profileImageUrl: true 
            } 
          },
        commentLikes: { select: { userId: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { 
            select: { 
              id: true, 
              name: true, 
              role: true, 
              profileImageUrl: true 
            } 
          },
            commentLikes: { select: { userId: true } },
          },
        },
      },
    });

    const totalComments = await commentRepository.countComments({
      postId: parseInt(postId),
      parentCommentId: null,
    });

    return {
      comments: comments.map(comment => commentDto.detail(comment, userId)),
      meta: { page, limit, totalComments, totalPages: Math.ceil(totalComments / limit) },
    };
  }

  async likeComment(commentId, userId) {
    const comment = await commentRepository.findCommentById(commentId);
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    const existingLike = await commentRepository.findCommentLike({ commentId, userId });
    
    if (existingLike) {
      await commentRepository.deleteCommentLike(existingLike.id);
      
      // Emit real-time events
      socketService.emitToPost(comment.postId, 'comment_unliked', {
        commentId,
        postId: comment.postId,
        userId,
        likeCount: comment.commentLikes.length - 1
      });
      
      return { liked: false };
    }

    await commentRepository.createCommentLike({ commentId, userId });
    
    // Emit real-time events
    socketService.emitToPost(comment.postId, 'comment_liked', {
      commentId,
      postId: comment.postId,
      userId,
      likeCount: comment.commentLikes.length + 1
    });

    // Emit notification to comment author if it's not their own like
    if (comment.authorId !== userId) {
      socketService.emitToUser(comment.authorId, 'new_notification', {
        type: 'like',
        message: `Someone liked your comment`,
        data: {
          commentId,
          postId: comment.postId,
          likerId: userId
        }
      });
    }

    return { liked: true };
  }

  async deleteComment(commentId, userId, userRole) {
    const comment = await commentRepository.findCommentById(parseInt(commentId));
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    await commentRepository.deleteComment(parseInt(commentId));

    // Invalidate post cache when comment is deleted
    await this.invalidatePostCache(comment.postId);

    // Emit real-time events
    socketService.emitToPost(comment.postId, 'comment_deleted', {
      commentId: parseInt(commentId),
      postId: comment.postId,
      authorId: comment.authorId
    });

    return { message: 'Comment deleted successfully' };
  }

  async updateComment(commentId, content, userId, userRole) {
    if (!content?.trim()) {
      throw new ApiError(400, 'Comment content required');
    }

    const comment = await commentRepository.findCommentById(parseInt(commentId));
    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to update this comment');
    }

    const updatedComment = await commentRepository.updateComment(parseInt(commentId), { content });

    // Invalidate post cache when comment is updated
    await this.invalidatePostCache(comment.postId);

    return commentDto.single(updatedComment);
  }

  async getReplies(parentCommentId, query, userId = null) {
    const { skip, limit, page } = paginate(query);

    const replies = await commentRepository.findComments({
      where: { parentCommentId: parseInt(parentCommentId) },
      skip,
      take: limit,
      include: {
        author: { 
            select: { 
              id: true, 
              name: true, 
              role: true, 
              profileImageUrl: true 
            } 
          },
        commentLikes: { select: { userId: true } },
      },
    });

    const totalReplies = await commentRepository.countComments({
      parentCommentId: parseInt(parentCommentId),
    });

    return {
      replies: replies.map(reply => commentDto.detail(reply, userId)),
      meta: { page, limit, totalReplies, totalPages: Math.ceil(totalReplies / limit) },
    };
  }
}

export default new CommentService();
