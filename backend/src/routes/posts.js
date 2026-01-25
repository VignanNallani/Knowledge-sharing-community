

// import express from "express";
// import { authenticate } from "../middleware/authMiddleware.js";
// import { authorizeRoles } from "../middleware/authorizeRoles.js";
// import {
//   getPosts,
//   createPost,
//   likePost,
//   createComment,
//   getComments,
//   likeComment,
//   deletePost,
//   deleteComment,
// } from "../controllers/postController.js";

// const router = express.Router();

// /* ================= POSTS ================= */

// // ✅ PUBLIC FEED
// router.get("/", getPosts);

// // 🔐 CREATE POST
// router.post(
//   "/",
//   authenticate,
//   authorizeRoles("ADMIN", "MENTOR", "USER"),
//   createPost
// );

// // 🔐 LIKE POST
// router.post("/:id/like", authenticate, likePost);

// /* ================= COMMENTS ================= */

// router.post("/comment", authenticate, createComment);
// router.get("/comment/:postId", authenticate, getComments);
// router.post("/comment/:commentId/like", authenticate, likeComment);

// /* ================= DELETE ================= */

// router.delete("/:id", authenticate, deletePost);
// router.delete("/comment/:commentId", authenticate, deleteComment);

// export default router;



import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import {
  getPosts,
  getPostById,
  createPost,
  likePost,
  createComment,
  getComments,
  likeComment,
  deletePost,
  deleteComment,
} from "../controllers/postController.js";

const router = express.Router();

/* ================= POSTS ================= */

// ✅ PUBLIC FEED
router.get("/", getPosts);

// ✅ POST DETAIL
router.get("/:id", getPostById);

// 🔐 CREATE POST
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "MENTOR", "USER"),
  createPost
);

// 🔐 LIKE POST
router.post("/:id/like", authenticate, likePost);

/* ================= COMMENTS ================= */

router.post("/comment", authenticate, createComment);
router.get("/comment/:postId", authenticate, getComments);
router.post("/comment/:commentId/like", authenticate, likeComment);

/* ================= DELETE ================= */

router.delete("/:id", authenticate, deletePost);
router.delete("/comment/:commentId", authenticate, deleteComment);

export default router;
