const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const pushNotificationService = require('../services/pushNotification.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for push notification endpoints
const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many push notification requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all push routes
router.use(pushLimiter);

// Subscribe to push notifications
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;

    // Validate subscription
    if (!pushNotificationService.validateSubscription(subscription)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data'
      });
    }

    // Subscribe user
    const result = await pushNotificationService.subscribeUser(req.user.id, subscription);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({
      success: sendEmailService.error.message,
      error: error.message
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const result = await pushNotificationService.unsubscribeUser(req.user.id);

    res.json({
      success: true,
      data: result,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send push notification
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userId, title, message, data, options } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // Users can only send notifications to themselves (unless admin)
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only send notifications to yourself'
      });
    }

    const result = await pushNotificationService.sendPushNotification(
      parseInt(userId),
      title,
      message,
      data,
      options
    );

    res.json({
      success: true,
      data: result,
      message: result.success ? 'Push notification sent successfully' : 'Failed to send push notification'
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send bulk push notifications (admin only)
router.post('/bulk', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { notifications } = req.body;

    if (!notifications || !Array.isArray(notifications)) {
      return res.status(400).json({
        success: false,
        error: 'Notifications array is required'
      });
    }

    // Validate each notification
    for (const notification of notifications) {
      if (!notification.userId || !notification.title || !notification.message) {
        return res.status(400).json({
        success: false,
        error: 'Each notification must have userId, title, and message'
      });
      }
    }

    const results = await pushNotificationService.sendBulkPushNotifications(notifications);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.status(201).json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failureCount,
        results
      },
      message: `Sent ${results.length} push notifications (${successCount} successful, ${failureCount} failed)`
    });
  } catch (error) {
    console.error('Send bulk push notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's push subscriptions
router.get('/subscriptions', authenticate, async (req, res) => {
  try {
    const subscriptions = await pushNotificationService.getUserSubscriptions(req.user.id);

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get subscription statistics (admin only)
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await pushNotificationService.getSubscriptionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get VAPID keys (public endpoint)
router.get('/vapid-keys', async (req, res) => {
  try {
    const vapidKeys = pushNotificationService.getVAPIDKeys();

    if (!vapidKeys) {
      return res.status(500).json({
        success: false,
        error: 'VAPID keys not initialized'
      });
    }

    res.json({
      success: true,
      data: {
        publicKey: vapidKeys.publicKey
      }
    });
  } catch (error) {
    console.error('Get VAPID keys error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate new VAPID keys (admin only)
router.post('/vapid-keys/generate', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const vapidKeys = pushNotificationService.generateVAPIDKeys();

    res.json({
      success: true,
      data: {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey
      },
      message: 'New VAPID keys generated successfully'
    });
  } catch (error) {
    console.error('Generate VAPID keys error:', error);
    res.status(500).json({
        success: false,
        error: error.message
      });
  }
});

// Test push notification (for development)
router.post('/test', authenticate, async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, title, and message are required'
      });
    }

    const result = await pushNotificationService.testPushNotification(
      parseInt(userId),
      title,
      message
    );

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test push notification sent' : 'Failed to send test push notification'
    });
  } catch (error) {
    console.error('Test push notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup inactive subscriptions (admin only)
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { daysOld = 30 } = req.body;

    const result = await pushNotificationService.cleanupInactiveSubscriptions(daysOld);

    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.count} inactive subscriptions older than ${daysOld} days`
    });
  } catch (error) {
    console.error('Cleanup inactive subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Push notification helpers (for internal use)
router.post('/helpers/session-update', authenticate, async (req, res) => {
  try {
    const { userId, sessionData } = req.body;

    if (!userId || !sessionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and sessionData are required'
      });
    }

    const notification = await pushNotificationService.notifySessionUpdate(
      parseInt(userId),
      sessionData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Session update notification sent'
    });
  } catch (error) {
    console.error('Session update notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/post-liked', authenticate, async (req, res) => {
  try {
    const { userId, postData } = req.body;

    if (!userId || !postData) {
      return res.status(400).json({
        success: false,
        error: 'userId and postData are required'
      });
    }

    const notification = await pushNotificationService.notifyPostLiked(
      parseInt(userId),
      postData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Post liked notification sent'
    });
  } catch (error) {
    console.error('Post liked notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/comment-added', authenticate, async (req, res) => {
  try {
    const { userId, commentData } = req.body;

    if (!userId || !commentData) {
      return res.status(400).json({
        success: false,
        error: 'userId and commentData are required'
      });
    }

    const notification = await pushNotificationService.notifyCommentAdded(
      parseInt(userId),
      commentData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Comment added notification sent'
    });
  } catch (error) {
    console.error('Comment added notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/new-follower', authenticate, async (req, res) => {
  try {
    const { userId, followerData } = req.body;

    if (!userId || !followerData) {
      return res.status(400).json({
        success: false,
        error: 'userId and followerData are required'
      });
    }

    const notification = await pushNotificationService.notifyNewFollower(
      parseInt(userId),
      followerData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'New follower notification sent'
    });
  } catch (error) {
    console.error('New follower notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/system-announcement', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { title, message, data, url } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'title and message are required'
      });
    }

    const result = await pushNotificationService.notifySystemAnnouncement(title, message, data, { url });

    res.status(201).json({
      success: result.success,
      data: result,
      message: `System announcement sent to ${result.successCount} users`
    });
  } catch (error) {
    console.error('System announcement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/welcome', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Get user data
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const notification = await pushNotificationService.sendWelcomeNotification(
      parseInt(userId),
      user
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Welcome notification sent'
    });
  } catch (error) {
    console.error('Welcome notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
