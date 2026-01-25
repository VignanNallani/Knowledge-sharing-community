// import express from "express";
// import {
//   getAllUsers,
//   getUserProfile,
//   followUser,
//   unfollowUser,
//   getUserFollowers,
//   getUserFollowing,
// } from "../controllers/userController.js";
// import { authenticate } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Users
//  *   description: User management and profile
//  */

// router.get("/", authenticate, getAllUsers);

// /**
//  * @swagger
//  * /api/users/{id}:
//  *   get:
//  *     summary: Get user profile by ID
//  *     tags: [Users]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: User ID
//  *     responses:
//  *       200:
//  *         description: User profile
//  *       404:
//  *         description: User not found
//  */
// router.get("/:id", authenticate, getUserProfile);

// /**
//  * @swagger
//  * /api/users/{id}/followers:
//  *   get:
//  *     summary: Get user's followers
//  *     tags: [Users]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: List of followers
//  */
// router.get("/:id/followers", authenticate, getUserFollowers);

// /**
//  * @swagger
//  * /api/users/{id}/following:
//  *   get:
//  *     summary: Get user's following
//  *     tags: [Users]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: List of following
//  */
// router.get("/:id/following", authenticate, getUserFollowing);

// /**
//  * @swagger
//  * /api/users/{id}/follow:
//  *   post:
//  *     summary: Follow a user
//  *     tags: [Users]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: Followed successfully
//  */
// router.post("/:id/follow", authenticate, followUser);

// /**
//  * @swagger
//  * /api/users/{id}/unfollow:
//  *   post:
//  *     summary: Unfollow a user
//  *     tags: [Users]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: integer
//  *     responses:
//  *       200:
//  *         description: Unfollowed successfully
//  */
// router.post("/:id/unfollow", authenticate, unfollowUser);

// export default router;


import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserProfile,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
} from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);

router.get("/", authenticate, getAllUsers);
router.get("/:id", authenticate, getUserProfile);

router.post("/:id/follow", authenticate, followUser);
router.post("/:id/unfollow", authenticate, unfollowUser);

router.get("/:id/followers", authenticate, getUserFollowers);
router.get("/:id/following", authenticate, getUserFollowing);

export default router;
