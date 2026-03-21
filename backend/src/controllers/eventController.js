import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { paginate } from "../utils/pagination.js";
import eventService from "../services/event.service.js";

export const getEvents = asyncHandler(async (req, res) => {
  const result = await eventService.getEvents(req.query);

  return ApiResponse.success(res, { 
    message: 'Events fetched', 
    data: { events: result.events }, 
    meta: result.meta 
  });
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body, req.user.id);

  return ApiResponse.created(res, { message: 'Event created', data: event });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const updatedEvent = await eventService.updateEvent(id, req.body, req.user.id, req.user.role);

  return ApiResponse.success(res, { message: 'Event updated', data: updatedEvent });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await eventService.deleteEvent(id, req.user.id, req.user.role);
  
  return ApiResponse.success(res, { message: 'Event deleted', data: null });
});

export const joinEvent = asyncHandler(async (req, res) => {
  const attendee = await eventService.joinEvent(req.params.id, req.user.id);

  return ApiResponse.created(res, { message: 'Joined event', data: attendee });
});

export default {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
};
