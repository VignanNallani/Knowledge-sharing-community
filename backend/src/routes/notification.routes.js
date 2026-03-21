const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const notificationService = require('../services/notification.service');

const router = express.Router();

// Create notification (internal use)
router.post('/create', authenticate, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, type, title, message'
      });
    }

    // Users can only create notifications for themselves (unless admin)
    if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only create notifications for yourself'
      });
    }

    const notification = await notificationService.createNotification(
      parseInt(userId),
      type,
      title,
      message,
      data
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      type,
      isRead,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = Math.min(parseInt(limit), 50);

    const result = await notificationService.getUserNotifications(req.user.id, filters);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get unread notification count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }

    const notification = await notificationService.markNotificationAsRead(
      notificationId,
      req.user.id
    );

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user.id);

    res.json({
      success: true,
      data: result,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }

    const result = await notificationService.deleteNotification(
      notificationId,
      req.user.id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await notificationService.getNotificationStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get notification preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update notification preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = req.body;

    // Validate push notification preferences
    const validPushPrefs = [
      'mentorshipBookings',
      'sessionReminders',
      'feedbackRequests',
      'newFollowers',
      'postLikes',
      'comments',
      'mentions',
      'systemAnnouncements'
    ];

    const invalidPrefs = Object.keys(preferences).filter(key => 
      key !== 'email' && !validPushPrefs.includes(key)
    );

    if (invalidPrefs.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preference fields',
        invalidFields: invalidPrefs
      });
    }

    await notificationService.updateNotificationPreferences(req.user.id, preferences);

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create bulk notifications (admin only)
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
    for (const notif of notifications) {
      if (!notif.userId || !notif.type || !notif.title || !notif.message) {
        return res.status(400).json({
          success: false,
          error: 'Each notification must have userId, type, title, and message'
        });
      }
    }

    const results = await notificationService.createBulkNotifications(notifications);

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
      message: `Created ${results.length} notifications (${successCount} successful, ${failureCount} failed)`
    });
  } catch (error) {
    console.error('Create bulk notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup old notifications (admin only)
router.post('/cleanup', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { daysOld = 90 } = req.body;

    const result = await notificationService.cleanupOldNotifications(daysOld);

    res.json({
      success: true,
      data: result,
      message: `Cleaned up ${result.count} old notifications`
    });
  } catch (error) {
    console.error('Cleanup notifications error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Notification helpers (for internal use)
router.post('/helpers/mentorship-booking', authenticate, async (req, res) => {
  try {
    const { userId, sessionData } = req.body;

    if (!userId || !sessionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and sessionData are required'
      });
    }

    const notification = await notificationService.notifyMentorshipBooking(
      parseInt(userId),
      sessionData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Mentorship booking notification sent'
    });
  } catch (error) {
    console.error('Mentorship booking notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/session-reminder', authenticate, async (req, res) => {
  try {
    const { userId, sessionData } = req.body;

    if (!userId || !sessionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and sessionData are required'
      });
    }

    const notification = await notificationService.notifySessionReminder(
      parseInt(userId),
      sessionData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Session reminder notification sent'
    });
  } catch (error) {
    console.error('Session reminder notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/helpers/feedback-request', authenticate, async (req, res) => {
  try {
    const { userId, sessionData } = req.body;

    if (!userId || !sessionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and sessionData are required'
      });
    }

    const notification = await notificationService.notifyFeedbackRequest(
      parseInt(userId),
      sessionData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Feedback request notification sent'
    });
  } catch (error) {
    console.error('Feedback request notification error:', error);
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

    const notification = await notificationService.notifyNewFollower(
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

router.post('/helpers/post-liked', authenticate, async (req, res) => {
  try {
    const { userId, postData } = req.body;

    if (!userId || !postData) {
      return res.status(400).json({
        success: false,
        error: 'userId and postData are required'
      });
    }

    const notification = await notificationService.notifyPostLiked(
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

    const notification = await notificationService.notifyCommentAdded(
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

router.post('/helpers/mention', authenticate, async (req, res) => {
  try {
    const { userId, mentionData } = req.body;

    if (!userId || !mentionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and mentionData are required'
      });
    }

    const notification = await notificationService.notifyMention(
      parseInt(userId),
      mentionData
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Mention notification sent'
    });
  } catch (error) {
    console.error('Mention notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
