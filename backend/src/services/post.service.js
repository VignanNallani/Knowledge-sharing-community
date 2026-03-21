import BaseService from '../base/BaseService.js';
import postRepository from '../repositories/post.repo.js';
import { ErrorFactory } from '../errors/index.js';
import { logActivity } from './activityService.js';
import getPrisma from '../config/prisma.js';
import { cacheService } from '../cache/cache.service.js';
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache.keys.js';
import { logger } from '../config/index.js';
import databaseService from '../config/database.js';

const prisma = getPrisma();
const { ActivityType } = prisma;

class PostService extends BaseService {
  constructor() {
    super(postRepository);
  }

  // Create post with validation and cache invalidation - Transaction safe
  async createPost(data, authorId, idempotencyKey = null) {
    try {
      // Validate required fields
      this.validateRequired(data, ['title', 'content']);
      
      // Sanitize input
      const sanitizedData = this.sanitizeData(data, ['title', 'content', 'imageUrl']);

      // Use transaction for atomic post creation with idempotency
      const post = await databaseService.transaction(async (tx) => {
        // Verify user exists and is active
        const user = await tx.user.findUnique({
          where: { id: authorId },
          select: { id: true, isActive: true }
        });

        if (!user || !user.isActive) {
          throw ErrorFactory.notFound('User not found or inactive');
        }

        // Check for idempotency key if provided
        if (idempotencyKey) {
          const existingPost = await tx.post.findUnique({
            where: { idempotencyKey }
          });
          
          if (existingPost) {
            return existingPost; // Return existing post for idempotency
          }
        }

        // Create post atomically with idempotency key
        return await tx.post.create({
          data: {
            ...sanitizedData,
            authorId,
            idempotencyKey
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
            }
          }
        });
      }, {
        timeout: 5000,
        isolationLevel: 'ReadCommitted'
      });
      
      // Invalidate cache and log activity outside transaction
      await this.invalidatePostsCache();
      
      await logActivity({
        type: 'POST_CREATED',
        message: `created a post "${post.title}"`,
        userId: authorId,
        entity: 'POST',
        entityId: post.id,
      });
      
      return post;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('createPost', error);
    }
  }

  // Update post with cache invalidation
  async updatePost(id, data, userId, userRole) {
    try {
      // Validate required fields
      this.validateRequired(data, []);
      
      // Sanitize input
      const sanitizedData = this.sanitizeData(data, ['title', 'content', 'imageUrl']);
      
      const post = await postRepository.updatePost(id, sanitizedData, userId, userRole);
      
      // Invalidate caches
      await this.invalidatePostCache(id);
      await this.invalidatePostsCache();
      
      return post;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('updatePost', error);
    }
  }

  // Delete post with cache invalidation
  async deletePost(id, userId, userRole) {
    try {
      await postRepository.deletePost(id, userId, userRole);
      
      // Invalidate caches
      await this.invalidatePostCache(id);
      await this.invalidatePostsCache();
      
      return true;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('deletePost', error);
    }
  }

  // Cache invalidation helpers
  async invalidatePostCache(postId) {
    try {
      // Invalidate specific post cache for all users
      await cacheService.delete(CACHE_KEYS.POST_DETAIL(postId));
      await cacheService.invalidatePattern(`post:*:${postId}*`);
      await cacheService.invalidatePattern(`*post:${postId}*`);
      logger.debug(`[CACHE INVALIDATE] post cache: ${postId}`);
    } catch (error) {
      logger.error('Failed to invalidate post cache:', error);
    }
  }

  async invalidatePostsCache() {
    try {
      // Invalidate all posts list caches
      await cacheService.invalidatePattern('posts:*');
      await cacheService.invalidatePattern('*posts*');
      logger.debug('[CACHE INVALIDATE] posts list cache');
    } catch (error) {
      logger.error('Failed to invalidate posts cache:', error);
    }
  }

  // Get single post with counts and caching
  async getPostById(id, userId = null) {
    const cacheKey = CACHE_KEYS.POST_DETAIL(id);
    
    try {
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`[CACHE HIT] ${cacheKey}`);
        return cached;
      }
      logger.debug(`[CACHE MISS] ${cacheKey}`);
      
      const post = await postRepository.findByIdWithCounts(id);
      
      if (!post) {
        throw ErrorFactory.notFound('Post');
      }
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, post, CACHE_TTL.MEDIUM);
      logger.debug(`[CACHE SET] ${cacheKey}`);
      
      return post;
    } catch (error) {
      if (error.name === 'ApiError' && error.statusCode === 404) {
        throw error;
      }
      throw ErrorFactory.databaseOperationFailed('getPostById', error);
    }
  }

  // Get paginated posts with caching
  async getPosts(pagination) {
    const cacheKey = CACHE_KEYS.POSTS_LIST(pagination.page);
    
    try {
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`[CACHE HIT] ${cacheKey}`);
        return cached;
      }
      logger.debug(`[CACHE MISS] ${cacheKey}`);
      
      // Cache miss - fetch from database
      const result = await postRepository.findPaginated(pagination);
      
      // Cache for 5 minutes
      await cacheService.set(cacheKey, result, CACHE_TTL.SHORT);
      logger.debug(`[CACHE SET] ${cacheKey}`);
      
      return result;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getPosts', error);
    }
  }

  // Search posts using PostgreSQL full-text search
  async searchPosts(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        throw ApiError.badRequest('Search query must be at least 2 characters');
      }
      
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      // Validate pagination parameters
      if (page < 1) throw ApiError.badRequest('Page must be greater than 0');
      if (limit < 1 || limit > 50) throw ApiError.badRequest('Search limit must be between 1 and 50');
      
      return await postRepository.searchPosts(query.trim(), { page, limit, sortBy, sortOrder });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('searchPosts', error);
    }
  }


  // Get posts by author
  async getPostsByAuthor(authorId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      
      // Validate pagination parameters
      if (page < 1) throw ApiError.badRequest('Page must be greater than 0');
      if (limit < 1 || limit > 100) throw ApiError.badRequest('Limit must be between 1 and 100');
      
      return await postRepository.findPostsByAuthor(authorId, { page, limit });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getPostsByAuthor', error);
    }
  }

  // Get posts with cursor pagination (for infinite scroll)
  async getPostsWithCursor(options = {}) {
    try {
      const { cursor = null, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      if (limit < 1 || limit > 50) throw ApiError.badRequest('Limit must be between 1 and 50');
      
      return await postRepository.findPaginated({ cursor, limit, sortBy, sortOrder });
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getPostsWithCursor', error);
    }
  }

  // Legacy methods for backward compatibility
  async likePost(postId, userId) {
    try {
      const post = await postRepository.findPostById(postId);
      if (!post) {
        throw ErrorFactory.notFound('Post');
      }

      const existingLike = await postRepository.findPostLike({ postId, userId });
      
      if (existingLike) {
        await postRepository.deleteLike(existingLike.id);
        // Note: POST_UNLIKED activity type doesn't exist in schema
        // Skipping activity logging for unlike action
        return { liked: false };
      }

      await postRepository.createLike({ postId, userId });
      await logActivity({
        type: ActivityType.POST_LIKED,
        message: `liked a post`,
        userId,
        entity: 'POST',
        entityId: post.id,
      });

      return { liked: true };
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('likePost', error);
    }
  }

  // Add comment to post
  async addComment(postId, content, authorId) {
    try {
      const post = await postRepository.findPostById(postId);
      if (!post) {
        throw ErrorFactory.notFound('Post');
      }

      const comment = await postRepository.createComment({
        postId,
        content,
        authorId
      });

      await logActivity({
        type: ActivityType.COMMENT_ADDED,
        message: `commented on a post`,
        userId: authorId,
        entity: 'POST',
        entityId: post.id,
      });

      return comment;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('addComment', error);
    }
  }

  // Get comments for a post
  async getCommentsByPostId(postId) {
    try {
      const post = await postRepository.findPostById(postId);
      if (!post) {
        throw ErrorFactory.notFound('Post');
      }

      const comments = await postRepository.findCommentsByPostId(postId);
      return comments;
    } catch (error) {
      throw ErrorFactory.databaseOperationFailed('getCommentsByPostId', error);
    }
  }
}

export default new PostService();
