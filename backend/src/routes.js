// import express from "express";
// import multer from "multer";

// // Controllers
// import * as authController from "./controllers/authController.js";
// import * as userController from "./controllers/userController.js";
// import * as postController from "./controllers/postController.js";
// import * as commentController from "./controllers/commenstController.js";
// import * as reportController from "./controllers/reportController.js";
// import * as uploadController from "./controllers/uploadController.js";
// import * as slotController from "./controllers/slotController.js";
// import * as eventController from "./controllers/eventController.js";
// import * as mentorshipController from "./controllers/mentorshipController.js";
// import * as adminController from "./controllers/adminController.js";

// // Middlewares
// import { authenticate } from "./middlewares/authMiddleware.js";
// import { isAdmin } from "./middlewares/adminMiddleware.js";

// const router = express.Router();
// const upload = multer({ dest: "uploads/" }); // For image uploads

// // -------------------- AUTH --------------------
// router.post("/auth/register", authController.register);
// router.post("/auth/login", authController.login);
// router.get("/auth/me", authenticate, authController.getCurrentUser);

// // -------------------- USERS --------------------
// router.get("/users", authenticate, userController.searchUsers);
// router.get("/users/:id", authenticate, userController.getUserProfile);
// router.get("/users/:id/posts", authenticate, userController.getUserPosts);
// router.get("/users/:id/followers", authenticate, userController.getUserFollowers);
// router.get("/users/:id/following", authenticate, userController.getUserFollowing);
// router.put("/users/me", authenticate, userController.updateUserProfile);
// router.post("/users/:id/follow", authenticate, userController.followUser);

// // -------------------- POSTS --------------------
// router.get("/posts", authenticate, postController.getPosts);
// router.post("/posts", authenticate, postController.createPost);
// router.put("/posts/:id", authenticate, postController.updatePost);
// router.post("/posts/:id/like", authenticate, postController.likePost);
// router.get("/posts/search", authenticate, postController.searchPosts);

// // -------------------- COMMENTS --------------------
// router.post("/comments", authenticate, commentController.createComment);
// router.get("/comments/:postId", authenticate, commentController.getCommentsByPost);
// router.put("/comments/:id", authenticate, commentController.updateComment);
// router.delete("/comments/:id", authenticate, commentController.deleteComment);

// // -------------------- REPORTS --------------------
// router.post("/reports", authenticate, reportController.createReport);
// router.get("/reports", authenticate, isAdmin, reportController.getReports);
// router.delete("/reports/:id", authenticate, isAdmin, reportController.deleteReport);

// // -------------------- UPLOADS --------------------
// router.post("/upload", authenticate, upload.single("file"), uploadController.uploadImage);

// // -------------------- SLOTS --------------------
// router.post("/slots", authenticate, slotController.createSlot);
// router.get("/slots", authenticate, slotController.listSlots);
// router.post("/slots/book", authenticate, slotController.bookSlot);

// // -------------------- EVENTS --------------------
// router.get("/events", authenticate, eventController.getEvents);
// router.post("/events/:id/join", authenticate, eventController.joinEvent);

// // -------------------- MENTORSHIPS --------------------
// router.get("/mentorships", authenticate, mentorshipController.getMentorships);
// router.post("/mentorships", authenticate, mentorshipController.createMentorship);
// router.post("/mentorships/:id/join", authenticate, mentorshipController.joinMentorship);

// // -------------------- ADMIN --------------------
// router.get("/admin/users", authenticate, isAdmin, adminController.getAllUsers);
// router.delete("/admin/users/:id", authenticate, isAdmin, adminController.deleteUser);

// export default router;


import express from "express";
import multer from "multer";
import prisma from "../config/prisma.js";

// -------------------- CONTROLLERS --------------------
import * as authController from "../controllers/authController.js";
import * as userController from "../controllers/userController.js";
import * as postController from "../controllers/postController.js";
import * as commentController from "../controllers/commentController.js";
import * as reportController from "../controllers/reportController.js";
import * as uploadController from "../controllers/uploadController.js";
import * as slotController from "../controllers/slotController.js";
import * as eventController from "../controllers/eventController.js";
import * as mentorshipController from "../controllers/mentorshipController.js";
import * as adminController from "../controllers/adminController.js";

// -------------------- MIDDLEWARE --------------------
import { authenticate } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/authorizeRoles.js";
import rbac from "../middleware/rbac.middleware.js";
import rateLimit from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // For image uploads

// Apply global rate limiting
router.use(rateLimit.rateLimiter);
router.use(rateLimit.slowDownMiddleware);
router.use(rateLimit.suspiciousActivityMiddleware);

// -------------------- AUTH --------------------
router.post("/auth/register", rateLimit.authRateLimiter, authController.register);
router.post("/auth/login", rateLimit.authRateLimiter, authController.login);
router.get("/auth/me", authenticate, authController.getCurrentUser);

// -------------------- USERS --------------------
router.get("/users", authenticate, userController.searchUsers);
router.get("/users/:id", authenticate, userController.getUserProfile);
router.get("/users/:id/posts", authenticate, userController.getUserPosts);
router.get("/users/:id/followers", authenticate, userController.getUserFollowers);
router.get("/users/:id/following", authenticate, userController.getUserFollowing);
router.put("/users/me", authenticate, userController.updateUserProfile);
router.post("/users/:id/follow", authenticate, rateLimit.followRateLimiter, userController.followUser);

// -------------------- POSTS --------------------
router.get("/posts", authenticate, postController.getPosts);
router.post("/posts", authenticate, rbac.requirePermission('create_post'), postController.createPost);
router.put("/posts/:id", authenticate, rbac.checkResourceAccess(async (user, params) => {
  // Check if user owns post or is admin
  const post = await prisma.post.findUnique({
    where: { id: parseInt(params.id) },
    select: { authorId: true }
  });
  return post && (post.authorId === user.id || user.role === 'ADMIN');
}), postController.updatePost);
router.post("/posts/:id/like", authenticate, rbac.requirePermission('like_post'), postController.likePost);
router.get("/posts/search", authenticate, rateLimit.searchRateLimiter, postController.searchPosts);

// -------------------- COMMENTS --------------------
router.post("/comments", authenticate, rateLimit.commentRateLimiter, commentController.createComment);
router.get("/comments/:postId", authenticate, commentController.getCommentsByPost);
router.put("/comments/:id", authenticate, rbac.checkResourceAccess(async (user, params) => {
  // Check if user owns comment or is admin
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(params.id) },
    select: { authorId: true }
  });
  return comment && (comment.authorId === user.id || user.role === 'ADMIN');
}), commentController.updateComment);
router.delete("/comments/:id", authenticate, rbac.checkResourceAccess(async (user, params) => {
  // Check if user owns comment or is admin
  const comment = await prisma.comment.findUnique({
    where: { id: parseInt(params.id) },
    select: { authorId: true }
  });
  return comment && (comment.authorId === user.id || user.role === 'ADMIN');
}), commentController.deleteComment);

// -------------------- REPORTS --------------------
router.post("/reports", authenticate, reportController.createReport);
router.get("/reports", authenticate, rbac.requirePermission('view_reports'), reportController.getReports);
router.put("/reports/:id/resolve", authenticate, rbac.requirePermission('manage_reports'), reportController.updateReportStatus);
router.delete("/reports/:id", authenticate, rbac.requirePermission('manage_reports'), reportController.deleteReport);

// -------------------- UPLOADS --------------------
router.post("/upload", authenticate, upload.single("file"), uploadController.uploadImage);

// -------------------- SLOTS --------------------
router.post("/slots", authenticate, rbac.requirePermission('create_slot'), slotController.createSlot);
router.get("/slots", authenticate, slotController.listSlots);
router.post("/slots/book", authenticate, rbac.requirePermission('like_post'), slotController.bookSlot);
router.put("/slots/:id/cancel", authenticate, rbac.checkResourceAccess(async (user, params) => {
  // Check if user owns the slot or is admin
  const slot = await prisma.slot.findUnique({
    where: { id: params.id },
    select: { mentorId: true }
  });
  return slot && (slot.mentorId === user.id || user.role === 'ADMIN');
}), slotController.cancelSlot);

// -------------------- EVENTS --------------------
router.get("/events", authenticate, eventController.getEvents);
router.post("/events/:id/join", authenticate, eventController.joinEvent);

// -------------------- MENTORSHIPS --------------------
router.get("/mentorships", authenticate, mentorshipController.getMentorships);
router.post("/mentorships", authenticate, mentorshipController.createMentorship);
router.post("/mentorships/:id/join", authenticate, mentorshipController.joinMentorship);

// -------------------- ADMIN --------------------
router.get("/admin/users", authenticate, rbac.requirePermission('manage_users'), adminController.getAllUsers);
router.delete("/admin/users/:id", authenticate, rbac.requirePermission('delete_any_user'), adminController.deleteUser);

export default router;
