import eventBus from '../eventBus.js';
import EVENT_TYPES from '../eventTypes.js';
import { logger } from '../../../config/index.js';

class ActivitySubscriber {
  constructor() {
    this.name = 'ActivitySubscriber';
    this.initialized = false;
  }

  /**
   * Initialize the subscriber and register event listeners
   */
  async initialize() {
    try {
      if (this.initialized) {
        logger.warn('ActivitySubscriber already initialized');
        return;
      }

      // Register event listeners
      this.unsubscribeFunctions = [
        eventBus.on(EVENT_TYPES.POST_CREATED, this.handlePostCreated.bind(this)),
        eventBus.on(EVENT_TYPES.POST_LIKED, this.handlePostLiked.bind(this)),
        eventBus.on(EVENT_TYPES.POST_COMMENTED, this.handlePostCommented.bind(this)),
        eventBus.on(EVENT_TYPES.USER_FOLLOWED, this.handleUserFollowed.bind(this))
      ];

      this.initialized = true;
      logger.info('ActivitySubscriber initialized successfully');
    } catch (error) {
      logger.error('ActivitySubscriber initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle post created event
   */
  async handlePostCreated(payload) {
    try {
      const { postId, userId, title, _metadata } = payload;
      
      // Import ActivityService dynamically to avoid circular dependencies
      const { default: activityService } = await import('../../services/activityService.js');
      
      // Create activity log
      await activityService.logActivity({
        type: 'POST_CREATED',
        message: `created a post "${title}"`,
        userId,
        entity: 'POST',
        entityId: postId,
        metadata: {
          postId,
          postTitle: title,
          eventId: _metadata.eventId
        }
      });

      logger.info('Post created activity logged', {
        postId,
        userId,
        title,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('ActivitySubscriber: Error handling post created', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Handle post liked event
   */
  async handlePostLiked(payload) {
    try {
      const { postId, userId, _metadata } = payload;
      
      // Import ActivityService dynamically
      const { default: activityService } = await import('../../services/activityService.js');
      
      // Get post details for activity log
      const { default: postService } = await import('../../services/post.service.js');
      const post = await postService.findById(postId);
      
      if (!post) {
        logger.warn('Post not found for activity logging', { postId });
        return;
      }

      // Create activity log
      await activityService.logActivity({
        type: 'POST_LIKED',
        message: `liked a post "${post.title}"`,
        userId,
        entity: 'POST',
        entityId: postId,
        metadata: {
          postId,
          postTitle: post.title,
          postAuthorId: post.authorId,
          eventId: _metadata.eventId
        }
      });

      logger.info('Post liked activity logged', {
        postId,
        userId,
        postTitle: post.title,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('ActivitySubscriber: Error handling post liked', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Handle post commented event
   */
  async handlePostCommented(payload) {
    try {
      const { postId, commentId, userId, content, _metadata } = payload;
      
      // Import ActivityService dynamically
      const { default: activityService } = await import('../../services/activityService.js');
      
      // Get post details for activity log
      const { default: postService } = await import('../../services/post.service.js');
      const post = await postService.findById(postId);
      
      if (!post) {
        logger.warn('Post not found for comment activity logging', { postId });
        return;
      }

      // Create activity log
      await activityService.logActivity({
        type: 'POST_COMMENTED',
        message: `commented on "${post.title}"`,
        userId,
        entity: 'COMMENT',
        entityId: commentId,
        metadata: {
          postId,
          postTitle: post.title,
          commentId,
          commentContent: content?.substring(0, 100) || '',
          postAuthorId: post.authorId,
          eventId: _metadata.eventId
        }
      });

      logger.info('Post commented activity logged', {
        postId,
        commentId,
        userId,
        postTitle: post.title,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('ActivitySubscriber: Error handling post commented', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Handle user followed event
   */
  async handleUserFollowed(payload) {
    try {
      const { followerId, followingId, _metadata } = payload;
      
      // Import ActivityService dynamically
      const { default: activityService } = await import('../../services/activityService.js');
      
      // Get user details for activity log
      const { default: userRepository } = await import('../../repositories/user.repo.js');
      const followingUser = await userRepository.findUserById(followingId, { 
        select: { id: true, name: true } 
      });
      
      if (!followingUser) {
        logger.warn('Following user not found for activity logging', { followerId });
        return;
      }

      // Create activity log
      await activityService.logActivity({
        type: 'USER_FOLLOWED',
        message: `started following user`,
        userId: followerId,
        entity: 'USER',
        entityId: followingId,
        metadata: {
          followerId,
          followingId,
          followingUserName: followingUser.name,
          eventId: _metadata.eventId
        }
      });

      logger.info('User followed activity logged', {
        followerId,
        followingId,
        followingUserName: followingUser.name,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('ActivitySubscriber: Error handling user followed', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Sanitize payload for logging
   */
  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const { _metadata, ...sanitized } = payload;
    return sanitized;
  }

  /**
   * Shutdown the subscriber and clean up event listeners
   */
  async shutdown() {
    try {
      if (!this.initialized) {
        return;
      }

      // Unsubscribe from all events
      if (this.unsubscribeFunctions) {
        this.unsubscribeFunctions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (error) {
            logger.error('ActivitySubscriber: Error unsubscribing from event', {
              error: error.message
            });
          }
        });
      }

      this.initialized = false;
      logger.info('ActivitySubscriber shutdown successfully');
    } catch (error) {
      logger.error('ActivitySubscriber: Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Create and export singleton instance
const activitySubscriber = new ActivitySubscriber();

// Don't auto-initialize at import time
// activitySubscriber.initialize().catch(error => {
//   logger.error('ActivitySubscriber: Auto-initialization failed', {
//     error: error.message,
//     stack: error.stack
//   });
// });

export default activitySubscriber;
