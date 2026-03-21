import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createSlot,
  getMentorSlots,
  bookSlot,
  getMyBookings,
  cancelBooking,
  updateBookingStatus
} from '../controllers/bookingController.js';
import getPrisma from '../config/prisma.js';

const router = express.Router();
const prisma = getPrisma();

// Mentor creates available slots
router.post('/slots', 
  authenticate,
  [
    body('date').isISO8601().withMessage('Valid date required'),
    body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Start time must be HH:MM format'),
    body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('End time must be HH:MM format')
  ],
  validate,
  createSlot
);

// Get mentor's available slots (public)
router.get('/slots/:mentorId', async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    const date = req.query.date; // e.g. "2026-03-15"
    
    console.log('SLOTS ROUTE HIT:', mentorId, date);
    console.log('REQ PARAMS:', req.params);
    console.log('REQ QUERY:', req.query);
    
    if (!date) {
      console.log('No date provided, returning empty array');
      return res.json({ success: true, data: { slots: [] } });
    }
    
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');
    
    console.log('DATE RANGE:', { start: start.toISOString(), end: end.toISOString() });
    
    const slots = await prisma.slot.findMany({
      where: {
        mentorId: mentorId,
        status: 'OPEN',
        startAt: { gte: start, lte: end }
      },
      orderBy: { startAt: 'asc' }
    });
    
    console.log('FOUND SLOTS:', slots.length);
    console.log('SLOT DETAILS:', slots.map(s => ({ id: s.id, startAt: s.startAt, status: s.status })));
    
    return res.json({ 
      success: true, 
      data: { slots } 
    });
  } catch (err) {
    console.error('SLOTS ERROR:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Student books a slot
router.post('/',
  authenticate,
  [
    body('slotId').isUUID().withMessage('Valid slot ID required')
  ],
  validate,
  async (req, res) => {
    try {
      console.log('STEP 1: Request received');
      console.log('Body:', req.body);
      console.log('User:', req.user?.id);
      
      const { slotId } = req.body;
      
      if (!slotId) {
        return res.status(400).json({ 
          success: false, 
          message: 'slotId is required' 
        });
      }
    
    console.log('STEP 2: Finding slot');
    const slot = await prisma.slot.findUnique({
      where: { id: slotId }
    });
    console.log('STEP 3: Slot found:', slot?.id);
    
    if (!slot) {
      return res.status(404).json({ 
        success: false, 
        message: 'Slot not found' 
      });
    }
    
    if (slot.status !== 'OPEN') {
      return res.status(400).json({ 
        success: false, 
        message: 'Slot is not available' 
      });
    }
    
    console.log('STEP 4: Creating booking');
    const booking = await prisma.booking.create({
      data: {
        slotId: slotId,
        menteeId: req.user.id,
        status: 'PENDING'
      }
    });
    console.log('STEP 5: Booking created:', booking.id);
    
    await prisma.slot.update({
      where: { id: slotId },
      data: { status: 'BOOKED' }
    });
    console.log('STEP 6: Slot marked booked');
    
    return res.status(201).json({ 
      success: true, 
      data: { booking } 
    });
    
  } catch (err) {
    console.error('BOOKING FAILED:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// Get my bookings (as student or mentor)
router.get('/my',
  authenticate,
  async (req, res) => {
    try {
      console.log('Fetching bookings for user:', req.user.id);
      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { menteeId: req.user.id },
            { slot: { mentorId: req.user.id } }
          ]
        },
        include: {
          slot: {
            include: {
              mentor: {
                select: { id: true, name: true, role: true }
              }
            }
          },
          mentee: {
            select: { id: true, name: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      console.log('Found bookings:', bookings.length);
      res.json({ success: true, data: { bookings } });
    } catch (err) {
      console.error('BOOKINGS ERROR:', err.message);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Cancel booking
router.patch('/:id/cancel',
  authenticate,
  [
    param('id').isUUID().withMessage('Valid booking ID required')
  ],
  validate,
  cancelBooking
);

// Update booking status (mentor only)
router.patch('/:id/status',
  authenticate,
  [
    param('id').isUUID().withMessage('Valid booking ID required'),
    body('status').isIn(['ACCEPTED', 'REJECTED']).withMessage('Status must be ACCEPTED or REJECTED')
  ],
  validate,
  updateBookingStatus
);

export default router;
