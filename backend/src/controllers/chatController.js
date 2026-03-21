import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import chatService from '../services/chat.service.js';

export const getThreads = asyncHandler(async (req, res) => {
  const result = await chatService.getThreads(req.user.id, req.query);
  
  return ApiResponse.success(res, { message: 'Threads fetched', data: result.threads });
});

export const getMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getMessages(req.params.id, req.user.id, req.query);
  
  return ApiResponse.success(res, { message: 'Messages fetched', data: result.messages, meta: result.meta });
});

export const startConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.startConversation(req.user.id, req.body.otherUserId);

  return ApiResponse.created(res, { message: 'Conversation started', data: conversation });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.params.id, req.user.id, req.body);

  return ApiResponse.created(res, { message: 'Message sent', data: message });
});
