import prisma from '../config/prisma.js';

export const findSlotById = (slotId, options = {}) =>
  prisma.slot.findUnique({
    where: { id: slotId },
    ...options,
  });

export const findSlots = (options = {}) =>
  prisma.slot.findMany({
    ...options,
  });

export const createSlot = (data) =>
  prisma.slot.create({
    data,
    include: {
      mentor: { select: { id: true, name: true, profileImage: true } },
    },
  });

export const updateSlot = (slotId, data) =>
  prisma.slot.update({
    where: { id: slotId },
    data,
    include: {
      mentor: { select: { id: true, name: true, profileImage: true } },
    },
  });

export const updateSlotStatus = (slotId, status) =>
  prisma.slot.update({
    where: { id: slotId },
    data: { status },
  });

export const deleteSlot = (slotId) =>
  prisma.slot.delete({
    where: { id: slotId },
  });

export const findOverlappingSlot = ({ mentorId, start, end, excludeId }) =>
  prisma.slot.findFirst({
    where: {
      mentorId,
      status: 'OPEN',
      OR: [
        {
          AND: [
            { start: { lte: start } },
            { end: { gt: start } },
          ],
        },
        {
          AND: [
            { start: { lt: end } },
            { end: { gte: end } },
          ],
        },
        {
          AND: [
            { start: { gte: start } },
            { end: { lte: end } },
          ],
        },
      ],
      ...(excludeId && { id: { not: excludeId } }),
    },
  });

export const createBooking = (data) =>
  prisma.booking.create({
    data,
    include: {
      slot: {
        include: {
          mentor: { select: { id: true, name: true, profileImage: true } },
        },
      },
      mentee: { select: { id: true, name: true, profileImage: true } },
    },
  });

export const deleteBooking = (bookingId) =>
  prisma.booking.delete({
    where: { id: bookingId },
  });

export const countSlots = (where = {}) =>
  prisma.slot.count({ where });

export const findBookingByMentee = (menteeId, slotId) =>
  prisma.booking.findFirst({
    where: { menteeId, slotId },
  });

export const findBookingsByMentor = (mentorId, options = {}) =>
  prisma.booking.findMany({
    where: {
      slot: { mentorId },
    },
    ...options,
  });

export const findBookingsByMentee = (menteeId, options = {}) =>
  prisma.booking.findMany({
    where: { menteeId },
    ...options,
  });

export default {
  findSlotById,
  findSlots,
  createSlot,
  updateSlot,
  updateSlotStatus,
  deleteSlot,
  findOverlappingSlot,
  createBooking,
  deleteBooking,
  countSlots,
  findBookingByMentee,
  findBookingsByMentor,
  findBookingsByMentee,
};
