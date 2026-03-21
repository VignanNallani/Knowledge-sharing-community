import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';

class CSRFProtection {
  constructor() {
    this.tokenLength = 32;
    this.cookieName = 'csrf-token';
    this.headerName = 'x-csrf-token';
  }

  // Generate CSRF token
  generateToken() {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  // Set CSRF cookie
  setToken(res, token) {
    res.cookie(this.cookieName, token, {
      httpOnly: false, // JavaScript needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Validate CSRF token
  validateToken(req) {
    const cookieToken = req.cookies?.[this.cookieName];
    const headerToken = req.headers[this.headerName];

    if (!cookieToken || !headerToken) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'hex'),
      Buffer.from(headerToken, 'hex')
    );
  }

  // Middleware for state-changing requests
  protect() {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip for health checks and docs
      if (['/health', '/readiness', '/api/docs'].includes(req.path)) {
        return next();
      }

      // Validate CSRF token
      if (!this.validateToken(req)) {
        throw new ApiError(403, 'CSRF token validation failed');
      }

      next();
    };
  }

  // Middleware to set token for frontend
  setTokenMiddleware() {
    return (req, res, next) => {
      // Set new token if not present
      if (!req.cookies?.[this.cookieName]) {
        const token = this.generateToken();
        this.setToken(res, token);
      }
      next();
    };
  }
}

export default new CSRFProtection();
