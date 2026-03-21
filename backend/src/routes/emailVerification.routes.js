import { Router } from "express";
import EmailVerificationController from "../controllers/emailVerificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.middleware.js";
import { verifyEmailSchema, resendVerificationSchema } from "../validators/emailVerification.schema.js";

const router = Router();

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123def456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/verify-email", validate(verifyEmailSchema), EmailVerificationController.verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         description: Authentication required
 */
router.post("/resend-verification", authenticate, validate(resendVerificationSchema), EmailVerificationController.resendVerification);

export default router;
