import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import LikeController from "../controllers/likeController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Like/Unlike posts
 */

// Toggle post like
router.post("/:postId", authenticate, LikeController.toggleLike);

// Unlike post (DELETE method)
router.delete("/:postId", authenticate, LikeController.unlikePost);

export default router;
