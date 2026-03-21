import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ApiError } from '../errors/index.js';
import { findUserByEmail, createUser } from '../repositories/user.repo.js';
import userDto from '../dto/user.dto.js';
import crypto from 'crypto';
import getPrisma from '../config/prisma.js';

class TestAuthService {
  async login(credentials) {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password required');
    }

    const user = await findUserByEmail(email);
    
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: userDto.auth(user),
    };
  }

  generateAccessToken(user) {
    // Use hardcoded secret
    const secret = 'dev-jwt-secret-key-for-testing-only';
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: '15m' }
    );
    
    console.log('TOKEN GENERATED WITH SECRET:', secret);
    console.log('GENERATED TOKEN:', token);
    
    return token;
  }

  async generateRefreshToken(userId) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const fingerprint = crypto.createHash('sha256').update(token).digest('hex');

    const prisma = getPrisma();
    await prisma.refreshToken.create({
      data: {
        token: fingerprint,
        userId,
        expiresAt,
      },
    });

    return token;
  }
}

export default new TestAuthService();
