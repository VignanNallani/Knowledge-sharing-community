const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const mentorAvailabilityService = require('../services/mentorAvailability.service');
const router = express.Router();

// Create availability
router.post('/availability', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const availability = await mentorAvailabilityService.createAvailability({
      ...req.body,
      mentorId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: availability,
      message: 'Availability created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update availability
router.put('/availability/:availabilityId', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const availability = await mentorAvailabilityService.updateAvailability(
      req.params.availabilityId,
      req.body,
      req.user.id
    );
    
    res.json({
      success: true,
      data: availability,
      message: 'Availability updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete availability
router.delete('/availability/:availabilityId', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const result = await mentorAvailabilityService.deleteAvailability(
      req.params.availabilityId,
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

// Get mentor's availability
router.get('/availability', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const filters = {
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
      dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek) : undefined
    };

    const availability = await mentorAvailabilityService.getMentorAvailability(
      req.user.id,
      filters
    );
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get available time slots for booking
router.get('/availability/:mentorId/slots', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const duration = parseInt(req.query.duration) || 60;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const timeSlots = await mentorAvailabilityService.getAvailableTimeSlots(
      req.params.mentorId,
      startDate,
      endDate,
      duration
    );
    
    res.json({
      success: true,
      data: timeSlots
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk create availability
router.post('/availability/bulk', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const result = await mentorAvailabilityService.bulkCreateAvailability(
      req.user.id,
      req.body.availabilityList
    );
    
    res.status(201).json({
      success: true,
      data: result,
      message: `Created ${result.created.length} availability slots`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get availability summary
router.get('/availability/summary', authenticate, authorize(['MENTOR', 'ADMIN']), async (req, res) => {
  try {
    const summary = await mentorAvailabilityService.getAvailabilitySummary(req.user.id);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
