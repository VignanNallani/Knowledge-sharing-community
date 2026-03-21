import express from "express";
import {
  getPendingPosts,
  approvePost,
  rejectPost,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../config/rbac.js";
import validate from "../middleware/validate.middleware.js";
import { paginationSchema } from "../validators/pagination.schema.js";

const router = express.Router();

/**
 * GET /api/admin/pending-posts
 * Get all pending posts for admin approval
 */
router.get("/pending-posts", authenticate, requireRole('ADMIN', 'SUPERADMIN'), validate(paginationSchema), getPendingPosts);

/**
 * POST /api/admin/posts/:id/approve
 * Approve a pending post
 */
router.post("/posts/:id/approve", authenticate, requireRole('ADMIN', 'SUPERADMIN'), approvePost);

/**
 * POST /api/admin/posts/:id/reject
 * Reject a pending post
 */
router.post("/posts/:id/reject", authenticate, requireRole('ADMIN', 'SUPERADMIN'), rejectPost);

export default router;
