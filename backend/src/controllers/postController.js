
import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import postService from '../services/post.service.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';
import getPrisma from '../config/prisma.js';

class PostController extends BaseController {
  // Create post
  static create = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, content } = req.body;
    
    // Handle uploaded image
    const imageUrl = req.file ? req.file.path : null; // Cloudinary URL from multer-storage-cloudinary
    
    // Simple validation
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and content are required' 
      });
    }
    
    const postData = {
      title: title.trim(),
      content: content.trim(),
      ...(imageUrl && { imageUrl }) // Only include imageUrl if it exists
    };
    
    const post = await postService.createPost(postData, userId);
    logger.info('Post created:', { action: 'create_post', postId: post.id, hasImage: !!imageUrl });
    
    return Response.created(res, post, 'Post created successfully');
  });

  // Get single post with counts
  static getById = BaseController.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Simple ID validation
    const postId = parseInt(id);
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid post ID is required' 
      });
    }
    
    const post = await postService.getPostById(postId, userId);
    logger.info('Post retrieved:', { action: 'get_post', postId: post.id });
    
    return Response.success(res, post, 'Post retrieved successfully');
  });

  // Add comment to post
  static addComment = BaseController.asyncHandler(async (req, res) => {
    console.log('REQ USER:', req.user);
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    // Validate content exists
    if (!content?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required' 
      });
    }
    
    // Create comment directly with Prisma
    const prisma = getPrisma();
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: parseInt(id),
        authorId: userId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImage: true
          }
        }
      }
    });
    
    logger.info('Comment added:', { action: 'add_comment', postId: parseInt(id), commentId: comment.id });
    
    return res.status(201).json({ 
      success: true, 
      data: { comment },
      message: 'Comment added successfully' 
    });
  });

  // Get comments for a post
  static getComments = BaseController.asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Get comments directly with Prisma
    const prisma = getPrisma();
    const comments = await prisma.comment.findMany({
      where: { postId: parseInt(id) },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    logger.info('Comments retrieved:', { action: 'get_comments', postId: parseInt(id), count: comments.length });
    
    return res.json({ 
      success: true, 
      data: { comments },
      message: 'Comments retrieved successfully' 
    });
  });

  // Search posts, users, or both
  static search = BaseController.asyncHandler(async (req, res) => {
    const { q, type = 'all' } = req.query;
    
    // Validate query
    if (!q || q.trim().length < 2) {
      return res.json({ 
        success: true, 
        data: { posts: [], users: [] } 
      });
    }
    
    const searchTerm = q.trim();
    const prisma = getPrisma();
    
    let posts = [];
    let users = [];
    
    // Search posts if requested
    if (type === 'all' || type === 'posts') {
      posts = await prisma.post.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } }
          ],
          deletedAt: null // Only show non-deleted posts
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
    }
    
    // Search users if requested
    if (type === 'all' || type === 'users') {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ],
          isActive: true // Only show active users
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profileImage: true
        },
        orderBy: { name: 'asc' },
        take: 10
      });
    }
    
    logger.info('Search performed:', { 
      action: 'search', 
      query: searchTerm, 
      type, 
      postsCount: posts.length, 
      usersCount: users.length 
    });
    
    return res.json({ 
      success: true, 
      data: { posts, users } 
    });
  });

  // Get paginated posts
  static getPosts = BaseController.asyncHandler(async (req, res) => {
    const { page, limit, skip, sortBy, sortOrder } = BaseController.getPaginationParams(req);
    
    const pagination = { page, limit, skip, sortBy, sortOrder };
    
    const result = await postService.getPosts(pagination);
    logger.info('Posts retrieved:', { action: 'get_posts', count: result.data.length });
    
    return Response.paginated(res, result.data, {
      page,
      limit,
      total: result.pagination?.total || 0,
      totalPages: Math.ceil((result.pagination?.total || 0) / limit),
      hasNext: page * limit < (result.pagination?.total || 0),
      hasPrev: page > 1
    });
  });

  // Search posts
  static searchPosts = BaseController.asyncHandler(async (req, res) => {
    const { q } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = BaseController.getPaginationParams(req);
    
    const pagination = { page, limit, skip, sortBy, sortOrder };
    
    if (!q) {
      return Response.badRequest(res, 'Search query is required');
    }
    
    const result = await postService.searchPosts(q, pagination);
    logger.info('Posts searched:', { action: 'search_posts', query: q, count: result.data.length });
    
    return Response.paginated(res, result.data, {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNext: page * limit < result.total,
      hasPrev: page > 1
    });
  });

  // Update post (only author or admin)
  static updatePost = BaseController.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validate inputs
    ValidationMiddleware.schemas.id.validate({ id: parseInt(id) });
    ValidationMiddleware.schemas.postUpdate.validate(req.body);
    
    const post = await postService.updatePost(parseInt(id), req.body, userId, userRole);
    logger.info('Post updated:', { action: 'update_post', postId: post.id });
    
    return Response.updated(res, post, 'Post updated successfully');
  });

  // Delete post (only author or admin)
  static deletePost = BaseController.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validate ID
    ValidationMiddleware.schemas.id.validate({ id: parseInt(id) });
    
    await postService.deletePost(parseInt(id), userId, userRole);
    logger.info('Post deleted:', { action: 'delete_post', postId: parseInt(id) });
    
    return Response.deleted(res, 'Post deleted successfully');
  });

  // Get posts by author
  static getPostsByAuthor = BaseController.asyncHandler(async (req, res) => {
    const { authorId } = req.params;
    const { page, limit, skip, sortBy, sortOrder } = BaseController.getPaginationParams(req);
    
    const pagination = { page, limit, skip, sortBy, sortOrder };
    
    // Validate author ID
    ValidationMiddleware.schemas.id.validate({ id: parseInt(authorId) });
    
    const result = await postService.getPostsByAuthor(parseInt(authorId), pagination);
    logger.info('Posts by author retrieved:', { action: 'get_posts_by_author', authorId: parseInt(authorId), count: result.data.length });
    
    return Response.paginated(res, result.data, {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNext: page * limit < result.total,
      hasPrev: page > 1
    });
  });

  // Get posts with cursor pagination (infinite scroll)
  static getPostsWithCursor = BaseController.asyncHandler(async (req, res) => {
    const { cursor } = req.query;
    const { limit = 20 } = req.query;
    
    const result = await postService.getPostsWithCursor({ 
      cursor: cursor ? parseInt(cursor) : null, 
      limit: parseInt(limit) 
    });
    
    logger.info('Posts with cursor retrieved:', { action: 'get_posts_cursor', cursor, count: result.data.length });
    
    return Response.success(res, {
      data: result.data,
      pagination: result.pagination,
      nextCursor: result.pagination.nextCursor
    });
  });

  // Like/unlike post
  static likePost = async (req, res) => {
    try {
      const postId = parseInt(req.params.id)
      const userId = req.user.id

      // Validate ID
      ValidationMiddleware.schemas.id.validate({ id: postId });
      
      // Check if post exists
      const post = await getPrisma().post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true }
      });

      if (!post) {
        return Response.notFound(res, 'Post');
      }

      // Check if already liked
      const existing = await getPrisma().$queryRawUnsafe(
        `SELECT id FROM likes 
           WHERE "postId" = $1 AND "userId" = $2`,
        postId, userId
      );

      if (existing.length > 0) {
        // Unlike
        await getPrisma().$executeRawUnsafe(
          `DELETE FROM likes 
             WHERE "postId" = $1 AND "userId" = $2`,
          postId, userId
        );
        
        logger.info('Post unliked:', { action: 'unlike_post', postId, userId });
        
        return res.json({ 
          success: true, 
          message: 'Post unliked',
          liked: false 
        });
      } else {
        // Like
        await getPrisma().$executeRawUnsafe(
          `INSERT INTO likes ("postId", "userId", "createdAt") 
             VALUES ($1, $2, NOW())`,
          postId, userId
        );
        
        logger.info('Post liked:', { action: 'like_post', postId, userId });
        
        return res.json({ 
          success: true, 
          message: 'Post liked',
          liked: true 
        });
      }
    } catch (error) {
      console.error('Like error:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

export default PostController;
