import { ApiError } from '../utils/ApiError.js';
import { hasPermission, hasAnyPermission, hasAllPermissions, hasHigherOrEqualRole } from '../config/roles.js';

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

export const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!hasAllPermissions(req.user.role, permissions)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (req.user.role !== role) {
      return next(new ApiError(403, `Access denied. Required role: ${role}`));
    }

    next();
  };
};

export const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Required one of roles: ${roles.join(', ')}`));
    }

    next();
  };
};

export const requireMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!hasHigherOrEqualRole(req.user.role, minimumRole)) {
      return next(new ApiError(403, `Access denied. Minimum role required: ${minimumRole}`));
    }

    next();
  };
};

export const requireOwnership = (resourceIdParam = 'id', ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const resourceId = req.params[resourceIdParam];
    const resourceOwnerId = req.body[ownerField] || req.resource?.[ownerField];

    if (req.user.id !== resourceOwnerId && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return next(new ApiError(403, 'Access denied. Resource ownership required'));
    }

    next();
  };
};

export const checkResourceAccess = (accessCheck) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    try {
      const hasAccess = await accessCheck(req.user, req.params, req.body);
      if (!hasAccess) {
        return next(new ApiError(403, 'Access denied'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAnyRole,
  requireMinimumRole,
  requireOwnership,
  checkResourceAccess,
};
