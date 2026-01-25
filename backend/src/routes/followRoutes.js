// import express from "express";
// import { authenticate } from "../middleware/authMiddleware.js";
// import {
//   followUser,
//   unfollowUser,
//   getFollowers,
//   getFollowing,
//   isFollowing,
// } from "../controllers/followController.js";

// const router = express.Router();

// /* ================= FOLLOW ================= */

// router.post("/:userId/follow", authenticate, followUser);
// router.delete("/:userId/unfollow", authenticate, unfollowUser);

// /* ================= LISTS ================= */

// router.get("/:userId/followers", authenticate, getFollowers);
// router.get("/:userId/following", authenticate, getFollowing);

// /* ================= STATUS ================= */

// router.get("/:userId/is-following", authenticate, isFollowing);

// export default router;


import express from "express";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
} from "../controllers/followController.js";

const router = express.Router();

/* ================= FOLLOW ================= */
// ❗ auth already handled in index.js
router.post("/:userId/follow", followUser);
router.delete("/:userId/unfollow", unfollowUser);

/* ================= LISTS ================= */
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

/* ================= STATUS ================= */
router.get("/:userId/is-following", isFollowing);

export default router;
