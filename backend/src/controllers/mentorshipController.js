import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getOpenSlots,
  createSlot,
  bookSlot,
  countOpenSlots
} from "../services/mentorshipService.js";
import { paginate } from "../utils/pagination.js";

/**
 * GET /api/mentorship/slots
 */
export const getMentorshipSlots = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  const [slots, total] = await Promise.all([
    getOpenSlots({ skip, limit }),
    countOpenSlots()
  ]);
  
  return ApiResponse.success(res, { 
    message: 'Slots fetched', 
    data: { slots },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

/**
 * POST /api/mentorship/slots
 */
export const createMentorshipSlot = asyncHandler(async (req, res) => {
  const mentorId = req.user.id;
  const { startAt, endAt } = req.body;

  if (!startAt || !endAt) throw new ApiError(400, 'startAt and endAt are required');

  const slot = await createSlot({ mentorId, startAt, endAt });
  return ApiResponse.created(res, { message: 'Slot created', data: slot });
});

/**
 * POST /api/mentorship/book
 */
export const bookMentorshipSlot = asyncHandler(async (req, res) => {
  const menteeId = req.user.id;
  const { slotId } = req.body;

  if (!slotId) throw new ApiError(400, 'slotId is required');

  const booking = await bookSlot({ slotId, menteeId });
  return ApiResponse.created(res, { message: 'Slot booked', data: booking });
});
