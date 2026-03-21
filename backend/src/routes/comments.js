import express from "express";
import { authenticate } from '../middleware/index.js';
import validate from "../middleware/validate.middleware.js";
import {
  createComment,
  getComments,
  replyComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "../controllers/commentController.js";
import { createCommentSchema } from "../validators/comment.schema.js";
import { paginationSchema } from "../validators/pagination.schema.js";

const router = express.Router();

/**
 * ================= COMMENTS =================
 */

// Get comments for a post (with pagination)
router.get("/post/:postId", authenticate, validate(paginationSchema), getComments);

// Create a comment for a post
router.post("/post/:postId", authenticate, validate(createCommentSchema), createComment);

// Reply to a comment
router.post("/reply/:commentId", authenticate, validate(createCommentSchema), replyComment);

// Update comment
router.put("/:id", authenticate, validate(createCommentSchema), updateComment);

// Delete comment
router.delete("/:id", authenticate, deleteComment);

// Like / Unlike comment or reply
router.post("/like/:commentId", authenticate, toggleCommentLike);

export default router;
