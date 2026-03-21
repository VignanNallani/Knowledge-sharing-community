import { logger } from '../../config/index.js';

export const notificationJobProcessor = async (job) => {
  const { type, userId, title, message, data, channels } = job.data;
  
  try {
    logger.info(`Processing notification job: ${type}`, { 
      jobId: job.id, 
      userId, 
      title,
      attempt: job.attemptsMade + 1 
    });

    const results = {};

    // Process different notification channels
    if (channels.includes('in-app')) {
      results.inApp = await sendInAppNotification(userId, title, message, data);
    }

    if (channels.includes('push')) {
      results.push = await sendPushNotification(userId, title, message, data);
    }

    if (channels.includes('email')) {
      results.email = await sendEmailNotification(userId, title, message, data);
    }
    
    logger.info(`Notification sent successfully: ${type}`, { 
      jobId: job.id, 
      userId,
      results
    });
    
    return { success: true, results, sentAt: new Date().toISOString() };
  } catch (error) {
    logger.error(`Notification job failed: ${type}`, { 
      jobId: job.id, 
      error: error.message,
      attempt: job.attemptsMade + 1
    });
    throw error;
  }
};

// In-app notification
async function sendInAppNotification(userId, title, message, data) {
  try {
    // Store notification in database for in-app display
    // This would typically use your notification repository/service
    logger.info(`In-app notification sent to user ${userId}: ${title}`);
    
    return {
      channel: 'in-app',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Failed to send in-app notification:`, error);
    throw error;
  }
}

// Push notification (for mobile/web push)
async function sendPushNotification(userId, title, message, data) {
  try {
    // Simulate push notification sending
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    // In production, integrate with push notification services like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNs)
    // - Web Push API
    
    logger.info(`Push notification sent to user ${userId}: ${title}`);
    
    return {
      channel: 'push',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Failed to send push notification:`, error);
    throw error;
  }
}

// Email notification
async function sendEmailNotification(userId, title, message, data) {
  try {
    // This would typically fetch user email and send via email service
    logger.info(`Email notification sent to user ${userId}: ${title}`);
    
    return {
      channel: 'email',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`Failed to send email notification:`, error);
    throw error;
  }
}

// Notification job creators
export const notificationJobs = {
  // New mentorship request
  mentorshipRequest: (mentorId, menteeData, mentorshipData) => ({
    name: 'mentorship_request',
    data: {
      type: 'mentorship_request',
      userId: mentorId,
      title: 'New Mentorship Request',
      message: `${menteeData.name} wants to connect with you for mentorship`,
      data: {
        mentee: menteeData,
        mentorship: mentorshipData
      },
      channels: ['in-app', 'push', 'email']
    }
  }),

  // Mentorship accepted
  mentorshipAccepted: (menteeId, mentorData, mentorshipData) => ({
    name: 'mentorship_accepted',
    data: {
      type: 'mentorship_accepted',
      userId: menteeId,
      title: 'Mentorship Request Accepted!',
      message: `${mentorData.name} has accepted your mentorship request`,
      data: {
        mentor: mentorData,
        mentorship: mentorshipData
      },
      channels: ['in-app', 'push', 'email']
    }
  }),

  // Session reminder
  sessionReminder: (userId, sessionData) => ({
    name: 'session_reminder',
    data: {
      type: 'session_reminder',
      userId,
      title: 'Upcoming Session Reminder',
      message: `Your mentorship session is scheduled in 1 hour`,
      data: {
        session: sessionData
      },
      channels: ['in-app', 'push', 'email']
    }
  }),

  // New follower
  newFollower: (userId, followerData) => ({
    name: 'new_follower',
    data: {
      type: 'new_follower',
      userId,
      title: 'New Follower',
      message: `${followerData.name} started following you`,
      data: {
        follower: followerData
      },
      channels: ['in-app', 'push']
    }
  }),

  // Post like
  postLike: (userId, likerData, postData) => ({
    name: 'post_like',
    data: {
      type: 'post_like',
      userId,
      title: 'Your post received a like',
      message: `${likerData.name} liked your post: "${postData.title.substring(0, 50)}..."`,
      data: {
        liker: likerData,
        post: postData
      },
      channels: ['in-app']
    }
  }),

  // New comment
  newComment: (userId, commenterData, postData, commentData) => ({
    name: 'new_comment',
    data: {
      type: 'new_comment',
      userId,
      title: 'New comment on your post',
      message: `${commenterData.name} commented on your post: "${commentData.content.substring(0, 50)}..."`,
      data: {
        commenter: commenterData,
        post: postData,
        comment: commentData
      },
      channels: ['in-app', 'push']
    }
  }),

  // System notification
  systemNotification: (userId, title, message, data = {}) => ({
    name: 'system_notification',
    data: {
      type: 'system_notification',
      userId,
      title,
      message,
      data,
      channels: ['in-app']
    }
  }),

  // Achievement unlocked
  achievementUnlocked: (userId, achievementData) => ({
    name: 'achievement_unlocked',
    data: {
      type: 'achievement_unlocked',
      userId,
      title: 'Achievement Unlocked! 🎉',
      message: `You've earned the "${achievementData.name}" badge`,
      data: {
        achievement: achievementData
      },
      channels: ['in-app', 'push']
    }
  })
};
