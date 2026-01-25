// import express from "express";
// import { authenticate } from "../../middleware/authMiddleware.js";
// import { authorizeRoles } from "../../middleware/authorizeRoles.js";
// import {
//   getPendingPosts,
//   approvePost,
//   rejectPost,
// } from "../../controllers/admin/adminPostsController.js";

// const router = express.Router();

// /* ================= ADMIN POST MODERATION ================= */

// router.get(
//   "/posts/pending",
//   authenticate,
//   authorizeRoles("ADMIN"),
//   getPendingPosts
// );

// router.patch(
//   "/posts/:id/approve",
//   authenticate,
//   authorizeRoles("ADMIN"),
//   approvePost
// );

// router.patch(
//   "/posts/:id/reject",
//   authenticate,
//   authorizeRoles("ADMIN"),
//   rejectPost
// );

// export default router;


import express from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { authorizeRoles } from "../../middleware/authorizeRoles.js";
import {
  getPendingPosts,
  approvePost,
  rejectPost,
} from "../../controllers/admin/adminPostsController.js";

const router = express.Router();

/* ================= ADMIN POST MODERATION ================= */

// Get all pending posts
router.get(
  "/posts/pending",
  authenticate,
  authorizeRoles("ADMIN"),
  getPendingPosts
);

// Approve a post
router.patch(
  "/posts/:id/approve",
  authenticate,
  authorizeRoles("ADMIN"),
  approvePost
);

// Reject a post
router.patch(
  "/posts/:id/reject",
  authenticate,
  authorizeRoles("ADMIN"),
  rejectPost
);

export default router;
