const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const pushCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

class PushNotificationService {
  constructor() {
    this.vapidKeys = null;
    this.initializeVAPID();
  }

  initializeVAPID() {
    try {
      // Load VAPID keys from environment or generate new ones
      this.vapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY
      };

      if (!this.vapidKeys.publicKey || !this.vapidKeys.privateKey) {
        // Generate new VAPID keys for development
        const webpush = require('web-push');
        const vapidKeys = webpush.generateVAPIDKeys();
        
        this.vapidKeys = {
          publicKey: vapidKeys.publicKey,
          privateKey: vapidKeys.privateKey
        };

        logger.warn('Generated new VAPID keys for development');
        logger.info('Public VAPID Key:', this.vapidKeys.publicKey);
      }

      logger.info('VAPID keys initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VAPID keys:', error);
      this.vapidKeys = null;
    }
  }

  async subscribeUser(userId, subscription) {
    try {
      // Validate subscription
      if (!subscription || !subscription.endpoint) {
        throw new Error('Invalid subscription data');
      }

      // Check if user already has a subscription
      const existingSubscription = await prisma.pushSubscription.findFirst({
        where: { userId }
      });

      if (existingSubscription) {
        // Update existing subscription
        const updated = await prisma.pushSubscription.update({
          where: { id: existingSubscription.id },
          data: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: subscription.userAgent,
            isActive: true,
            updatedAt: new Date()
          }
        });

        return updated;
      } else {
        // Create new subscription
        const created = await prisma.pushSubscription.create({
          data: {
            userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            userAgent: subscription.userAgent,
            isActive: true
          }
        });

        return created;
      }
    } catch (error) {
      logger.error('Error subscribing user to push notifications:', error);
      throw error;
    }
  }

  async unsubscribeUser(userId) {
    try {
      // Deactivate subscription
      const result = await prisma.pushSubscription.updateMany({
        where: { userId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return result;
    } catch (error) {
      logger.error('Error unsubscribing user from push notifications:', error);
      throw error;
    }
  }

  async sendPushNotification(userId, title, message, data = {}, options = {}) {
    try {
      // Get user's active push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true
        }
      });

      if (subscriptions.length === 0) {
        return { success: false, message: 'No active push subscriptions found' };
      }

      const results = [];
      
      for (const subscription of subscriptions) {
        try {
          const pushPayload = this.createPushPayload(title, message, data, options);
          
          const result = await webpush.sendNotification(
            subscription.endpoint,
            subscription.keys,
            pushPayload,
            {
              vapidDetails: this.vapidKeys,
              TTL: options.TTL || 3600, // 1 hour default
            }
          );

          results.push({
            subscriptionId: subscription.id,
            success: true,
            result
          });

          logger.info(`Push notification sent successfully to user ${userId}, subscription ${subscription.id}`);
        } catch (error) {
          logger.error(`Failed to send push notification to user ${userId}, subscription ${subscription.id}:`, error);
          
          // Deactivate failed subscription
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: {
              isActive: false,
              updatedAt: new Date()
            }
          });

          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: successCount > 0,
        total: results.length,
        successCount,
        failureCount,
        results
      };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  async sendBulkPushNotifications(notifications) {
    try {
      const results = [];
      
      for (const notification of notifications) {
        try {
          const result = await this.sendPushNotification(
            notification.userId,
            notification.title,
            notification.message,
            notification.data,
            notification.options
          );
          
          results.push({
            userId: notification.userId,
            success: result.success,
            result
          });
        } catch (error) {
          logger.error(`Failed to send push notification to user ${notification.userId}:`, error);
          results.push({
            userId: notification.userId,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  createPushPayload(title, message, data = {}, options = {}) {
    const payload = {
      title: title,
      message: message,
      data: data,
      icon: options.icon || '/icons/notification-icon.png',
      badge: options.badge || '/icons/badge-icon.png',
      image: options.image,
      tag: options.tag || 'general',
      requireInteraction: options.requireInteraction || false,
      actions: options.actions || [],
      timestamp: Date.now(),
      url: options.url
    };

    // Add notification ID for tracking
    if (options.notificationId) {
      payload.data.notificationId = options.notificationId;
    }

    return payload;
  }

  async getUserSubscriptions(userId) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return subscriptions;
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  async getSubscriptionStats() {
    try {
      const stats = await prisma.pushSubscription.groupBy({
        by: ['isActive'],
        _count: { isActive: true }
      });

      return stats.reduce((acc, stat) => {
        acc[stat.isActive ? 'active' : 'inactive'] = stat._count.isActive;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting subscription stats:', error);
      return {};
    }
  }

  async cleanupInactiveSubscriptions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.pushSubscription.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: cutoffDate }
        }
      });

      logger.info(`Cleaned up ${result.count} inactive push subscriptions older than ${daysOld} days`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up inactive subscriptions:', error);
      throw error;
    }
  }

  async testPushNotification(userId, title, message) {
    try {
      const testPayload = {
        title: 'Test Notification',
        message: 'This is a test push notification',
        data: {
          type: 'test',
          timestamp: Date.now()
        },
        tag: 'test'
      };

      return await this.sendPushNotification(userId, title, message, testPayload.data, {
        tag: 'test',
        TTL: 3600
      });
    } catch (error) {
      logger.error('Error sending test push notification:', error);
      throw error;
    }
  }

  // Helper methods for different notification types
  async notifySessionUpdate(userId, sessionData) {
    const title = sessionData.status === 'COMPLETED' ? 'Session Completed' : 'Session Updated';
    const message = `Your mentorship session "${sessionData.title}" has been ${sessionData.status.toLowerCase()}.`;
    
    const data = {
      type: 'session_update',
      sessionId: sessionData.id,
      status: sessionData.status,
      title: sessionData.title,
      scheduledAt: sessionData.scheduledAt,
      mentorName: sessionData.mentorName
    };

    const options = {
      icon: '/icons/session-icon.png',
      tag: 'session',
      url: `/session/${sessionData.id}`,
      actions: [
        {
          action: 'view',
          title: 'View Session',
          url: `/session/${sessionData.id}`
        }
      ]
    };

    return this.sendPushNotification(userId, title, message, data, options);
  }

  async notifyPostLiked(userId, postData) {
    const title = 'Post Liked';
    const message = `${postData.actorName} liked your post "${postData.title}"`;
    
    const data = {
      type: 'post_liked',
      postId: postData.id,
      postTitle: postData.title,
      actorId: postData.actorId,
      actorName: postData.actorName,
      likeCount: postData.likeCount
    };

    const options = {
      icon: '/icons/heart-icon.png',
      tag: 'like',
      url: `/post/${postData.id}`,
      actions: [
        {
          action: 'view',
          title: 'View Post',
          url: `/post/${postData.id}`
        }
      ]
    };

    return this.sendPushNotification(userId, title, message, data, options);
  }

  async notifyCommentAdded(userId, commentData) {
    const title = 'New Comment';
    const message = `${commentData.actorName} commented on your post "${commentData.postTitle}"`;
    
    const data = {
      type: 'comment_added',
      commentId: commentData.id,
      postId: commentData.postId,
      postTitle: commentData.postTitle,
      actorId: commentData.actorId,
      actorName: commentData.actorName,
      commentContent: commentData.content,
      commentCount: commentData.commentCount
    };

    const options = {
      icon: '/icons/comment-icon.png',
      tag: 'comment',
      url: `/post/${commentData.postId}#comment-${commentData.id}`,
      actions: [
        {
          action: 'view',
          title: 'View Comment',
          url: `/post/${commentData.postId}#comment-${commentData.id}`
        }
      ]
    };

    return this.sendPushNotification(userId, title, message, data, options);
  }

  async notifyNewFollower(userId, followerData) {
    const title = 'New Follower';
    const message = `${followerData.name} is now following you`;
    
    const data = {
      type: 'new_follower',
      followerId: followerData.id,
      followerName: followerData.name,
      followerProfileImage: followerData.profileImage
    };

    const options = {
      icon: '/icons/follower-icon.png',
      tag: 'follower',
      url: `/profile/${followerData.id}`,
      actions: [
        {
          action: 'view',
          title: 'View Profile',
          url: `/profile/${followerData.id}`
        }
      ]
    };

    return this.sendPushNotification(userId, title, message, data, options);
  }

  async notifySystemAnnouncement(title, message, data = {}) {
    try {
      // Get all users with active subscriptions for system announcements
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          isActive: true
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      const userIds = subscriptions.map(sub => sub.userId);
      
      const results = await this.sendBulkPushNotifications(
        userIds.map(userId => ({
          userId,
          title,
          message,
          data: {
            ...data,
            type: 'system_announcement',
            timestamp: Date.now()
          },
          options: {
            icon: '/icons/system-icon.png',
            tag: 'system',
            requireInteraction: true,
            url: data.url
          }
        }))
      );

      const successCount = results.filter(r => r.success).length;
      
      logger.info(`System announcement sent to ${successCount} users`);
      
      return {
        success: successCount > 0,
        total: results.length,
        successCount,
        failureCount: results.length - successCount
      };
    } catch (error) {
      logger.error('Error sending system announcement:', error);
      throw error;
    }
  }

  async sendWelcomeNotification(userId, userData) {
    const title = 'Welcome to Knowledge Sharing!';
    const message = `Welcome ${userData.name}! We're excited to have you join our community.`;
    
    const data = {
      type: 'welcome',
      userId: userId,
      userName: userData.name
    };

    const options = {
      icon: '/icons/welcome-icon.png',
      tag: 'welcome',
      url: '/dashboard',
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          url: '/discover'
        },
        {
          action: 'dashboard',
          title: 'Dashboard',
          url: '/dashboard'
        }
      ]
    };

    return this.sendPushNotification(userId, title, message, data, options);
  }

  // VAPID key management
  getVAPIDKeys() {
    return this.vapidKeys;
  }

  generateVAPIDKeys() {
    try {
      const webpush = require('web-push');
      const vapidKeys = webpush.generateVAPIDKeys();
      
      this.vapidKeys = {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      };

      logger.info('Generated new VAPID keys');
      logger.info('Public VAPID Key:', this.vapidKeys.publicKey);
      
      return this.vapidKeys;
    } catch (error) {
      logger.error('Error generating VAPID keys:', error);
      throw error;
    }
  }

  validateSubscription(subscription) {
    if (!subscription || !subscription.endpoint) {
      return false;
    }

    // Validate endpoint URL
    try {
      new URL(subscription.endpoint);
    } catch {
      return false;
    }

    // Validate keys
    if (!subscription.keys || !subscription.keys.p256dh) {
      return false;
    }

    return true;
  }

  // Subscription helper for frontend
  getSubscriptionData(subscription) {
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh
      },
      auth: subscription.auth,
      expirationTime: subscription.expirationTime
    };
  }
}

module.exports = new PushNotificationService();
