const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const mentorshipSessionService = require('../services/mentorshipSession.service');
const router = express.Router();

// Create a new mentorship session
router.post('/sessions', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const session = await mentorshipSessionService.createSession({
      ...req.body,
      mentorId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update session
router.put('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await mentorshipSessionService.updateSession(
      req.params.sessionId,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      data: session,
      message: 'Session updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel session
router.post('/sessions/:sessionId/cancel', authenticate, async (req, res) => {
  try {
    const session = await mentorshipSessionService.cancelSession(
      req.params.sessionId,
      req.user.id,
      req.body.reason
    );
    
    res.json({
      success: true,
      data: session,
      message: 'Session cancelled successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Complete session (mentor only)
router.post('/sessions/:sessionId/complete', authenticate, authorize(['MENTOR']), async (req, res) => {
  try {
    const session = await mentorshipSessionService.completeSession(
      req.params.sessionId,
      req.user.id
    );
    
    res.json({
      success: true,
      data: session,
      message: 'Session completed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get sessions for user
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };

    const result = await mentorshipSessionService.getSessions(
      req.user.id,
      req.user.role,
      filters
    );
    
    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get session by ID
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const session = await mentorshipSessionService.getSessionById(
      req.params.sessionId,
      req.user.id
    );
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Get session statistics
router.get('/sessions/stats', authenticate, async (req, res) => {
  try {
    const stats = await mentorshipSessionService.getSessionStats(
      req.user.id,
      req.user.role
    );
    
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

module.exports = router;
