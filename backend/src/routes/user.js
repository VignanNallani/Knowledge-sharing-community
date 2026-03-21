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
import validate from "../middleware/validate.middleware.js";
import { updateProfileSchema } from "../validators/user.schema.js";
import { paginationSchema } from "../validators/pagination.schema.js";
import { authenticate } from '../middleware/index.js';

const router = express.Router();

router.get("/me", authenticate, getMyProfile);
router.get("/profile", authenticate, getMyProfile);
router.patch("/me", authenticate, validate(updateProfileSchema), updateMyProfile);

router.get("/", validate(paginationSchema), getAllUsers);
router.get("/:id", authenticate, getUserProfile);

router.post("/:id/follow", authenticate, followUser);
router.post("/:id/unfollow", authenticate, unfollowUser);

router.get("/:id/followers", authenticate, validate(paginationSchema), getUserFollowers);
router.get("/:id/following", authenticate, validate(paginationSchema), getUserFollowing);

export default router;
