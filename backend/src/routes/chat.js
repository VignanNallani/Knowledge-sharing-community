import express from "express";
import {
  getThreads,
  getMessages,
  startConversation,
  sendMessage,
} from "../controllers/chatController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.middleware.js";
import { paginationSchema } from "../validators/pagination.schema.js";

const router = express.Router();

/**
 * GET /api/chat/threads
 * Get user's conversation threads
 */
router.get("/threads", authenticate, validate(paginationSchema), getThreads);

/**
 * GET /api/chat/:id/messages
 * Get messages in a conversation
 */
router.get("/:id/messages", authenticate, validate(paginationSchema), getMessages);

/**
 * POST /api/chat/start
 * Start a new conversation
 */
router.post("/start", authenticate, startConversation);

/**
 * POST /api/chat/:id/send
 * Send a message in a conversation
 */
router.post("/:id/send", authenticate, sendMessage);

export default router;
