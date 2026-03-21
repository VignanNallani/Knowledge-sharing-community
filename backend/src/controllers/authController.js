import BaseController from '../base/BaseController.js';
import { ErrorFactory } from '../errors/index.js';
import authService from '../services/auth.service.js';
import ValidationMiddleware from '../middleware/validation.middleware.js';
import { logger } from '../config/index.js';
import { Response } from '../utils/ResponseBuilder.js';

class AuthController extends BaseController {
  static register = BaseController.asyncHandler(async (req, res) => {
    // Input validation is handled by route middleware
    const result = await authService.register(req.body);
    logger.info('User registration:', { action: 'register', email: req.body.email });
    return Response.created(res, result, 'User registered successfully');
  });

  static login = BaseController.asyncHandler(async (req, res) => {
    // Input validation is handled by route middleware
    const result = await authService.login(req.body);
    logger.info('User login:', { action: 'login', email: req.body.email });
    
    // Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Enforce HTTPS in production for secure cookies
    if (process.env.NODE_ENV === 'production' && !process.env.HTTPS_ENABLED) {
      throw new Error("Production requires HTTPS for secure cookies");
    }
    
    return Response.success(res, {
      accessToken: result.accessToken,
      user: result.user
    }, 'Login successful');
  });

  static refresh = BaseController.asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return Response.badRequest(res, 'Refresh token is required');
    }
    
    const result = await authService.refreshAccessToken(refreshToken);
    logger.info('Token refreshed:', { action: 'refresh_token' });
    return Response.success(res, result, 'Token refreshed successfully');
  });

  static logout = BaseController.asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return Response.badRequest(res, 'Refresh token is required');
    }
    
    const revoked = await authService.revokeRefreshToken(refreshToken);
    
    // Clear the HttpOnly cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    logger.info('User logout:', { action: 'logout', revoked });
    return Response.success(res, { revoked }, 'Logout successful');
  });

  static logoutAll = BaseController.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    await authService.revokeAllRefreshTokens(userId);
    logger.info('User logout all devices:', { action: 'logout_all', userId });
    return Response.success(res, null, 'Logged out from all devices successfully');
  });
}

export default AuthController;
