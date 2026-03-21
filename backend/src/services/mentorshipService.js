
import { ApiError } from "../utils/ApiError.js";
import { 
  findSlots, 
  createSlot as createSlotRepo, 
  findSlotById,
  updateSlotStatus,
  createBooking,
  countSlots
} from "../repositories/slot.repo.js";
import prisma from "../config/prisma.js";

/**
 * Get all open mentorship slots
 */
export const getOpenSlots = async ({ skip = 0, limit = 20 } = {}) => {
  return findSlots({
    where: { status: "OPEN" },
    skip,
    take: limit,
    include: {
      mentor: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { startAt: "asc" }
  });
};

/**
 * Mentor creates a slot
 */
export const createSlot = async ({ mentorId, startAt, endAt }) => {
  return createSlotRepo({
    mentorId,
    startAt,
    endAt
  });
};

/**
 * Book a mentorship slot
 */
export const bookSlot = async ({ slotId, menteeId }) => {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({ where: { id: slotId } });

    if (!slot || slot.status !== "OPEN") {
      throw new ApiError(400, "Slot not available");
    }

    const booking = await tx.booking.create({
      data: { slotId, menteeId }
    });

    await tx.slot.update({
      where: { id: slotId },
      data: { status: "BOOKED" }
    });

    return booking;
  });
};

export const countOpenSlots = async () => {
  return countSlots({ where: { status: "OPEN" } });
};
