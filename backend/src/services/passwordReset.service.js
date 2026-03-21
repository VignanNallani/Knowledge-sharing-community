import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/ApiError.js';
import userRepository from '../repositories/user.repo.js';
import { logger } from '../config/index.js';
import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

class PasswordResetService {
  async generateResetToken(email) {
    const user = await userRepository.findUserByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not
      logger.warn('Password reset attempt for non-existent email', { 
        action: 'password_reset_attempt',
        email,
        reason: 'user_not_found'
      });
      return { success: false, message: 'If email exists, reset link will be sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id }
    });

    const resetToken = await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    logger.info('Password reset token generated', { 
      action: 'password_reset_generated',
      userId: user.id,
      email 
    });

    return { 
      success: true, 
      message: 'Password reset link sent',
      token: resetToken.token 
    };
  }

  async resetPassword(token, newPassword) {
    const reset = await prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!reset) {
      logger.warn('Invalid password reset attempt', { 
        action: 'password_reset_failed',
        reason: 'invalid_token',
        token 
      });
      throw new ApiError(400, 'Invalid reset token');
    }

    if (reset.expiresAt < new Date()) {
      logger.warn('Expired password reset attempt', { 
        action: 'password_reset_failed',
        reason: 'token_expired',
        userId: reset.userId 
      });
      throw new ApiError(400, 'Reset token has expired');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword }
    });

    // Delete all reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: reset.userId }
    });

    // Revoke all refresh tokens (force logout)
    await prisma.refreshToken.deleteMany({
      where: { userId: reset.userId }
    });

    logger.info('Password reset successful', { 
      action: 'password_reset_success',
      userId: reset.userId 
    });

    return { success: true, message: 'Password reset successfully' };
  }

  async validateResetToken(token) {
    const reset = await prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!reset) {
      return { valid: false, message: 'Invalid reset token' };
    }

    if (reset.expiresAt < new Date()) {
      return { valid: false, message: 'Reset token has expired' };
    }

    return { valid: true, message: 'Reset token is valid' };
  }
}

export default new PasswordResetService();
