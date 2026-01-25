import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { createBooking, getBookings } from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", authenticate, createBooking);
router.get("/", authenticate, getBookings);

export default router;
