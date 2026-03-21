import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';
import userDto from '../dto/user.dto.js';
import { logger } from '../config/index.js';
import getPrisma from '../config/prisma.js';
import { findUserByEmail } from '../repositories/user.repo.js';
import PasswordValidator from '../utils/passwordValidator.js';
import userRepository from '../repositories/user.repo.js';
import emailVerificationService from './emailVerification.service.js';

const prisma = getPrisma();

class AuthService {
  async register(userData) {
    const { name, email, password, role } = userData;

    if (!name || !email || !password) {
      throw new ApiError(400, 'All fields are required');
    }

    // Validate password strength
    const passwordValidation = PasswordValidator.validate(password);
    if (!passwordValidation.isValid) {
      throw new ApiError(400, `Password requirements not met: ${passwordValidation.errors.join(', ')}`);
    }

    const existingUser = await userRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased rounds for security

    const user = await userRepository.createUser({
      name,
      email,
      password: hashedPassword,
      role: role || 'USER',
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Generate email verification token
    const verificationToken = await emailVerificationService.generateVerificationToken(user.id);

    logger.info('User registration successful', { 
      action: 'register_success',
      email,
      userId: user.id,
      role: user.role,
      emailVerificationToken: verificationToken
    });

    return {
      accessToken,
      refreshToken,
      user: userDto.auth(user),
      emailVerificationToken
    };
  }

  async login(credentials) {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password required');
    }

    const user = await findUserByEmail(email);
    
    if (!user) {
      logger.warn('Failed login attempt - user not found', { 
        action: 'login_failed',
        email,
        reason: 'user_not_found',
        ip: 'track_ip' // TODO: Add IP tracking middleware
      });
      throw new ApiError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      logger.warn('Failed login attempt - invalid password', { 
        action: 'login_failed',
        email,
        reason: 'invalid_password',
        ip: 'track_ip' // TODO: Add IP tracking middleware
      });
      throw new ApiError(401, 'Invalid credentials');
    }

    logger.info('Successful login', { 
      action: 'login_success',
      email,
      userId: user.id,
      role: user.role
    });

    // Revoke all existing refresh tokens for this user
    await this.revokeAllRefreshTokens(user.id);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: userDto.auth(user),
    };
  }

  generateAccessToken(user) {
    // Use environment variable properly
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: '15m' }
    );
  }

  async generateRefreshToken(userId) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Generate SHA-256 fingerprint for indexed lookup
    const fingerprint = crypto.createHash('sha256').update(token).digest('hex');

    // Hash the token for storage (cost 10 for balance of security vs performance)
    const hashedToken = await bcrypt.hash(token, 10);

    // Clean up expired tokens for this user
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: new Date()
        }
      }
    });

    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: hashedToken, // Store hashed token
        fingerprint, // Store SHA-256 fingerprint for indexed lookup
        userId,
        expiresAt
      }
    });

    // Return unhashed token to user (only once)
    return token;
  }

  async refreshAccessToken(refreshToken) {
    return await prisma.$transaction(async (tx) => {
      // Generate SHA-256 fingerprint for indexed lookup
      const fingerprint = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const storedToken = await tx.refreshToken.findFirst({
        where: { 
          fingerprint,
          expiresAt: { gte: new Date() }
        },
        include: { user: true }
      });

      if (!storedToken) {
        throw new ApiError(401, 'Invalid or expired refresh token');
      }

      // Verify with bcrypt for security
      const isValid = await bcrypt.compare(refreshToken, storedToken.token);
      if (!isValid) {
        throw new ApiError(401, 'Invalid or expired refresh token');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(storedToken.user);
      
      // Atomic token rotation: delete old and create new in same transaction
      await tx.refreshToken.delete({
        where: { id: storedToken.id }
      });
      
      const newRefreshToken = await this.generateRefreshTokenInTransaction(tx, storedToken.userId);

      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    }, {
      isolationLevel: 'ReadCommitted',
      timeout: 5000 // 5 second timeout
    });
  }

  async generateRefreshTokenInTransaction(tx, userId) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Generate SHA-256 fingerprint for indexed lookup
    const fingerprint = crypto.createHash('sha256').update(token).digest('hex');

    // Clean up expired tokens for this user within transaction
    await tx.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: {
          lt: new Date()
        }
      }
    });

    const refreshToken = await tx.refreshToken.create({
      data: {
        token,
        fingerprint, // Store SHA-256 fingerprint for indexed lookup
        userId,
        expiresAt
      }
    });

    return refreshToken.token;
  }

  async revokeRefreshToken(refreshToken) {
    try {
      // Generate SHA-256 fingerprint for indexed lookup
      const fingerprint = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      // First try indexed lookup by fingerprint
      const tokenRecord = await prisma.refreshToken.findFirst({
        where: { 
          fingerprint,
          expiresAt: { gte: new Date() }
        }
      });

      if (tokenRecord) {
        // Verify with bcrypt for security
        const isValid = await bcrypt.compare(refreshToken, tokenRecord.token);
        if (isValid) {
          const deleted = await prisma.refreshToken.delete({
            where: { id: tokenRecord.id }
          });
          return deleted.count > 0;
        }
      }

      return false;
    } catch (error) {
      throw new ApiError(500, `Database operation revokeRefreshToken failed: ${error.message}`);
    }
  }

  async handleTokenReuse(userId, reusedToken) {
    // SECURITY INCIDENT: Potential token theft detected
    logger.error('SECURITY INCIDENT: Refresh token reuse detected', {
      action: 'token_reuse_detected',
      userId,
      reusedToken: reusedToken.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    // Revoke ALL refresh tokens for this user (session family invalidation)
    await this.revokeAllRefreshTokens(userId);
    
    // Log security event
    await prisma.activity.create({
      data: {
        type: 'SECURITY_INCIDENT',
        message: 'Refresh token reuse detected - all sessions revoked',
        userId,
        entity: 'USER',
        entityId: userId
      }
    });

    // In production, you might also:
    // - Send security alert email
    // - Temporarily lock account
    // - Require password reset on next login
  }

  async revokeAllRefreshTokens(userId) {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }
      return jwt.verify(token, secret);
    } catch (error) {
      throw new ApiError(401, 'Invalid token');
    }
  }

  verifyAccessToken(token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }
      return jwt.verify(token, secret);
    } catch (error) {
      throw new ApiError(401, 'Invalid or expired access token');
    }
  }
}

export default new AuthService();
