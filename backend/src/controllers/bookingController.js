import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import bookingService from '../services/booking.service.js';
import notificationService from '../services/notification.service.js';
import { logger } from '../config/index.js';

// Mentor creates available slots
export const createSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.body;
  const mentorId = req.user.id;

  // Validate that user is a mentor
  if (req.user.role !== 'MENTOR') {
    return ApiResponse.forbidden(res, 'Only mentors can create slots');
  }

  // Validate time logic
  const startDateTime = new Date(`${date}T${startTime}`);
  const endDateTime = new Date(`${date}T${endTime}`);
  
  if (startDateTime >= endDateTime) {
    return ApiResponse.badRequest(res, 'End time must be after start time');
  }

  if (startDateTime <= new Date()) {
    return ApiResponse.badRequest(res, 'Cannot create slots in the past');
  }

  const slot = await bookingService.createSlot({
    mentorId,
    startAt: startDateTime,
    endAt: endDateTime
  });

  logger.info(`Slot created: ${slot.id} by mentor ${mentorId}`);
  return ApiResponse.created(res, slot, 'Slot created successfully');
});

// Get mentor's available slots (public)
export const getMentorSlots = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  const { date } = req.query;

  console.log('Controller received:', { mentorId, date });
  const slots = await bookingService.getMentorSlots(parseInt(mentorId), date);
  console.log('Controller returning slots:', slots.length, slots);
  
  return ApiResponse.success(res, slots, 'Slots retrieved successfully');
});

// Student books a slot
export const bookSlot = asyncHandler(async (req, res) => {
  const { slotId, topic } = req.body;
  const studentId = req.user.id;

  // Check if slot exists and is available
  const slot = await bookingService.getSlotById(slotId);
  
  if (!slot) {
    return ApiResponse.notFound(res, 'Slot not found');
  }

  if (slot.status !== 'OPEN') {
    return ApiResponse.badRequest(res, 'Slot is not available');
  }

  if (slot.mentorId === studentId) {
    return ApiResponse.badRequest(res, 'Cannot book your own slot');
  }

  // Create booking
  const booking = await bookingService.bookSlot({
    slotId,
    menteeId: studentId,
    topic
  });

  // Create notification for mentor
  try {
    await notificationService.createNotification(slot.mentorId, {
      type: 'BOOKING',
      message: `${req.user.name} booked a session with you for ${slot.startAt.toLocaleDateString()} at ${slot.startAt.toLocaleTimeString()}`,
      slotId: slotId
    });
    logger.info(`Notification created for mentor ${slot.mentorId} for booking ${booking.id}`);
  } catch (notificationError) {
    logger.error('Failed to create booking notification:', notificationError);
    // Don't fail the booking if notification fails
  }

  logger.info(`Booking created: ${booking.id} by student ${studentId} for slot ${slotId}`);
  return ApiResponse.created(res, booking, 'Booking confirmed successfully');
});

// Get my bookings (as student or mentor)
export const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  console.log('GETMYBOOKINGS - userId:', userId);

  const bookings = await bookingService.getUserBookings(userId);
  
  console.log('GETMYBOOKINGS - bookings found:', bookings.length);
  console.log('GETMYBOOKINGS - bookings data:', JSON.stringify(bookings, null, 2));
  
  return ApiResponse.success(res, bookings, 'Bookings retrieved successfully');
});

// Cancel booking
export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Check if booking exists and user has permission
  const booking = await bookingService.getBookingById(id);
  
  if (!booking) {
    return ApiResponse.notFound(res, 'Booking not found');
  }

  // Check if user is either the student or the mentor
  if (booking.menteeId !== userId && booking.slot.mentorId !== userId) {
    return ApiResponse.forbidden(res, 'You can only cancel your own bookings');
  }

  if (booking.status === 'CANCELLED') {
    return ApiResponse.badRequest(res, 'Booking is already cancelled');
  }

  if (booking.status === 'COMPLETED') {
    return ApiResponse.badRequest(res, 'Cannot cancel completed bookings');
  }

  // Check if booking can be cancelled (e.g., not too close to the slot time)
  const slotTime = new Date(booking.slot.startAt);
  const now = new Date();
  const hoursUntilSlot = (slotTime - now) / (1000 * 60 * 60);

  if (hoursUntilSlot < 2) {
    return ApiResponse.badRequest(res, 'Cannot cancel bookings less than 2 hours before the session');
  }

  const cancelledBooking = await bookingService.cancelBooking(id);

  // Create notification for the other party
  try {
    const otherUserId = booking.menteeId === userId ? booking.slot.mentorId : booking.menteeId;
    const userType = booking.menteeId === userId ? 'mentor' : 'student';
    
    await notificationService.createNotification(otherUserId, {
      type: 'BOOKING_CANCELLED',
      message: `${req.user.name} (${userType}) cancelled the session scheduled for ${slotTime.toLocaleDateString()} at ${slotTime.toLocaleTimeString()}`,
      slotId: booking.slotId
    });
    
    logger.info(`Cancellation notification created for user ${otherUserId}`);
  } catch (notificationError) {
    logger.error('Failed to create cancellation notification:', notificationError);
    // Don't fail the cancellation if notification fails
  }

  logger.info(`Booking cancelled: ${id} by user ${userId}`);
  return ApiResponse.success(res, cancelledBooking, 'Booking cancelled successfully');
});

// Update booking status (mentor only)
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const booking = await bookingService.updateBookingStatus(id, status, userId);
  
  return ApiResponse.success(res, booking, `Booking ${status.toLowerCase()} successfully`);
});
