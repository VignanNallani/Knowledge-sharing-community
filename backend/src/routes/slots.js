import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";
import { createSlot, getSlots } from "../controllers/slotController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Slots
 *   description: Mentor slot creation and management
 */

router.post("/", authenticate, authorizeRoles("MENTOR"), createSlot);
router.get("/", authenticate, getSlots);

export default router;
