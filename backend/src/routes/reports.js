import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRoles.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Admin & Mentor reports
 */

router.get("/", authenticate, authorizeRoles("ADMIN", "MENTOR"), (req, res) => {
  res.json({ message: "Reports fetched successfully" });
});

export default router;
