// import express from "express";
// import { authenticate } from "../middleware/authMiddleware.js";
// import { authorizeRoles } from "../middleware/authorizeRoles.js";

// const router = express.Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Admin
//  *   description: Admin-only routes
//  */

// router.get("/dashboard", authenticate, authorizeRoles("ADMIN"), (req, res) => {
//   res.json({ message: "Admin dashboard accessible only by ADMIN" });
// });

// export default router;


import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  getPendingPosts,
  approvePost,
  rejectPost,
} from "../controllers/adminController.js";

const router = express.Router();

/* ================= ADMIN DASHBOARD ================= */
router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({ message: "Admin dashboard access granted" });
  }
);

/* ================= POST MODERATION ================= */
router.get(
  "/posts/pending",
  authenticate,
  authorizeRoles("ADMIN"),
  getPendingPosts
);

router.patch(
  "/posts/:id/approve",
  authenticate,
  authorizeRoles("ADMIN"),
  approvePost
);

router.patch(
  "/posts/:id/reject",
  authenticate,
  authorizeRoles("ADMIN"),
  rejectPost
);

export default router;
