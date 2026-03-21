const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const emailService = require('../services/email.service');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 email requests per windowMs
  message: {
    error: 'Too many email requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all email routes
router.use(emailLimiter);

// Send email (protected endpoint)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, subject, template, data, priority = 1 } = req.body;

    // Validate required fields
    if (!to || !subject || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, template'
      });
    }

    // Validate email format
    if (!emailService.isValidEmail(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address'
      });
    }

    // Send email
    const result = await emailService.sendEmail({
      to,
      subject,
      template,
      data,
      priority
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Email queued successfully'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send bulk emails (admin only)
router.post('/bulk', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { emails, template, data, priority = 1 } = req.body;

    // Validate required fields
    if (!emails || !Array.isArray(emails) || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: emails (array), template'
      });
    }

    // Validate email addresses
    const invalidEmails = emails.filter(email => !emailService.isValidEmail(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email addresses',
        invalidEmails
      });
    }

    // Send bulk emails
    const results = [];
    
    for (const email of emails) {
      try {
        const result = await emailService.sendEmail({
          to: email,
          subject: req.body.subject || 'Notification',
          template,
          data,
          priority
        });
        results.push({ email, success: true, id: result.id });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

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
      message: `Processed ${results.length} emails (${successCount} successful, ${failureCount} failed)`
    });
  } catch (error) {
    console.error('Send bulk emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get email preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = await emailService.getUserEmailPreferences(req.user.id);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update email preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const preferences = req.body;

    // Validate preferences
    const validPreferences = [
      'mentorshipBookings',
      'sessionReminders',
      'feedbackNotifications',
      'weeklyDigest',
      'marketingEmails',
      'systemNotifications'
    ];

    const invalidPrefs = Object.keys(preferences).filter(key => !validPreferences.includes(key));
    if (invalidPrefs.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preference fields',
        invalidFields: invalidPrefs
      });
    }

    const updated = await emailService.updateUserEmailPreferences(req.user.id, preferences);
    
    res.json({
      success: true,
      data: updated,
      message: 'Email preferences updated successfully'
    });
  } catch (error) {
    console.error('Update email preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get email queue status (admin only)
router.get('/queue/status', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const stats = await emailService.getEmailQueueStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get email queue status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process email queue (admin only)
router.post('/queue/process', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const results = await emailService.processEmailQueue();
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failureCount,
        results
      },
      message: `Processed ${results.length} emails (${successCount} successful, ${failureCount} failed)`
    });
  } catch (error) {
    console.error('Process email queue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry failed emails (admin only)
router.post('/queue/retry', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const results = await emailService.retryFailedEmails();
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failureCount,
        results
      },
      message: `Retried ${results.length} failed emails (${successCount} successful, ${failureCount} still failed)`
    });
  } catch (error) {
    console.error('Retry failed emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send test email (for testing purposes)
router.post('/test', authenticate, async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Send a test email
    const result = await emailService.sendEmail({
      to,
      subject: 'Test Email from Knowledge Sharing',
      template: 'welcome-email',
      data: {
        userName: req.user.name,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      },
      priority: 1
    });

    res.json({
      success: true,
      data: result,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Email templates preview (admin only)
router.get('/templates/:template', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { template } = req.params;
    const { data = {} } = req.query;

    const emailContent = await emailService.getEmailContent(template, data);
    
    res.json({
      success: true,
      data: emailContent
    });
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
