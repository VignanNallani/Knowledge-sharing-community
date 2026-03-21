import eventBus from '../eventBus.js';
import EVENT_TYPES from '../eventTypes.js';
import { logger } from '../../../config/index.js';

class FeedSubscriber {
  constructor() {
    this.name = 'FeedSubscriber';
    this.initialized = false;
    this.cacheInvalidationQueue = new Set();
  }

  /**
   * Initialize the subscriber and register event listeners
   */
  async initialize() {
    try {
      if (this.initialized) {
        logger.warn('FeedSubscriber already initialized');
        return;
      }

      // Register event listeners
      this.unsubscribeFunctions = [
        eventBus.on(EVENT_TYPES.POST_CREATED, this.handlePostCreated.bind(this)),
        eventBus.on(EVENT_TYPES.POST_DELETED, this.handlePostDeleted.bind(this)),
        eventBus.on(EVENT_TYPES.USER_FOLLOWED, this.handleUserFollowed.bind(this)),
        eventBus.on(EVENT_TYPES.USER_UNFOLLOWED, this.handleUserUnfollowed.bind(this))
      ];

      this.initialized = true;
      logger.info('FeedSubscriber initialized successfully');
    } catch (error) {
      logger.error('FeedSubscriber initialization failed', {
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
      const { postId, userId, authorId, _metadata } = payload;
      
      // Invalidate feed cache for all followers of the post author
      await this.invalidateFollowersFeed(authorId, 'POST_CREATED', {
        postId,
        authorId,
        eventId: _metadata.eventId
      });

      logger.info('Feed invalidated for post creation', {
        postId,
        authorId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error handling post created', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Handle post deleted event
   */
  async handlePostDeleted(payload) {
    try {
      const { postId, authorId, _metadata } = payload;
      
      // Invalidate feed cache for all followers of the post author
      await this.invalidateFollowersFeed(authorId, 'POST_DELETED', {
        postId,
        authorId,
        eventId: _metadata.eventId
      });

      logger.info('Feed invalidated for post deletion', {
        postId,
        authorId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error handling post deleted', {
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
      
      // Invalidate personalized feed for the follower
      await this.invalidateUserFeed(followerId, 'USER_FOLLOWED', {
        followerId,
        followingId,
        eventId: _metadata.eventId
      });

      logger.info('Feed invalidated for user follow', {
        followerId,
        followingId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error handling user followed', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Handle user unfollowed event
   */
  async handleUserUnfollowed(payload) {
    try {
      const { followerId, followingId, _metadata } = payload;
      
      // Invalidate personalized feed for the follower
      await this.invalidateUserFeed(followerId, 'USER_UNFOLLOWED', {
        followerId,
        followingId,
        eventId: _metadata.eventId
      });

      logger.info('Feed invalidated for user unfollow', {
        followerId,
        followingId,
        eventId: _metadata.eventId
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error handling user unfollowed', {
        error: error.message,
        stack: error.stack,
        payload: this.sanitizePayload(payload)
      });
      // Don't re-throw to prevent event system crash
    }
  }

  /**
   * Invalidate feed cache for all followers of a user
   */
  async invalidateFollowersFeed(userId, reason, metadata = {}) {
    try {
      // Import FollowService dynamically to avoid circular dependencies
      const { default: followService } = await import('../../services/follow.service.js');
      
      // Get all followers of the user
      const followersResult = await followService.getFollowers(userId, { page: 1, limit: 1000 });
      const followerIds = followersResult.data?.map(follower => follower.id) || [];

      // Invalidate cache for each follower
      for (const followerId of followerIds) {
        await this.invalidateUserFeed(followerId, reason, metadata);
      }

      logger.info('Feed cache invalidated for followers', {
        userId,
        followerCount: followerIds.length,
        reason,
        ...metadata
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error invalidating followers feed', {
        error: error.message,
        userId,
        reason,
        metadata
      });
    }
  }

  /**
   * Invalidate feed cache for a specific user
   */
  async invalidateUserFeed(userId, reason, metadata = {}) {
    try {
      // Add to invalidation queue (for batch processing)
      const cacheKey = `feed:user:${userId}`;
      this.cacheInvalidationQueue.add(cacheKey);

      // If cache system exists, invalidate it
      await this.performCacheInvalidation(cacheKey, reason, metadata);

      logger.debug('User feed cache invalidated', {
        userId,
        cacheKey,
        reason,
        ...metadata
      });
    } catch (error) {
      logger.error('FeedSubscriber: Error invalidating user feed', {
        error: error.message,
        userId,
        reason,
        metadata
      });
    }
  }

  /**
   * Perform actual cache invalidation
   * This is a stub implementation that can be enhanced with actual cache system
   */
  async performCacheInvalidation(cacheKey, reason, metadata) {
    try {
      // Check if cache service exists
      let cacheService;
      try {
        cacheService = await import('../../services/cache.service.js');
      } catch (importError) {
        // Cache service doesn't exist yet, that's okay
        logger.debug('Cache service not available for invalidation', {
          cacheKey,
          reason
        });
        return;
      }

      // If cache service exists, invalidate the cache
      if (cacheService && cacheService.default) {
        await cacheService.default.delete(cacheKey);
        
        logger.info('Cache invalidated successfully', {
          cacheKey,
          reason,
          ...metadata
        });
      }
    } catch (error) {
      logger.error('FeedSubscriber: Error performing cache invalidation', {
        error: error.message,
        cacheKey,
        reason,
        metadata
      });
    }
  }

  /**
   * Get cache invalidation statistics
   */
  getInvalidationStats() {
    return {
      queueSize: this.cacheInvalidationQueue.size,
      queuedKeys: Array.from(this.cacheInvalidationQueue),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear invalidation queue
   */
  clearInvalidationQueue() {
    this.cacheInvalidationQueue.clear();
    logger.info('Feed cache invalidation queue cleared');
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
            logger.error('FeedSubscriber: Error unsubscribing from event', {
              error: error.message
            });
          }
        });
      }

      // Clear invalidation queue
      this.clearInvalidationQueue();

      this.initialized = false;
      logger.info('FeedSubscriber shutdown successfully');
    } catch (error) {
      logger.error('FeedSubscriber: Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// Create and export singleton instance
const feedSubscriber = new FeedSubscriber();

// Don't auto-initialize at import time
// feedSubscriber.initialize().catch(error => {
//   logger.error('FeedSubscriber: Auto-initialization failed', {
//     error: error.message,
//     stack: error.stack
//   });
// });

export default feedSubscriber;
