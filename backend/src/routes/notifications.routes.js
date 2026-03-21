import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  
  const result = await notificationService.getUserNotifications(userId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  return ApiResponse.success(res, { 
    message: 'Notifications fetched',
    data: result 
  });
}));

// Mark notification as read
router.post('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const notificationId = parseInt(req.params.id);
  
  await notificationService.markAsRead(userId, notificationId);
  
  return ApiResponse.success(res, { 
    message: 'Notification marked as read' 
  });
}));

// Mark all notifications as read
router.post('/read-all', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  await notificationService.markAllAsRead(userId);
  
  return ApiResponse.success(res, { 
    message: 'All notifications marked as read' 
  });
}));

export default router;
