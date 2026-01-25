

// import express from "express";
// import { authenticate } from "../middleware/authMiddleware.js";
// import {
//   createComment,
//   getComments,
//   replyComment,
//   updateComment,
//   deleteComment,
//   toggleCommentLike,
// } from "../controllers/commentcontroller.js";

// const router = express.Router();

// // Create comment (for a post)
// router.post("/:postId", authenticate, createComment);

// // Get comments for a post
// router.get("/:postId", authenticate, getComments);

// // Reply to a comment
// router.post("/:commentId/reply", authenticate, replyComment);

// // Update comment
// router.put("/:id", authenticate, updateComment);

// // Delete comment
// router.delete("/:id", authenticate, deleteComment);

// // Like / Unlike comment or reply
// router.post("/:commentId/like", authenticate, toggleCommentLike);

// export default router;


import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  createComment,
  getComments,
  replyComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "../controllers/commentcontroller.js";

const router = express.Router();

/**
 * ================= COMMENTS =================
 */

// Get comments for a post (with pagination)
router.get("/post/:postId", authenticate, getComments);

// Create a comment for a post
router.post("/post/:postId", authenticate, createComment);

// Reply to a comment
router.post("/reply/:commentId", authenticate, replyComment);

// Update comment
router.put("/:id", authenticate, updateComment);

// Delete comment
router.delete("/:id", authenticate, deleteComment);

// Like / Unlike comment or reply
router.post("/like/:commentId", authenticate, toggleCommentLike);

export default router;
