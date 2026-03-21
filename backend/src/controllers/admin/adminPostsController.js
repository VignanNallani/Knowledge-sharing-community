import pkg from "@prisma/client";
const { ActivityType } = pkg;
import { logActivity } from "../../services/activityService.js";
import ApiResponse from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import prisma from '../../config/prisma.js';
import asyncHandler from '../../middleware/asyncHandler.js';

import { paginate } from '../../utils/pagination.js';

/* ================= PENDING POSTS ================= */
export const getPendingPosts = asyncHandler(async (req, res) => {
  const { skip, limit, page } = paginate(req.query);
  
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PENDING" },
      skip,
      take: limit,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.count({ where: { status: "PENDING" } })
  ]);
  
  return ApiResponse.success(res, { 
    message: 'Pending posts fetched', 
    data: { posts },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

/* ================= APPROVE POST ================= */
export const approvePost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.id);
  const post = await prisma.post.update({ where: { id: postId }, data: { status: "APPROVED" }, include: { author: true } });

  await logActivity({ type: ActivityType.POST_APPROVED, message: `approved post "${post.title}"`, userId: req.user.id, entity: "POST", entityId: post.id });
  await logActivity({ type: ActivityType.POST_APPROVED, message: `your post "${post.title}" was approved by admin`, userId: post.authorId, entity: "POST", entityId: post.id });

  const io = req.app.get("io");
  io.to(`user-${post.authorId}`).emit("post-notification", { message: `Your post "${post.title}" was approved`, postId: post.id, status: "APPROVED" });
  return ApiResponse.success(res, { message: 'Post approved and author notified' });
});

/* ================= REJECT POST ================= */
export const rejectPost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.id);
  const post = await prisma.post.update({ where: { id: postId }, data: { status: "REJECTED" }, include: { author: true } });

  await logActivity({ type: ActivityType.POST_REJECTED, message: `rejected post "${post.title}"`, userId: req.user.id, entity: "POST", entityId: post.id });
  await logActivity({ type: ActivityType.POST_REJECTED, message: `your post "${post.title}" was rejected by admin`, userId: post.authorId, entity: "POST", entityId: post.id });

  const io = req.app.get("io");
  io.to(`user-${post.authorId}`).emit("post-notification", { message: `Your post "${post.title}" was rejected`, postId: post.id, status: "REJECTED" });
  return ApiResponse.success(res, { message: 'Post rejected and author notified' });
});
