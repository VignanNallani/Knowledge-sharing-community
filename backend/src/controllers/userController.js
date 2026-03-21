import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import userService from "../services/user.service.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

/**
 * GET /users/me
 * Logged-in user's profile
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getMyProfile(req.user.id);
  return ApiResponse.success(res, { message: 'Profile fetched', data: user });
});

/**
 * PATCH /users/me
 * Update own profile
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateMyProfile(req.user.id, req.body);
  return ApiResponse.success(res, { message: 'Profile updated successfully', data: updatedUser });
});

/**
 * GET /users
 * Search + pagination
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);
  return ApiResponse.success(res, { message: 'Users fetched', data: result });
});

/**
 * GET /users/:id
 * Public profile
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(Number(req.params.id));
  return ApiResponse.success(res, { message: 'User fetched', data: user });
});

/**
 * FOLLOW / UNFOLLOW (toggle)
 */
export const followUser = asyncHandler(async (req, res) => {
  const followerId = req.user.id;
  const followingId = Number(req.params.id);
  
  // Check if already following
  const isFollowing = await userService.isFollowingUser(followerId, followingId);
  
  if (isFollowing) {
    // Unfollow if already following
    const result = await userService.unfollowUser(followerId, followingId);
    return ApiResponse.success(res, { message: 'User unfollowed successfully', data: { following: false } });
  } else {
    // Follow if not already following
    const result = await userService.followUser(followerId, followingId);
    return ApiResponse.success(res, { message: 'User followed successfully', data: { following: true, result } });
  }
});

export const unfollowUser = asyncHandler(async (req, res) => {
  const result = await userService.unfollowUser(req.user.id, Number(req.params.id));
  return ApiResponse.success(res, { message: 'User unfollowed successfully', data: result });
});

/**
 * FOLLOWERS / FOLLOWING
 */
export const getUserFollowers = asyncHandler(async (req, res) => {
  const result = await userService.getUserFollowers(Number(req.params.id), req.query);
  return ApiResponse.success(res, { 
    message: 'Followers fetched', 
    data: result.followers,
    meta: result.meta 
  });
});

export const getUserFollowing = asyncHandler(async (req, res) => {
  const result = await userService.getUserFollowing(Number(req.params.id), req.query);
  return ApiResponse.success(res, { 
    message: 'Following fetched', 
    data: result.following,
    meta: result.meta 
  });
});
