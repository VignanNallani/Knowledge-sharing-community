import BaseRepository from '../base/BaseRepository.js';
import { ErrorFactory } from '../errors/index.js';
import getPrisma from '../config/prisma.js';
import { PaginationUtility } from '../utils/pagination.js';
import { PerformanceMonitor } from '../utils/performanceMonitor.js';
import { logger } from '../config/index.js';

const prisma = getPrisma();

class PostRepository extends BaseRepository {
  constructor() {
    super(prisma.post, 'Post');
  }

  // Get single post with counts
  async findByIdWithCounts(id) {
    try {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        }
      });

      if (!post) return null;

      return {
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        _count: undefined
      };
    } catch (error) {
      throw error;
    }
  }

  // Get paginated posts with cursor-based pagination (for infinite scroll)
  async findPaginated(options = {}) {
    const endTimer = PerformanceMonitor.startTimer('posts.findPaginated', options);
    
    try {
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        cursor = null,
        authorId = null,
        includeUnpublished = false
      } = options;

      // Validate and normalize pagination parameters
      const pagination = PaginationUtility.validateAndNormalize({
        page, limit, sortBy, sortOrder, cursor, maxLimit: 50
      });

      // Build where clause with optimizations
      const where = {};
      if (authorId) {
        where.authorId = authorId;
      }
      
      // Add soft delete filter
      where.deletedAt = null;
      
      // Composite cursor-based pagination for determinism
      if (cursor) {
        const cursorParts = cursor.split('_');
        const cursorCreatedAt = new Date(cursorParts[0]);
        const cursorId = parseInt(cursorParts[1]);
        
        where.OR = [
          {
            createdAt: { lt: cursorCreatedAt }
          },
          {
            createdAt: cursorCreatedAt,
            id: { lt: cursorId }
          }
        ];
      }

      // Create optimized query with selective includes
      const query = {
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
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
          { [sortBy]: sortOrder },
          { id: sortOrder } // Composite ordering for determinism
        ],
        take: pagination.limit + 1 // Fetch one extra to determine if there are more
      };

      // Analyze query complexity
      const complexity = PaginationUtility.analyzeComplexity(pagination, query);
      if (complexity.complexity === 'high') {
        logger.warn('Complex query detected', { operation: 'posts.findPaginated', ...complexity });
      }

      // Execute query
      const posts = await prisma.post.findMany(query);

      // Determine if there are more posts
      const hasMore = posts.length > pagination.limit;
      if (hasMore) {
        posts.pop(); // Remove the extra post
      }

      const postsWithCounts = posts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        _count: undefined
      }));

      // Create composite cursor-based pagination metadata
      const lastPost = postsWithCounts[postsWithCounts.length - 1];
      const nextCursor = hasMore ? `${lastPost.createdAt.toISOString()}_${lastPost.id}` : null;

      const paginationMetadata = {
        hasMore,
        nextCursor,
        limit: pagination.limit
      };

      const result = {
        data: postsWithCounts,
        pagination: paginationMetadata,
        performance: {
          complexity: complexity.complexity,
          recommendations: complexity.recommendations
        }
      };

      endTimer(result);
      return result;
    } catch (error) {
      endTimer(null, error);
      throw error;
    }
  }

  // Full-text search using PostgreSQL
  async searchPosts(query, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const orderBy = { [sortBy]: sortOrder };

      // PostgreSQL full-text search
      const posts = await prisma.post.findMany({
        where: {
          OR: [
            {
              title: {
                search: query
              }
            },
            {
              content: {
                search: query
              }
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
            }
          },
          _count: {
            select: {
              comments: true,
              likes: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      });

      const postsWithCounts = posts.map(post => ({
        ...post,
        commentsCount: post._count.comments,
        likesCount: post._count.likes,
        _count: undefined
      }));

      // Get total count for search results
      const total = await prisma.post.count({
        where: {
          OR: [
            {
              title: {
                search: query
              }
            },
            {
              content: {
                search: query
              }
            }
          ]
        }
      });

      return {
        data: postsWithCounts,
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

  // Check if user can modify post
  async canUserModify(postId, userId, userRole) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true }
      });

      if (!post) return false;

      return post.authorId === userId || userRole === 'ADMIN';
    } catch (error) {
      throw error;
    }
  }

  // Legacy exports for backward compatibility
  findPostById = (postId, options = {}) =>
    prisma.post.findUnique({
      where: { id: postId },
      ...options,
    });

  findApprovedPosts = (options = {}) =>
    prisma.post.findMany({
      where: { status: "APPROVED" },
      ...options,
    });

  countApprovedPosts = () =>
    prisma.post.count({ where: { status: "APPROVED" } });

  createPost = (data, authorId) => {
    try {
      return prisma.post.create({
        data: {
          ...data,
          authorId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
            }
          }
        }
      });
    } catch (error) {
      throw error;
    }
  };

  updatePost = async (postId, data, userId, userRole) => {
    try {
      // First check ownership and get current version
      const currentPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true, version: true }
      });

      if (!currentPost) {
        throw ErrorFactory.notFound('Post');
      }

      const canModify = currentPost.authorId === userId || userRole === 'ADMIN';
      if (!canModify) {
        throw ErrorFactory.accessDenied('Unauthorized to modify this post');
      }

      // Optimistic concurrency update with version check
      const updatedPost = await prisma.post.update({
        where: { 
          id: postId,
          version: currentPost.version // Ensure we're updating the expected version
        },
        data: {
          ...data,
          version: { increment: 1 } // Increment version atomically
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              profileImageUrl: true
            }
          }
        }
      });

      return updatedPost;
    } catch (error) {
      if (error.code === 'P2025') { // Prisma error for record not found (version mismatch)
        throw ErrorFactory.conflict('Post was modified by another user. Please refresh and try again.');
      }
      throw error;
    }
  };

  deletePost = async (postId, userId, userRole) => {
    try {
      // Ownership enforcement at query level with soft delete
      let updateResult;
      
      if (userRole === 'ADMIN') {
        // Admin can soft delete any post
        updateResult = await prisma.post.updateMany({
          where: { 
            id: postId,
            deletedAt: null // Only soft delete if not already deleted
          },
          data: { deletedAt: new Date() }
        });
      } else {
        // Non-admin can only soft delete their own posts
        updateResult = await prisma.post.updateMany({
          where: { 
            id: postId,
            authorId: userId,
            deletedAt: null
          },
          data: { deletedAt: new Date() }
        });
      }

      if (updateResult.count === 0) {
        throw ErrorFactory.accessDenied('Unauthorized to delete this post or post not found');
      }

      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw ErrorFactory.notFound('Post');
      }
      throw error;
    }
  };

  findPostLike = ({ postId, userId }) =>
    prisma.like.findFirst({
      where: { postId, userId },
    });

  createLike = ({ postId, userId }) =>
    prisma.like.create({
      data: { postId, userId },
    });

  deleteLike = (likeId) =>
    prisma.like.delete({
      where: { id: likeId },
    });

  upsertTags = (tags) =>
    Promise.all(
      tags.map((tag) =>
        prisma.tag.upsert({
          where: { name: tag.toLowerCase() },
          update: {},
          create: { name: tag.toLowerCase() },
        })
      )
    );

  countPosts = (where = {}) =>
    prisma.post.count({ where });

  findPostsByAuthor = (authorId, options = {}) =>
    this.findPaginated({ ...options, authorId });

  searchPostsLegacy = ({ where, skip, take, include }) =>
    prisma.post.findMany({
      where,
      skip,
      take,
      include,
      orderBy: { createdAt: "desc" },
    });

  createComment = (data) =>
    prisma.comment.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImageUrl: true
          }
        }
      }
    });

  findCommentsByPostId = (postId) =>
    prisma.comment.findMany({
      where: { postId },
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
      orderBy: { createdAt: 'asc' }
    });
}

export default new PostRepository();
