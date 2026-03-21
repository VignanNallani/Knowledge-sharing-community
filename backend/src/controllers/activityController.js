import prisma from '../config/prisma.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { paginate } from '../utils/pagination.js';

/**
 * GET /api/activities
 * Fetch paginated activity feed for the logged-in user
 */
export const getActivities = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { skip, limit, page } = paginate(req.query);

  const [activities, totalCount] = await Promise.all([
    prisma.activity.findMany({ where: { userId }, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, role: true } } } }),
    prisma.activity.count({ where: { userId } }),
  ]);

  return ApiResponse.success(res, { 
    message: 'Activities fetched', 
    data: { activities },
    meta: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) }
  });
});
