import prisma from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import slotRepository from '../repositories/slot.repo.js';
import userRepository from '../repositories/user.repo.js';

class SlotService {
  async createSlot(slotData, mentorId) {
    const { start, end } = slotData;

    if (!start || !end) {
      throw new ApiError(400, 'start and end are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) {
      throw new ApiError(400, 'Invalid start/end dates');
    }

    if (startDate <= new Date()) {
      throw new ApiError(400, 'Start time must be in the future');
    }

    const mentor = await userRepository.findUserById(mentorId, { role: true });
    if (!mentor || mentor.role !== 'MENTOR') {
      throw new ApiError(403, 'Only mentors can create slots');
    }

    const overlappingSlot = await slotRepository.findOverlappingSlot({
      mentorId,
      start: startDate,
      end: endDate,
    });

    if (overlappingSlot) {
      throw new ApiError(400, 'Slot overlaps with existing slot');
    }

    const slot = await slotRepository.createSlot({
      mentorId,
      start: startDate,
      end: endDate,
    });

    return slot;
  }

  async listSlots(query) {
    const { mentorId, status, dateFrom, dateTo } = query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (mentorId) where.mentorId = Number(mentorId);
    
    if (dateFrom || dateTo) {
      where.start = {};
      if (dateFrom) where.start.gte = new Date(dateFrom);
      if (dateTo) where.start.lte = new Date(dateTo);
    }

    const slots = await slotRepository.findSlots({
      where,
      orderBy: { start: 'asc' },
      include: {
        mentor: { select: { id: true, name: true, profileImage: true } },
        booking: {
          include: {
            mentee: { select: { id: true, name: true, profileImage: true } },
          },
        },
      },
    });

    return { slots };
  }

  async bookSlot(slotId, menteeId) {
    if (!slotId) {
      throw new ApiError(400, 'slotId required');
    }

    return await prisma.$transaction(async (tx) => {
      // Lock the slot for this transaction to prevent race conditions
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        select: {
          id: true,
          status: true,
          mentorId: true,
          start: true,
          booking: true
        }
      });

      if (!slot) {
        throw new ApiError(404, 'Slot not found');
      }

      if (slot.status !== 'OPEN') {
        throw new ApiError(400, 'Slot not available');
      }

      if (slot.mentorId === menteeId) {
        throw new ApiError(400, 'Cannot book your own slot');
      }

      if (slot.start <= new Date()) {
        throw new ApiError(400, 'Cannot book past slots');
      }

      // Check for existing booking within transaction
      const existingBooking = await tx.booking.findFirst({
        where: { menteeId, slotId }
      });

      if (existingBooking) {
        throw new ApiError(400, 'You have already booked this slot');
      }

      // Atomic operations: both must succeed or both fail
      const [booking] = await Promise.all([
        tx.booking.create({
          data: {
            slotId: slot.id,
            menteeId,
          },
          include: {
            slot: {
              include: {
                mentor: { select: { id: true, name: true, profileImage: true } },
              },
            },
            mentee: { select: { id: true, name: true, profileImage: true } },
          },
        }),
        tx.slot.update({
          where: { id: slotId },
          data: { status: 'BOOKED' }
        })
      ]);

      return booking;
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 10000 // 10 second timeout
    });
  }

  async cancelSlot(slotId, userId, userRole) {
    return await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { booking: true }
      });
      
      if (!slot) {
        throw new ApiError(404, 'Slot not found');
      }

      // Service-layer authorization check
      if (slot.mentorId !== userId && userRole !== 'ADMIN') {
        throw new ApiError(403, 'Not authorized to cancel this slot');
      }

      if (slot.status === 'CANCELLED') {
        throw new ApiError(400, 'Slot already cancelled');
      }

      if (slot.status === 'BOOKED' && slot.start <= new Date()) {
        throw new ApiError(400, 'Cannot cancel past or ongoing slots');
      }

      // Atomic operations: update slot and delete booking
      const [updatedSlot] = await Promise.all([
        tx.slot.update({
          where: { id: slotId },
          data: { status: 'CANCELLED' }
        }),
        slot.booking ? tx.booking.delete({
          where: { id: slot.booking.id }
        }) : Promise.resolve()
      ]);

      return { message: 'Slot cancelled successfully' };
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 5000
    });
  }

  async getMySlots(userId, role, query) {
    const { status, dateFrom, dateTo } = query;

    const where = role === 'MENTOR' ? { mentorId: userId } : {};
    if (status) where.status = status.toUpperCase();
    
    if (dateFrom || dateTo) {
      where.start = {};
      if (dateFrom) where.start.gte = new Date(dateFrom);
      if (dateTo) where.start.lte = new Date(dateTo);
    }

    const slots = await slotRepository.findSlots({
      where,
      orderBy: { start: 'asc' },
      include: {
        mentor: { select: { id: true, name: true, profileImage: true } },
        booking: role !== 'MENTOR' ? {
          include: {
            mentee: { select: { id: true, name: true, profileImage: true } },
          },
        } : false,
      },
    });

    return { slots };
  }

  async getSlotById(slotId) {
    const slot = await slotRepository.findSlotById(slotId, {
      include: {
        mentor: { select: { id: true, name: true, profileImage: true } },
        booking: {
          include: {
            mentee: { select: { id: true, name: true, profileImage: true } },
          },
        },
      },
    });

    if (!slot) {
      throw new ApiError(404, 'Slot not found');
    }

    return slot;
  }

  async updateSlot(slotId, updateData, userId) {
    const slot = await slotRepository.findSlotById(slotId);
    if (!slot) {
      throw new ApiError(404, 'Slot not found');
    }

    if (slot.mentorId !== userId) {
      throw new ApiError(403, 'Not authorized to update this slot');
    }

    if (slot.status !== 'OPEN') {
      throw new ApiError(400, 'Can only update open slots');
    }

    const { start, end } = updateData;
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate) || isNaN(endDate) || startDate >= endDate) {
        throw new ApiError(400, 'Invalid start/end dates');
      }

      if (startDate <= new Date()) {
        throw new ApiError(400, 'Start time must be in the future');
      }

      const overlappingSlot = await slotRepository.findOverlappingSlot({
        mentorId: userId,
        start: startDate,
        end: endDate,
        excludeId: slotId,
      });

      if (overlappingSlot) {
        throw new ApiError(400, 'Slot overlaps with existing slot');
      }
    }

    const updatedSlot = await slotRepository.updateSlot(slotId, updateData);
    return updatedSlot;
  }
}

export default new SlotService();
