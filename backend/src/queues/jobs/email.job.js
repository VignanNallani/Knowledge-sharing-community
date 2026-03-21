import { logger } from '../../config/index.js';

export const emailJobProcessor = async (job) => {
  const { type, to, subject, data, template } = job.data;
  
  try {
    logger.info(`Processing email job: ${type}`, { 
      jobId: job.id, 
      to, 
      subject,
      attempt: job.attemptsMade + 1 
    });

    // Simulate email sending (replace with actual email service)
    await sendEmail({ to, subject, data, template });
    
    logger.info(`Email sent successfully: ${type}`, { 
      jobId: job.id, 
      to 
    });
    
    return { success: true, sentAt: new Date().toISOString() };
  } catch (error) {
    logger.error(`Email job failed: ${type}`, { 
      jobId: job.id, 
      error: error.message,
      attempt: job.attemptsMade + 1
    });
    throw error;
  }
};

// Mock email sending function (replace with actual implementation)
async function sendEmail({ to, subject, data, template }) {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Simulate occasional failures (5% failure rate)
  if (Math.random() < 0.05) {
    throw new Error('Email service temporarily unavailable');
  }
  
  logger.info(`Email sent to ${to} with subject: ${subject}`);
  
  // In production, integrate with actual email service like:
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  // - Postmark
  // - Mailgun
  
  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'sent'
  };
}

// Email job creators
export const emailJobs = {
  // Welcome email
  sendWelcomeEmail: (userData) => ({
    name: 'welcome',
    data: {
      type: 'welcome',
      to: userData.email,
      subject: 'Welcome to Knowledge Sharing Community!',
      template: 'welcome',
      data: userData
    }
  }),

  // Mentorship request notification
  sendMentorshipRequestEmail: (mentorData, menteeData, mentorship) => ({
    name: 'mentorship_request',
    data: {
      type: 'mentorship_request',
      to: mentorData.email,
      subject: 'New Mentorship Request',
      template: 'mentorship_request',
      data: {
        mentor: mentorData,
        mentee: menteeData,
        mentorship
      }
    }
  }),

  // Mentorship acceptance notification
  sendMentorshipAcceptedEmail: (menteeData, mentorData, mentorship) => ({
    name: 'mentorship_accepted',
    data: {
      type: 'mentorship_accepted',
      to: menteeData.email,
      subject: 'Mentorship Request Accepted!',
      template: 'mentorship_accepted',
      data: {
        mentee: menteeData,
        mentor: mentorData,
        mentorship
      }
    }
  }),

  // Session reminder
  sendSessionReminderEmail: (userData, sessionData) => ({
    name: 'session_reminder',
    data: {
      type: 'session_reminder',
      to: userData.email,
      subject: 'Reminder: Upcoming Mentorship Session',
      template: 'session_reminder',
      data: {
        user: userData,
        session: sessionData
      }
    }
  }),

  // Password reset
  sendPasswordResetEmail: (userData, resetToken) => ({
    name: 'password_reset',
    data: {
      type: 'password_reset',
      to: userData.email,
      subject: 'Reset Your Password',
      template: 'password_reset',
      data: {
        user: userData,
        resetToken,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      }
    }
  }),

  // Email verification
  sendEmailVerificationEmail: (userData, verificationToken) => ({
    name: 'email_verification',
    data: {
      type: 'email_verification',
      to: userData.email,
      subject: 'Verify Your Email Address',
      template: 'email_verification',
      data: {
        user: userData,
        verificationToken,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
      }
    }
  }),

  // New follower notification
  sendNewFollowerEmail: (followedUser, followerUser) => ({
    name: 'new_follower',
    data: {
      type: 'new_follower',
      to: followedUser.email,
      subject: 'You have a new follower!',
      template: 'new_follower',
      data: {
        followedUser,
        followerUser
      }
    }
  }),

  // Post like notification
  sendPostLikeEmail: (postAuthor, likerUser, postData) => ({
    name: 'post_like',
    data: {
      type: 'post_like',
      to: postAuthor.email,
      subject: 'Your post received a like!',
      template: 'post_like',
      data: {
        postAuthor,
        likerUser,
        postData
      }
    }
  }),

  // Comment notification
  sendCommentEmail: (postAuthor, commenterUser, postData, commentData) => ({
    name: 'comment_notification',
    data: {
      type: 'comment_notification',
      to: postAuthor.email,
      subject: 'New comment on your post',
      template: 'comment_notification',
      data: {
        postAuthor,
        commenterUser,
        postData,
        commentData
      }
    }
  })
};
