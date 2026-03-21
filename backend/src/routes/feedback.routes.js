const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const feedbackService = require('../services/feedback.service');
const router = express.Router();

// Create feedback for a session
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const feedback = await feedbackService.createFeedback({
      ...req.body,
      menteeId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get feedback for a specific session
router.get('/feedback/session/:sessionId', authenticate, async (req, res) => {
  try {
    const feedback = await feedbackService.getFeedbackBySession(
      req.params.sessionId,
      req.user.id
    );
    
    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Get mentor's feedback
router.get('/feedback/mentor/:mentorId', authenticate, async (req, res) => {
  try {
    const filters = {
      rating: req.query.rating,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await feedbackService.getMentorFeedback(
      req.params.mentorId,
      filters
    );
    
    res.json({
      success: true,
      data: result.feedback,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get mentor statistics
router.get('/feedback/mentor/:mentorId/stats', authenticate, async (req, res) => {
  try {
    const stats = await feedbackService.getMentorStats(req.params.mentorId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update feedback (mentee only, within 24 hours)
router.put('/feedback/:feedbackId', authenticate, async (req, res) => {
  try {
    const feedback = await feedbackService.updateFeedback(
      req.params.feedbackId,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      data: feedback,
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete feedback (mentee only, within 24 hours)
router.delete('/feedback/:feedbackId', authenticate, async (req, res) => {
  try {
    const result = await feedbackService.deleteFeedback(
      req.params.feedbackId,
      req.user.id
    );
    
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

module.exports = router;
