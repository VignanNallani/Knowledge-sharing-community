import { Router } from "express";
import PasswordResetController from "../controllers/passwordResetController.js";
import validate from "../middleware/validate.middleware.js";
import { requestResetSchema, resetPasswordSchema, validateTokenSchema } from "../validators/passwordReset.schema.js";

const router = Router();

console.log('Password reset routes loaded');

/**
 * @swagger
 * /api/auth/request-password-reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Password reset link sent
 */
router.post("/request-password-reset", validate(requestResetSchema), PasswordResetController.requestReset);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123def456"
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", validate(resetPasswordSchema), PasswordResetController.resetPassword);

/**
 * @swagger
 * /api/auth/validate-reset-token:
 *   post:
 *     summary: Validate password reset token
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
 *         description: Token validation result
 */
router.post("/validate-reset-token", validate(validateTokenSchema), PasswordResetController.validateToken);

export default router;
