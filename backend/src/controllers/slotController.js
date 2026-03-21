import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import slotService from '../services/slot.service.js';
import { Response } from '../utils/ResponseBuilder.js';

export const createSlot = asyncHandler(async (req, res) => {
  const mentorId = req.user.id;
  const slot = await slotService.createSlot(req.body, mentorId);
  return Response.created(res, slot, 'Slot created successfully');
});

export const listSlots = asyncHandler(async (req, res) => {
  const result = await slotService.getSlots(req.query);
  return Response.paginated(res, result.slots, {
    page: result.page,
    limit: result.totalPages > 0 ? result.slots.length : 0,
    total: result.total
  }, 'Slots fetched successfully');
});

export const bookSlot = asyncHandler(async (req, res) => {
  const menteeId = req.user.id;
  const { slotId } = req.body;
  
  if (!slotId) {
    throw new ApiError(400, 'slotId is required');
  }

  const booking = await slotService.bookSlot(slotId, menteeId);
  return Response.created(res, booking, 'Slot booked successfully');
});

export const cancelSlot = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { slotId } = req.params;
  
  const result = await slotService.cancelSlot(slotId, userId);
  return Response.success(res, result, 'Slot cancelled successfully');
});

export const getMySlots = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await slotService.getMySlots(userId, req.query);
  
  return Response.paginated(res, result.slots, {
    page: result.page,
    limit: result.totalPages > 0 ? result.slots.length : 0,
    total: result.total
  }, 'My slots fetched successfully');
});
