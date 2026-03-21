const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');
const NodeCache = require('node-cache');

const prisma = new PrismaClient();
const emailCache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache for templates

class EmailService {
  constructor() {
    this.transporter = null;
    this.rateLimiter = new Map();
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Use SendGrid or Resend based on configuration
      const emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid';
      
      if (emailProvider === 'sendgrid') {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: process.env.SENDGRID_API_KEY,
            pass: process.env.SENDGRID_API_KEY
          }
        });
      } else if (emailProvider === 'resend') {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 587,
          secure: false,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY
          }
        });
      } else {
        // Development mode - use ethereal or console
        if (process.env.NODE_ENV === 'development') {
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: process.env.ETHEREAL_USER,
              pass: process.env.ETHEREAL_PASS
            }
          });
        } else {
          this.transporter = nodemailer.createTransport({
            streamTransport: true,
            newline: 'unix',
            buffer: true
          });
        }
      }

      logger.info(`Email transporter initialized with provider: ${emailProvider}`);
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendEmail(options) {
    const {
      to,
      subject,
      template,
      data = {},
      priority = 1,
      scheduledAt = new Date()
    } = options;

    try {
      // Validate email address
      if (!this.isValidEmail(to)) {
        throw new Error('Invalid email address');
      }

      // Check rate limiting
      if (!this.checkRateLimit(to)) {
        throw new Error('Rate limit exceeded for this email address');
      }

      // Get email content from template
      const emailContent = await this.getEmailContent(template, data);

      // Queue email for sending
      const queuedEmail = await prisma.emailQueue.create({
        data: {
          toEmail: to,
          subject,
          template,
          data,
          priority,
          scheduledAt,
          status: 'pending'
        }
      });

      // Try to send immediately if priority is high
      if (priority >= 3) {
        await this.processEmail(queuedEmail.id);
      }

      logger.info(`Email queued successfully: ${queuedEmail.id}`);
      return queuedEmail;

    } catch (error) {
      logger.error('Failed to queue email:', error);
      throw error;
    }
  }

  async processEmail(emailId) {
    try {
      const email = await prisma.emailQueue.findUnique({
        where: { id: emailId }
      });

      if (!email) {
        throw new Error('Email not found');
      }

      if (email.status === 'sent') {
        return email;
      }

      if (email.status === 'cancelled') {
        return email;
      }

      // Check if we should send now
      if (email.scheduledAt > new Date()) {
        return email; // Not yet time to send
      }

      // Get email content
      const emailContent = await this.getEmailContent(email.template, email.data);

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@knowledgesharing.com',
        to: email.toEmail,
        subject: email.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      // Update email status
      const updatedEmail = await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.info(`Email sent successfully: ${emailId}`, { messageId: result.messageId });
      return updatedEmail;

    } catch (error) {
      logger.error(`Failed to send email ${emailId}:`, error);

      // Update email with error
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          attempts: { increment: 1 },
          errorMessage: error.message,
          updatedAt: new Date(),
          status: 'failed'
        }
      });

      throw error;
    }
  }

  async processEmailQueue() {
    try {
      const pendingEmails = await prisma.emailQueue.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: new Date() },
          attempts: { lt: 3 }
        },
        orderBy: [
          { priority: 'desc' },
          { scheduledAt: 'asc' }
        ],
        take: 10 // Process 10 emails at a time
      });

      const results = [];
      
      for (const email of pendingEmails) {
        try {
          const result = await this.processEmail(email.id);
          results.push({ id: email.id, status: 'success', result });
        } catch (error) {
          results.push({ id: email.id, status: 'error', error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error processing email queue:', error);
      throw error;
    }
  }

  async getEmailContent(template, data) {
    try {
      // Check cache first
      const cacheKey = `template:${template}`;
      let templateContent = emailCache.get(cacheKey);

      if (!templateContent) {
        templateContent = this.getTemplate(template);
        emailCache.set(cacheKey, templateContent);
      }

      // Replace placeholders in template
      const html = this.replacePlaceholders(templateContent.html, data);
      const text = this.replacePlaceholders(templateContent.text, data);

      return { html, text };
    } catch (error) {
      logger.error(`Error getting email content for template ${template}:`, error);
      throw new Error(`Failed to load email template: ${template}`);
    }
  }

  getTemplate(template) {
    const templates = {
      'mentorship-booking': {
        subject: 'Mentorship Session Booking Confirmed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="color: #007bff; margin-bottom: 20px;">Session Booking Confirmed!</h1>
              <p style="color: #6c757d; font-size: 16px; line-height: 1.5;">
                Your mentorship session has been successfully booked.
              </p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Session Details</h2>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <p style="margin: 5px 0;"><strong>Title:</strong> {{title}}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {{scheduledAt}}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> {{duration}} minutes</p>
                <p style="margin: 5px 0;"><strong>Mentor:</strong> {{mentorName}}</p>
              </div>
              
              {{#meetingUrl}}
              <div style="text-align: center; margin-top: 20px;">
                <a href="{{meetingUrl}}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Join Session
                </a>
              </div>
              {{/meetingUrl}}
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `
          Mentorship Session Booking Confirmed!
          
          Session Details:
          Title: {{title}}
          Date: {{scheduledAt}}
          Duration: {{duration}} minutes
          Mentor: {{mentorName}}
          
          {{#meetingUrl}}
          Join Session: {{meetingUrl}}
          {{/meetingUrl}}
        `
      },

      'session-reminder': {
        subject: 'Reminder: Upcoming Mentorship Session',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #fff3cd; padding: 30px; border-radius: 10px; text-align: center; border: 1px solid #ffeaa7;">
              <h1 style="color: #856404; margin-bottom: 20px;">Session Reminder</h1>
              <p style="color: #856404; font-size: 16px; line-height: 1.5;">
                Your mentorship session is starting soon!
              </p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Session Details</h2>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Title:</strong> {{title}}</p>
                <p style="margin: 5px 0;"><strong>Starts in:</strong> {{timeUntil}}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> {{duration}} minutes</p>
              </div>
              
              {{#meetingUrl}}
              <div style="text-align: center; margin-top: 20px;">
                <a href="{{meetingUrl}}" style="background: #ffc107; color: #212529; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Join Session Now
                </a>
              </div>
              {{/meetingUrl}}
            </div>
          </div>
        `,
        text: `
          Reminder: Upcoming Mentorship Session
          
          Your session starts in: {{timeUntil}}
          
          Title: {{title}}
          Duration: {{duration}} minutes
          
          {{#meetingUrl}}
          Join Session: {{meetingUrl}}
          {{/meetingUrl}}
        `
      },

      'feedback-request': {
        subject: 'Please Rate Your Mentorship Session',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #d1ecf1; padding: 30px; border-radius: 10px; text-align: center; border: 1px solid #bee5eb;">
              <h1 style="color: #0c5460; margin-bottom: 20px;">Share Your Feedback</h1>
              <p style="color: #0c5460; font-size: 16px; line-height: 1.5;">
                Your mentorship session has completed. Please take a moment to share your experience.
              </p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Session Details</h2>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Title:</strong> {{title}}</p>
                <p style="margin: 5px 0;"><strong>Mentor:</strong> {{mentorName}}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {{completedAt}}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="{{feedbackUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Leave Feedback
                </a>
              </div>
            </div>
          </div>
        `,
        text: `
          Please Rate Your Mentorship Session
          
          Your feedback helps us improve our mentorship program.
          
          Session: {{title}}
          Mentor: {{mentorName}}
          Date: {{completedAt}}
          
          Leave feedback: {{feedbackUrl}}
        `
      },

      'password-reset': {
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #f8d7da; padding: 30px; border-radius: 10px; text-align: center; border: 1px solid #f5c6cb;">
              <h1 style="color: #721c24; margin-bottom: 20px;">Password Reset Request</h1>
              <p style="color: #721c24; font-size: 16px; line-height: 1.5;">
                You requested to reset your password. Click the link below to continue.
              </p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; text-align: center;">
              <p style="margin-bottom: 20px;">This link will expire in 1 hour.</p>
              
              <a href="{{resetUrl}}" style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
              
              <p style="margin-top: 20px; color: #6c757d; font-size: 14px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        `,
        text: `
          Password Reset Request
          
          You requested to reset your password. Click the link below to continue:
          
          {{resetUrl}}
          
          This link will expire in 1 hour.
          
          If you didn't request this, please ignore this email.
        `
      },

      'welcome-email': {
        subject: 'Welcome to Knowledge Sharing Community!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #d4edda; padding: 30px; border-radius: 10px; text-align: center; border: 1px solid #c3e6cb;">
              <h1 style="color: #155724; margin-bottom: 20px;">Welcome to Knowledge Sharing!</h1>
              <p style="color: #155724; font-size: 16px; line-height: 1.5;">
                We're excited to have you join our community of learners and mentors.
              </p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
              <h2 style="color: #333; margin-bottom: 15px;">Get Started</h2>
              <ul style="color: #6c757d; line-height: 1.6;">
                <li>Explore mentorship sessions</li>
                <li>Join discussions and share knowledge</li>
                <li>Connect with experts in your field</li>
                <li>Build your professional network</li>
              </ul>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="{{dashboardUrl}}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
            </div>
          </div>
        `,
        text: `
          Welcome to Knowledge Sharing Community!
          
          We're excited to have you join our community of learners and mentors.
          
          Get Started:
          - Explore mentorship sessions
          - Join discussions and share knowledge
          - Connect with experts in your field
          - Build your professional network
          
          Go to Dashboard: {{dashboardUrl}}
        `
      }
    };

    return templates[template] || {
      subject: 'Notification',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">${template}</div>`,
      text: template
    };
  }

  replacePlaceholders(template, data) {
    let content = template;
    
    // Replace simple placeholders {{variable}}
    content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || `{{${key}}}`;
    });

    // Replace conditional blocks {{#variable}}...{{/variable}}
    content = content.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
      return data[key] ? content : '';
    });

    return content;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  checkRateLimit(email) {
    const key = email.toLowerCase();
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxEmails = 10; // 10 emails per minute

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }

    const timestamps = this.rateLimiter.get(key);
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
    this.rateLimiter.set(key, validTimestamps);

    return validTimestamps.length < maxEmails;
  }

  async getUserEmailPreferences(userId) {
    try {
      let preferences = await prisma.emailPreferences.findUnique({
        where: { userId }
      });

      if (!preferences) {
        // Create default preferences
        preferences = await prisma.emailPreferences.create({
          data: { userId }
        });
      }

      return preferences;
    } catch (error) {
      logger.error('Error getting email preferences:', error);
      // Return default preferences
      return {
        mentorshipBookings: true,
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };
    }
  }

  async updateUserEmailPreferences(userId, preferences) {
    try {
      const updated = await prisma.emailPreferences.upsert({
        where: { userId },
        update: preferences,
        create: { userId, ...preferences }
      });

      return updated;
    } catch (error) {
      logger.error('Error updating email preferences:', error);
      throw error;
    }
  }

  async sendNotificationEmail(userId, notification) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const preferences = await this.getUserEmailPreferences(userId);

      // Check if user wants this type of notification
      const notificationType = notification.type.toLowerCase();
      let shouldSend = false;

      switch (notificationType) {
        case 'mentorship_booking':
          shouldSend = preferences.mentorshipBookings;
          break;
        case 'session_reminder':
          shouldSend = preferences.sessionReminders;
          break;
        case 'feedback_request':
          shouldSend = preferences.feedbackNotifications;
          break;
        case 'system_announcement':
          shouldSend = preferences.systemNotifications;
          break;
        default:
          shouldSend = false;
      }

      if (!shouldSend) {
        logger.info(`User ${userId} has opted out of ${notificationType} emails`);
        return null;
      }

      // Send the email
      const templateMap = {
        'MENTORSHIP_BOOKING': 'mentorship-booking',
        'SESSION_REMINDER': 'session-reminder',
        'FEEDBACK_REQUEST': 'feedback-request',
        'SYSTEM_ANNOUNCEMENT': 'system-notification'
      };

      const template = templateMap[notification.type] || 'system-notification';

      return await this.sendEmail({
        to: user.email,
        subject: notification.title,
        template,
        data: {
          userName: user.name,
          ...notification.data
        },
        priority: 2
      });

    } catch (error) {
      logger.error('Error sending notification email:', error);
      throw error;
    }
  }

  async getEmailQueueStats() {
    try {
      const stats = await prisma.emailQueue.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      return stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting email queue stats:', error);
      return {};
    }
  }

  async retryFailedEmails() {
    try {
      const failedEmails = await prisma.emailQueue.findMany({
        where: {
          status: 'failed',
          attempts: { lt: 3 }
        },
        orderBy: { createdAt: 'asc' },
        take: 5
      });

      const results = [];
      
      for (const email of failedEmails) {
        try {
          // Reset status to pending
          await prisma.emailQueue.update({
            where: { id: email.id },
            data: {
              status: 'pending',
              errorMessage: null,
              updatedAt: new Date()
            }
          });

          // Try to send again
          const result = await this.processEmail(email.id);
          results.push({ id: email.id, status: 'success', result });
        } catch (error) {
          results.push({ id: email.id, status: 'error', error: error.message });
        }
      }

      return results;
    } catch (error) {
      logger.error('Error retrying failed emails:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
