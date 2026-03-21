import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { paginate } from "../utils/pagination.js";
import adminService from "../services/admin.service.js";

/* ================= PENDING POSTS ================= */
export const getPendingPosts = asyncHandler(async (req, res) => {
  const result = await adminService.getPendingPosts(req.query);
  
  return ApiResponse.success(res, { 
    message: 'Pending posts fetched', 
    data: { posts: result.posts },
    meta: result.meta
  });
});

/* ================= APPROVE POST ================= */
export const approvePost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) throw new ApiError(400, 'Invalid post ID');

  const updatedPost = await adminService.approvePost(postId, req.user.id);
  
  return ApiResponse.success(res, { message: 'Post approved', data: updatedPost });
});

/* ================= REJECT POST ================= */
export const rejectPost = asyncHandler(async (req, res) => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) throw new ApiError(400, 'Invalid post ID');

  const updatedPost = await adminService.rejectPost(postId, req.user.id);
  
  return ApiResponse.success(res, { message: 'Post rejected', data: updatedPost });
});
