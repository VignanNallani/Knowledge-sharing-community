import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import userRepository from '../repositories/user.repo.js';
import { logger } from '../config/index.js';
import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

class EmailVerificationService {
  async generateVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    // Delete any existing verification tokens for this user
    await prisma.emailVerification.deleteMany({
      where: { userId }
    });

    const verification = await prisma.emailVerification.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });

    logger.info('Email verification token generated', { 
      action: 'email_verification_generated',
      userId 
    });

    return verification.token;
  }

  async verifyEmail(token) {
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification) {
      logger.warn('Invalid email verification attempt', { 
        action: 'email_verification_failed',
        reason: 'invalid_token',
        token 
      });
      throw new ApiError(400, 'Invalid verification token');
    }

    if (verification.expiresAt < new Date()) {
      logger.warn('Expired email verification attempt', { 
        action: 'email_verification_failed',
        reason: 'token_expired',
        userId: verification.userId 
      });
      throw new ApiError(400, 'Verification token has expired');
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true }
    });

    // Delete the verification token
    await prisma.emailVerification.delete({
      where: { token }
    });

    logger.info('Email verified successfully', { 
      action: 'email_verified',
      userId: verification.userId 
    });

    return { success: true, message: 'Email verified successfully' };
  }

  async resendVerification(userId) {
    const user = await userRepository.findUserById(userId);
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.emailVerified) {
      throw new ApiError(400, 'Email already verified');
    }

    const token = await this.generateVerificationToken(userId);
    
    logger.info('Email verification resent', { 
      action: 'email_verification_resent',
      userId,
      email: user.email 
    });

    return { 
      success: true, 
      message: 'Verification email sent',
      token 
    };
  }
}

export default new EmailVerificationService();
