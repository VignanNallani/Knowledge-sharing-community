import express from "express";
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
} from "../controllers/eventController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.middleware.js";
import { paginationSchema } from "../validators/pagination.schema.js";

const router = express.Router();

/**
 * GET /api/events
 * Get all events with search and filtering
 */
router.get("/", validate(paginationSchema), getEvents);

/**
 * POST /api/events
 * Create a new event
 */
router.post("/", authenticate, createEvent);

/**
 * PUT /api/events/:id
 * Update an event
 */
router.put("/:id", authenticate, updateEvent);

/**
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete("/:id", authenticate, deleteEvent);

/**
 * POST /api/events/:id/join
 * Join an event
 */
router.post("/:id/join", authenticate, joinEvent);

export default router;
