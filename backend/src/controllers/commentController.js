import ApiResponse from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate, buildPaginationResponse } from "../utils/pagination.js";
import asyncHandler from "../middleware/asyncHandler.js";
import commentService from "../services/comment.service.js";
import notificationService from "../services/notification.service.js";

/**
 * GET COMMENTS FOR A POST (with pagination + likes)
 * GET /api/comments/:postId?page=1&limit=10
 */
export const getComments = asyncHandler(async (req, res) => {
  const postId = Number(req.params.postId);
  const userId = req.user.id;

  if (isNaN(postId)) throw new ApiError(400, 'Invalid postId');

  const result = await commentService.getComments(postId, req.query, userId);
  
  return ApiResponse.success(res, { 
    message: 'Comments fetched', 
    data: { comments: result.comments },
    meta: result.meta
  });
});

/**
 * CREATE COMMENT
 * POST /api/comments/:postId
 */
export const createComment = asyncHandler(async (req, res) => {
  const postId = Number(req.params.postId);
  const { content } = req.body;
  
  const comment = await commentService.createComment({ postId, content }, req.user.id);

  // Create notification if comment was successful and not self-comment
  if (comment && comment.postAuthorId !== req.user.id) {
    try {
      await notificationService.createNotification(comment.postAuthorId, {
        type: 'COMMENT',
        message: `${req.user.name} commented on your post: ${comment.postTitle}`,
        postId: postId
      });
    } catch (notificationError) {
      // Don't fail comment if notification fails
    }
  }

  return ApiResponse.created(res, { message: 'Comment created', data: comment });
});

/**
 * REPLY TO COMMENT (logical reply)
 * POST /api/comments/:commentId/reply
 */
export const replyComment = asyncHandler(async (req, res) => {
  const parentCommentId = Number(req.params.commentId);
  const { content } = req.body;
  
  const comment = await commentService.createComment({ parentCommentId, content }, req.user.id);

  return ApiResponse.created(res, { message: 'Reply added', data: comment });
});

/**
 * UPDATE COMMENT
 */
export const updateComment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body;

  const comment = await commentService.updateComment(id, content, req.user.id, req.user.role);
  
  return ApiResponse.success(res, { message: 'Comment updated', data: comment });
});

/**
 * DELETE COMMENT
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  
  await commentService.deleteComment(id, req.user.id, req.user.role);
  
  return ApiResponse.success(res, { message: 'Comment deleted' });
});

/**
 * TOGGLE COMMENT LIKE
 */
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const commentId = Number(req.params.commentId);
  const userId = req.user.id;

  const result = await commentService.likeComment(commentId, userId);
  
  return ApiResponse.success(res, { 
    message: result.liked ? 'Comment liked' : 'Comment unliked', 
    data: { isLiked: result.liked } 
  });
});
