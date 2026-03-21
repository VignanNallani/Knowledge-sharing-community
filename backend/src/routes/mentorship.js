import express from "express";
import {
  getMentorshipSlots,
  createMentorshipSlot,
  bookMentorshipSlot,
} from "../controllers/mentorshipController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.middleware.js";
import { createSlotSchema, bookSlotSchema } from "../validators/mentorship.schema.js";
import { paginationSchema } from "../validators/pagination.schema.js";

const router = express.Router();

/**
 * GET /api/mentorship/slots
 * Publicly visible mentorship slots
 */
router.get("/slots", authenticate, validate(paginationSchema), getMentorshipSlots);

/**
 * POST /api/mentorship/slots
 * Mentor creates availability slot
 * (role check handled in controller or middleware)
 */
router.post("/slots", authenticate, validate(createSlotSchema), createMentorshipSlot);

/**
 * POST /api/mentorship/book
 * Mentee books a slot
 */
router.post("/book", authenticate, validate(bookSlotSchema), bookMentorshipSlot);

export default router;
