const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const reminderService = require('../services/reminder.service');
const router = express.Router();

// Process pending reminders (admin only)
router.post('/reminders/process', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const results = await reminderService.processPendingReminders();
    
    res.json({
      success: true,
      data: results,
      message: `Processed ${results.length} reminders`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's reminders
router.get('/reminders', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      reminderType: req.query.reminderType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await reminderService.getReminders(
      req.user.id,
      req.user.role,
      filters
    );
    
    res.json({
      success: true,
      data: result.reminders,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Send specific reminder (admin only)
router.post('/reminders/:reminderId/send', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const reminder = await reminderService.sendReminder(req.params.reminderId);
    
    res.json({
      success: true,
      data: reminder,
      message: 'Reminder sent successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel reminders for a session
router.post('/reminders/session/:sessionId/cancel', authenticate, async (req, res) => {
  try {
    const result = await reminderService.cancelReminders(req.params.sessionId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Reschedule reminder
router.put('/reminders/:reminderId/reschedule', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    
    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        error: 'scheduledAt is required'
      });
    }

    const reminder = await reminderService.rescheduleReminder(
      req.params.reminderId,
      scheduledAt
    );
    
    res.json({
      success: true,
      data: reminder,
      message: 'Reminder rescheduled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
