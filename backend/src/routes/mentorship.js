

// import express from "express";
// import {
//   requestMentorship,
//   getPendingRequests,
//   acceptMentorship,
//   rejectMentorship,
//   getMyMentorships,
//   getMyMentees,
//   getMyMentors,
//   findMentors,
//   endMentorship,
// } from "../controllers/mentorshipController.js";

// import { authenticate } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // mentee
// router.post("/request", authenticate, requestMentorship);
// router.get("/my-mentors", authenticate, getMyMentors);

// // mentor
// router.get("/pending", authenticate, getPendingRequests);
// router.patch("/accept/:id", authenticate, acceptMentorship);
// router.patch("/reject/:id", authenticate, rejectMentorship);
// router.get("/my-mentees", authenticate, getMyMentees);

// // shared
// router.get("/my", authenticate, getMyMentorships);
// router.get("/find", authenticate, findMentors);
// router.delete("/end/:id", authenticate, endMentorship);

// export default router;


import express from "express";
import {
  requestMentorship,
  getPendingRequests,
  acceptMentorship,
  rejectMentorship,
  getMyMentorships,
  getMyMentees,
  getMyMentors,
  findMentors,
  endMentorship,
  cancelMentorship,
} from "../controllers/mentorshipController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mentee
router.post("/request", authenticate, requestMentorship);
router.get("/my-mentors", authenticate, getMyMentors);
router.delete("/cancel/:id", authenticate, cancelMentorship);

// Mentor
router.get("/pending", authenticate, getPendingRequests);
router.patch("/accept/:id", authenticate, acceptMentorship);
router.patch("/reject/:id", authenticate, rejectMentorship);
router.get("/my-mentees", authenticate, getMyMentees);

// Shared
router.get("/my", authenticate, getMyMentorships);
router.get("/find", authenticate, findMentors);
router.delete("/end/:id", authenticate, endMentorship);

export default router;
