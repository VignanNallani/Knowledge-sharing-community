const { PrismaClient } = require('@prisma/client');
const emailService = require('../../src/services/email.service');

// Mock nodemailer
jest.mock('nodemailer');
jest.mock('../../src/utils/logger.util');

describe('EmailService', () => {
  let mockPrisma;
  let mockTransporter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = {
      emailQueue: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn()
      },
      emailPreferences: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      }
    };
    
    PrismaClient.mockImplementation(() => mockPrisma);

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };
    
    emailService.transporter = mockTransporter;
    emailService.rateLimiter.clear();
  });

  describe('sendEmail', () => {
    it('should queue email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome-email',
        data: { userName: 'John' }
      };

      const mockQueue = {
        id: 1,
        toEmail: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome-email',
        data: { userName: 'John' },
        priority: 1,
        status: 'pending',
        scheduledAt: new Date()
      };

      mockPrisma.emailQueue.create.mockResolvedValue(mockQueue);

      const result = await emailService.sendEmail(emailData);

      expect(mockPrisma.emailQueue.create).toHaveBeenCalledWith({
        data: {
          toEmail: 'test@example.com',
          subject: 'Test Email',
          template: 'welcome-email',
          data: { userName: 'John' },
          priority: 1,
          scheduledAt: expect.any(Date),
          status: 'pending'
        }
      });

      expect(result).toEqual(mockQueue);
    });

    it('should validate email address', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Email',
        template: 'welcome-email'
      };

      await expect(emailService.sendEmail(emailData)).rejects.toThrow('Invalid email address');
    });

    it('should check rate limiting', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome-email'
      };

      // First email should succeed
      mockPrisma.emailQueue.create.mockResolvedValue({ id: 1 });
      await emailService.sendEmail(emailData);

      // Add multiple emails to rate limiter
      for (let i = 0; i < 10; i++) {
        emailService.checkRateLimit('test@example.com');
      }

      // Next email should fail rate limit
      await expect(emailService.sendEmail(emailData)).rejects.toThrow('Rate limit exceeded for this email address');
    });

    it('should handle high priority emails immediately', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Urgent Email',
        template: 'welcome-email',
        priority: 3
      };

      const mockQueue = {
        id: 1,
        status: 'pending'
      };

      mockPrisma.emailQueue.create.mockResolvedValue(mockQueue);
      mockPrisma.emailQueue.findUnique.mockResolvedValue(mockQueue);
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });
      mockPrisma.emailQueue.update.mockResolvedValue({
        ...mockQueue,
        status: 'sent',
        sentAt: new Date()
      });

      const result = await emailService.sendEmail(emailData);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(result.status).toBe('sent');
    });
  });

  describe('processEmail', () => {
    it('should send email successfully', async () => {
      const mockEmail = {
        id: 1,
        toEmail: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome-email',
        data: { userName: 'John' },
        status: 'pending',
        scheduledAt: new Date()
      };

      mockPrisma.emailQueue.findUnique.mockResolvedValue(mockEmail);
      mockPrisma.emailQueue.update.mockResolvedValue({
        ...mockEmail,
        status: 'sent',
        sentAt: new Date()
      });

      const result = await emailService.processEmail(1);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: expect.any(String),
        to: 'test@example.com',
        subject: 'Test Email',
        html: expect.any(String),
        text: expect.any(String)
      });

      expect(result.status).toBe('sent');
    });

    it('should handle email not found', async () => {
      mockPrisma.emailQueue.findUnique.mockResolvedValue(null);

      await expect(emailService.processEmail(1)).rejects.toThrow('Email not found');
    });

    it('should handle already sent email', async () => {
      const mockEmail = {
        id: 1,
        status: 'sent'
      };

      mockPrisma.emailQueue.findUnique.mockResolvedValue(mockEmail);

      const result = await emailService.processEmail(1);

      expect(result.status).toBe('sent');
    });

    it('should handle cancelled email', async () => {
      const mockEmail = {
        id: 1,
        status: 'cancelled'
      };

      mockPrisma.emailQueue.findUnique.mockResolvedValue(mockEmail);

      const result = await emailService.processEmail(1);

      expect(result.status).toBe('cancelled');
    });

    it('should handle sending errors', async () => {
      const mockEmail = {
        id: 1,
        toEmail: 'test@example.com',
        status: 'pending',
        scheduledAt: new Date()
      };

      mockPrisma.emailQueue.findUnique.mockResolvedValue(mockEmail);
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));
      mockPrisma.emailQueue.update.mockResolvedValue({
        ...mockEmail,
        attempts: 1,
        errorMessage: 'SMTP Error',
        status: 'failed'
      });

      await expect(emailService.processEmail(1)).rejects.toThrow('SMTP Error');
    });
  });

  describe('processEmailQueue', () => {
    it('should process pending emails', async () => {
      const mockEmails = [
        {
          id: 1,
          toEmail: 'test1@example.com',
          status: 'pending',
          scheduledAt: new Date()
        },
        {
          id: 2,
          toEmail: 'test2@example.com',
          status: 'pending',
          scheduledAt: new Date()
        }
      ];

      mockPrisma.emailQueue.findMany.mockResolvedValue(mockEmails);
      mockPrisma.emailQueue.findUnique
        .mockResolvedValueOnce(mockEmails[0])
        .mockResolvedValueOnce(mockEmails[1]);
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'test-message-1' })
        .mockResolvedValueOnce({ messageId: 'test-message-2' });
      mockPrisma.emailQueue.update
        .mockResolvedValueOnce({ id: 1, status: 'sent', sentAt: new Date() })
        .mockResolvedValueOnce({ id: 2, status: 'sent', sentAt: new Date() });

      const results = await emailService.processEmailQueue();

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
    });

    it('should handle processing errors gracefully', async () => {
      const mockEmails = [
        {
          id: 1,
          toEmail: 'test1@example.com',
          status: 'pending',
          scheduledAt: new Date()
        },
        {
          id: 2,
          toEmail: 'test2@example.com',
          status: 'pending',
          scheduledAt: new Date()
        }
      ];

      mockPrisma.emailQueue.findMany.mockResolvedValue(mockEmails);
      mockPrisma.emailQueue.findUnique
        .mockResolvedValueOnce(mockEmails[0])
        .mockResolvedValueOnce(mockEmails[1]);
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'test-message-1' })
        .mockRejectedValueOnce(new Error('SMTP Error'));
      mockPrisma.emailQueue.update
        .mockResolvedValueOnce({ id: 1, status: 'sent', sentAt: new Date() })
        .mockResolvedValueOnce({ id: 2, attempts: 1, errorMessage: 'SMTP Error', status: 'failed' });

      const results = await emailService.processEmailQueue();

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('error');
    });
  });

  describe('getEmailContent', () => {
    it('should return email content for valid template', async () => {
      const template = 'welcome-email';
      const data = { userName: 'John', dashboardUrl: 'http://localhost:3000/dashboard' };

      const content = await emailService.getEmailContent(template, data);

      expect(content).toHaveProperty('html');
      expect(content).toHaveProperty('text');
      expect(content.html).toContain('John');
      expect(content.html).toContain('http://localhost:3000/dashboard');
      expect(content.text).toContain('John');
    });

    it('should handle unknown template', async () => {
      const template = 'unknown-template';
      const data = { test: 'value' };

      const content = await emailService.getEmailContent(template, data);

      expect(content.html).toContain('unknown-template');
      expect(content.text).toContain('unknown-template');
    });

    it('should cache template content', async () => {
      const template = 'welcome-email';
      const data = { userName: 'John' };

      // First call should populate cache
      await emailService.getEmailContent(template, data);
      
      // Second call should use cache
      await emailService.getEmailContent(template, data);

      // getTemplate should only be called once
      expect(emailService.getTemplate).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserEmailPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 1,
        userId: 1,
        mentorshipBookings: true,
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };

      mockPrisma.emailPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await emailService.getUserEmailPreferences(1);

      expect(result).toEqual(mockPreferences);
    });

    it('should create default preferences if none exist', async () => {
      mockPrisma.emailPreferences.findUnique.mockResolvedValue(null);
      const mockDefaultPreferences = {
        id: 1,
        userId: 1,
        mentorshipBookings: true,
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };

      mockPrisma.emailPreferences.create.mockResolvedValue(mockDefaultPreferences);

      const result = await emailService.getUserEmailPreferences(1);

      expect(result).toEqual(mockDefaultPreferences);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.emailPreferences.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await emailService.getUserEmailPreferences(1);

      expect(result).toEqual({
        mentorshipBookings: true,
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      });
    });
  });

  describe('updateUserEmailPreferences', () => {
    it('should update existing preferences', async () => {
      const preferences = {
        mentorshipBookings: false,
        weeklyDigest: true
      };

      const mockUpdated = {
        id: 1,
        userId: 1,
        ...preferences
      };

      mockPrisma.emailPreferences.upsert.mockResolvedValue(mockUpdated);

      const result = await emailService.updateUserEmailPreferences(1, preferences);

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.emailPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 1 },
        update: preferences,
        create: { userId: 1, ...preferences }
      });
    });

    it('should handle update errors', async () => {
      const preferences = { mentorshipBookings: false };

      mockPrisma.emailPreferences.upsert.mockRejectedValue(new Error('Update error'));

      await expect(emailService.updateUserEmailPreferences(1, preferences))
        .rejects.toThrow('Update error');
    });
  });

  describe('sendNotificationEmail', () => {
    it('should send notification email if user has preferences enabled', async () => {
      const userId = 1;
      const notification = {
        type: 'MENTORSHIP_BOOKING',
        title: 'Session Booked',
        message: 'Your session has been booked',
        data: { sessionId: 1 }
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John Doe'
      };

      const mockPreferences = {
        mentorshipBookings: true,
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.emailPreferences.findUnique.mockResolvedValue(mockPreferences);
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      const result = await emailService.sendNotificationEmail(userId, notification);

      expect(result).toBeDefined();
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should not send email if user has opted out', async () => {
      const userId = 1;
      const notification = {
        type: 'MENTORSHIP_BOOKING',
        title: 'Session Booked',
        message: 'Your session has been booked'
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'John Doe'
      };

      const mockPreferences = {
        mentorshipBookings: false, // Opted out
        sessionReminders: true,
        feedbackNotifications: true,
        weeklyDigest: false,
        marketingEmails: false,
        systemNotifications: true
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.emailPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await emailService.sendNotificationEmail(userId, notification);

      expect(result).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const userId = 1;
      const notification = {
        type: 'MENTORSHIP_BOOKING',
        title: 'Session Booked',
        message: 'Your session has been booked'
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(emailService.sendNotificationEmail(userId, notification))
        .rejects.toThrow('User not found');
    });
  });

  describe('getEmailQueueStats', () => {
    it('should return email queue statistics', async () => {
      const mockStats = [
        { status: 'pending', _count: { status: 5 } },
        { status: 'sent', _count: { status: 10 } },
        { status: 'failed', _count: { status: 2 } }
      ];

      mockPrisma.emailQueue.groupBy.mockResolvedValue(mockStats);

      const result = await emailService.getEmailQueueStats();

      expect(result).toEqual({
        pending: 5,
        sent: 10,
        failed: 2
      });
    });

    it('should handle empty queue', async () => {
      mockPrisma.emailQueue.groupBy.mockResolvedValue([]);

      const result = await emailService.getEmailQueueStats();

      expect(result).toEqual({});
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails', async () => {
      const mockFailedEmails = [
        {
          id: 1,
          status: 'failed',
          attempts: 1
        },
        {
          id: 2,
          status: 'failed',
          attempts: 2
        }
      ];

      mockPrisma.emailQueue.findMany.mockResolvedValue(mockFailedEmails);
      mockPrisma.emailQueue.update
        .mockResolvedValueOnce({ id: 1, status: 'pending', errorMessage: null })
        .mockResolvedValueOnce({ id: 2, status: 'pending', errorMessage: null });
      mockPrisma.emailQueue.findUnique
        .mockResolvedValueOnce({ id: 1, status: 'pending' })
        .mockResolvedValueOnce({ id: 2, status: 'pending' });
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'retry-1' })
        .mockResolvedValueOnce({ messageId: 'retry-2' });
      mockPrisma.emailQueue.update
        .mockResolvedValueOnce({ id: 1, status: 'sent', sentAt: new Date() })
        .mockResolvedValueOnce({ id: 2, status: 'sent', sentAt: new Date() });

      const results = await emailService.retryFailedEmails();

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
    });

    it('should handle no failed emails', async () => {
      mockPrisma.emailQueue.findMany.mockResolvedValue([]);

      const results = await emailService.retryFailedEmails();

      expect(results).toEqual([]);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(emailService.isValidEmail('test@example.com')).toBe(true);
      expect(emailService.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(emailService.isValidEmail('user+tag@domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(emailService.isValidEmail('invalid-email')).toBe(false);
      expect(emailService.isValidEmail('test@')).toBe(false);
      expect(emailService.isValidEmail('@domain.com')).toBe(false);
      expect(emailService.isValidEmail('')).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow emails within rate limit', () => {
      // First email should be allowed
      expect(emailService.checkRateLimit('test@example.com')).toBe(true);
      
      // Add some timestamps
      for (let i = 0; i < 5; i++) {
        emailService.checkRateLimit('test@example.com');
      }
      
      // Should still be allowed
      expect(emailService.checkRateLimit('test@example.com')).toBe(true);
    });

    it('should block emails exceeding rate limit', () => {
      // Add emails up to rate limit
      for (let i = 0; i < 10; i++) {
        emailService.checkRateLimit('test@example.com');
      }
      
      // Next email should be blocked
      expect(emailService.checkRateLimit('test@example.com')).toBe(false);
    });

    it('should handle different email addresses separately', () => {
      // Add emails to first address up to limit
      for (let i = 0; i < 10; i++) {
        emailService.checkRateLimit('test1@example.com');
      }
      
      // First address should be blocked
      expect(emailService.checkRateLimit('test1@example.com')).toBe(false);
      
      // Second address should still be allowed
      expect(emailService.checkRateLimit('test2@example.com')).toBe(true);
    });
  });
});
