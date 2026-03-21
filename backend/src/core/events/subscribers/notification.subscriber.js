import eventBus from '../eventBus.js';
import EVENT_TYPES from '../eventTypes.js';
import { logger } from '../../../config/index.js';

class NotificationSubscriber {
  constructor() {
    this.name = 'NotificationSubscriber';
    this.initialized = false;
  }

  /**
   * Initialize the subscriber and register event listeners
   */
  async initialize() {
    try {
      if (this.initialized) {
        logger.warn('NotificationSubscriber already initialized');
        return;
      }

      // Register event listeners
      this.unsubscribeFunctions = [
        eventBus.on(EVENT_TYPES.POST_LIKED, this.handlePostLiked.bind(this)),
        eventBus.on(EVENT_TYPES.POST_COMMENTED, this.handlePostCommented.bind(this)),
        eventBus.on(EVENT_TYPES.USER_FOLLOWED, this.handleUserFollowed.bind(this))
      ];

      this.initialized = true;
      logger.info('NotificationSubscriber initialized successfully');
    } catch (error) {
      logger.error('NotificationSubscriber initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handle post liked event
   */
  async handlePostLiked(payload) {
    try {
      const { postId, userId, _metadata } = payload;
      
      // Import NotificationService dynamically to avoid circular dependencies
      const { default: notificationService } = await import('../../services/notification.service.js');
      
      // Get post details to create notification
      const { default: postService } = await import('../../services/post.service.js');
      const post = await postService.findById(postId);
      
      if (!post) {
        logger.warn('Post not found for notification', { postId });
        return;
      }

      // Don't send notification to user who liked their own post
      if (post.authorId === userId) {
        return;
      }

      // Create notification for post author
      await notificationService.createNotification({
        userId: post.authorId,
        actorId: userId,
        type: 'LIKE',
        entityId: postId,
        entityType: 'POST',
        message: `liked your post "${post.title}"`,
        metadata: {
          postId,
          postTitle: post.title,
          actorId: userId,
          eventId: _metadata.eventId
        }
      });

      logger.info('Post like notification created', {
        postId,
        postAuthorId: post.authorId,
        actorId: userId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('NotificationSubscriber: Error handling post liked', {
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
      
      // Import services dynamically
      const { default: notificationService } = await import('../../services/notification.service.js');
      const { default: postService } = await import('../../services/post.service.js');
      
      // Get post details
      const post = await postService.findById(postId);
      
      if (!post) {
        logger.warn('Post not found for comment notification', { postId });
        return;
      }

      // Don't send notification to user who commented on their own post
      if (post.authorId === userId) {
        return;
      }

      // Create notification for post author
      await notificationService.createNotification({
        userId: post.authorId,
        actorId: userId,
        type: 'COMMENT',
        entityId: postId,
        entityType: 'POST',
        message: `commented on your post "${post.title}"`,
        metadata: {
          postId,
          postTitle: post.title,
          commentId,
          commentContent: content?.substring(0, 100) || '',
          actorId: userId,
          eventId: _metadata.eventId
        }
      });

      logger.info('Post comment notification created', {
        postId,
        postAuthorId: post.authorId,
        actorId: userId,
        commentId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('NotificationSubscriber: Error handling post commented', {
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
      
      // Import NotificationService dynamically
      const { default: notificationService } = await import('../../services/notification.service.js');
      
      // Create notification for user being followed
      await notificationService.createNotification({
        userId: followingId,
        actorId: followerId,
        type: 'FOLLOW',
        entityId: followingId,
        entityType: 'USER',
        message: 'started following you',
        metadata: {
          followerId,
          followingId,
          eventId: _metadata.eventId
        }
      });

      logger.info('User follow notification created', {
        followerId,
        followingId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('NotificationSubscriber: Error handling user followed', {
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
            logger.error('NotificationSubscriber: Error unsubscribing from event', {
              error: error.message
            });
          }
        });
      }

      this.initialized = false;
      logger.info('NotificationSubscriber shutdown successfully');
    } catch (error) {
      logger.error('NotificationSubscriber: Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Create and export singleton instance
const notificationSubscriber = new NotificationSubscriber();

// Don't auto-initialize at import time
// notificationSubscriber.initialize().catch(error => {
//   logger.error('NotificationSubscriber: Auto-initialization failed', {
//     error: error.message,
//     stack: error.stack
//   });
// });

export default notificationSubscriber;
