import jwt from "jsonwebtoken";
import { ApiError } from "../errors/index.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(ApiError.unauthorized('No valid Bearer token'));
    }

    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || !tokenParts[1]) {
      return next(ApiError.unauthorized('Invalid token format'));
    }

    const token = tokenParts[1];
    
    // Use environment variable properly
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(ApiError.unauthorized('JWT_SECRET not configured'));
    }
    
    jwt.verify(token, secret, {
      clockTolerance: 30 // 30 seconds tolerance for clock drift
    }, (err, decoded) => {
      if (err) {
        return next(ApiError.unauthorized('Invalid or expired token'));
      }

      if (!decoded || !decoded.id || !decoded.email || !decoded.role) {
        return next(ApiError.unauthorized('Invalid token payload'));
      }

      req.user = { id: decoded.id, role: decoded.role, email: decoded.email, name: decoded.name };
      return next();
    });
  } catch (error) {
    return next(ApiError.unauthorized('Authentication failed'));
  }
};
  