import { PrismaClient } from '@prisma/client';
import { ErrorFactory } from '../utils/ApiError.js';
import { logger } from '../config/index.js';

const prisma = new PrismaClient();

class BookingService {
  // Mentor creates available slot
  async createSlot(slotData) {
    try {
      const slot = await prisma.slot.create({
        data: {
          mentorId: slotData.mentorId,
          startAt: slotData.startAt,
          endAt: slotData.endAt,
          status: 'OPEN'
        },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return slot;
    } catch (error) {
      logger.error('Error creating slot:', error);
      throw ErrorFactory.databaseOperationFailed('createSlot', error);
    }
  }

  // Get mentor's available slots
  async getMentorSlots(mentorId, dateFilter) {
    try {
      const whereClause = {
        mentorId,
        status: 'OPEN'
      };

      // Filter by specific date if provided
      if (dateFilter) {
        // Use UTC date to avoid timezone issues
        const targetDate = new Date(dateFilter + 'T00:00:00.000Z')
        const startOfDay = new Date(targetDate)
        startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setUTCHours(23, 59, 59, 999)
        
        console.log('Looking for slots:', { mentorId, date: dateFilter, startOfDay, endOfDay });
        
        whereClause.startAt = {
          gte: startOfDay,
          lte: endOfDay
        };
      } else {
        // Default: show slots for next 30 days
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        whereClause.startAt = {
          gte: now,
          lte: thirtyDaysLater
        };
      }

      const slots = await prisma.slot.findMany({
        where: whereClause,
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              email: true,
              bio: true,
              skills: true
            }
          }
        },
        orderBy: {
          startAt: 'asc'
        }
      });

      return slots;
    } catch (error) {
      logger.error('Error fetching mentor slots:', error);
      throw ErrorFactory.databaseOperationFailed('getMentorSlots', error);
    }
  }

  // Get slot by ID
  async getSlotById(slotId) {
    try {
      const slot = await prisma.slot.findUnique({
        where: { id: slotId },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          booking: true
        }
      });

      return slot;
    } catch (error) {
      logger.error('Error fetching slot:', error);
      throw ErrorFactory.databaseOperationFailed('getSlotById', error);
    }
  }

  // Book a slot
  async bookSlot(bookingData) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Check if slot is still available
        const slot = await tx.slot.findUnique({
          where: { id: bookingData.slotId }
        });

        if (!slot) {
          throw ErrorFactory.notFound('Slot');
        }

        if (slot.status !== 'OPEN') {
          throw ErrorFactory.badRequest('Slot is no longer available');
        }

        // Create booking
        const booking = await tx.booking.create({
          data: {
            slotId: bookingData.slotId,
            menteeId: bookingData.menteeId,
            status: 'CONFIRMED'
          },
          include: {
            slot: {
              include: {
                mentor: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            },
            mentee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        // Update slot status
        await tx.slot.update({
          where: { id: bookingData.slotId },
          data: { status: 'BOOKED' }
        });

        return booking;
      });

      return result;
    } catch (error) {
      logger.error('Error booking slot:', error);
      
      // Re-throw known errors
      if (error.code === 'P2002') {
        throw ErrorFactory.badRequest('Slot is already booked');
      }
      
      throw ErrorFactory.databaseOperationFailed('bookSlot', error);
    }
  }

  // Get user bookings (as student or mentor)
  async getUserBookings(userId) {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { menteeId: userId },
            { slot: { mentorId: userId } }
          ]
        },
        include: {
          slot: {
            include: {
              mentor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  bio: true,
                  skills: true
                }
              }
            }
          },
          mentee: {
            select: {
              id: true,
              name: true,
              email: true,
              bio: true,
              skills: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add user role context to each booking
      return bookings.map(booking => ({
        ...booking,
        userRole: booking.menteeId === userId ? 'STUDENT' : 'MENTOR',
        otherParty: booking.menteeId === userId ? booking.slot.mentor : booking.mentee
      }));
    } catch (error) {
      logger.error('Error fetching user bookings:', error);
      throw ErrorFactory.databaseOperationFailed('getUserBookings', error);
    }
  }

  // Cancel a booking
  async cancelBooking(bookingId, userId) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          mentee: true
        }
      });

      if (!booking) {
        throw ErrorFactory.notFound('Booking');
      }

      // Check if user owns this booking
      if (booking.menteeId !== userId && booking.slot.mentorId !== userId) {
        throw ErrorFactory.forbidden('You can only cancel your own bookings');
      }

      if (booking.status === 'CANCELLED') {
        throw ErrorFactory.badRequest('Booking is already cancelled');
      }

      if (booking.status === 'COMPLETED') {
        throw ErrorFactory.badRequest('Cannot cancel completed bookings');
      }

      // Check if booking can be cancelled (e.g., not too close to the slot time)
      const slotTime = new Date(booking.slot.startAt);
      const now = new Date();
      const hoursUntilSlot = (slotTime - now) / (1000 * 60 * 60);

      if (hoursUntilSlot < 2) {
        throw ErrorFactory.badRequest('Cannot cancel bookings less than 2 hours before the session');
      }

      const cancelledBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      // Update slot status back to OPEN
      await prisma.slot.update({
        where: { id: booking.slotId },
        data: { 
          status: 'OPEN',
          updatedAt: new Date()
        }
      });

      return cancelledBooking;
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      throw ErrorFactory.databaseOperationFailed('cancelBooking', error);
    }
  }

  // Update booking status (mentor only)
  async updateBookingStatus(bookingId, status, userId) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          slot: true,
          mentee: true
        }
      });

      if (!booking) {
        throw ErrorFactory.notFound('Booking');
      }

      // Check if user is the mentor of this booking
      if (booking.slot.mentorId !== userId) {
        throw ErrorFactory.forbidden('Only the mentor can update booking status');
      }

      if (booking.status !== 'PENDING') {
        throw ErrorFactory.badRequest('Can only update PENDING bookings');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          status,
          updatedAt: new Date()
        }
      });

      // Create notification for student
      await notificationService.createNotification(booking.menteeId, {
        type: status === 'ACCEPTED' ? 'BOOKING_ACCEPTED' : 'BOOKING_REJECTED',
        message: `${booking.slot.mentor.name} ${status.toLowerCase()} your session request for ${booking.slot.startAt.toLocaleDateString()} at ${booking.slot.startAt.toLocaleTimeString()}`,
        slotId: booking.slotId
      });

      logger.info(`Booking ${bookingId} ${status.toLowerCase()} by mentor ${userId}`);
      return updatedBooking;
    } catch (error) {
      logger.error('Error updating booking status:', error);
      throw ErrorFactory.databaseOperationFailed('updateBookingStatus', error);
    }
  }

  // Create sample slots for mentors (for seeding)
  async createSampleSlots(mentorId, daysAhead = 7) {
    try {
      const slots = [];
      const times = ['10:00', '14:00', '16:00', '18:00'];
      
      for (let day = 1; day <= daysAhead; day++) {
        const date = new Date();
        date.setDate(date.getDate() + day);
        
        // Pick 2-3 random times per day
        const numSlots = Math.floor(Math.random() * 2) + 2; // 2-3 slots
        const selectedTimes = times
          .sort(() => Math.random() - 0.5)
          .slice(0, numSlots);
        
        for (const time of selectedTimes) {
          const [hours, minutes] = time.split(':').map(Number);
          const startAt = new Date(date);
          startAt.setHours(hours, minutes, 0, 0);
          
          const endAt = new Date(startAt);
          endAt.setHours(endAt.getHours() + 1); // 1 hour slots
          
          const slot = await this.createSlot({
            mentorId,
            startAt,
            endAt
          });
          
          slots.push(slot);
        }
      }
      
      return slots;
    } catch (error) {
      logger.error('Error creating sample slots:', error);
      throw ErrorFactory.databaseOperationFailed('createSampleSlots', error);
    }
  }
}

export default new BookingService();
