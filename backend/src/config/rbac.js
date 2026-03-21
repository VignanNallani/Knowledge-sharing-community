import { ApiError } from '../errors/index.js';

export const Roles = Object.freeze({
  USER: 'USER',
  MENTOR: 'MENTOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
});

export const Permissions = Object.freeze({
  MANAGE_USERS: 'manage_users',
  MANAGE_POSTS: 'manage_posts',
  MANAGE_REPORTS: 'manage_reports',
  MANAGE_EVENTS: 'manage_events',
  MANAGE_MENTORSHIP: 'manage_mentorship',
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
});

const RolePermissions = {
  [Roles.USER]: [],
  [Roles.MENTOR]: [Permissions.MANAGE_MENTORSHIP],
  [Roles.ADMIN]: [
    Permissions.MANAGE_USERS,
    Permissions.MANAGE_POSTS,
    Permissions.MANAGE_REPORTS,
    Permissions.MANAGE_EVENTS,
    Permissions.MANAGE_MENTORSHIP,
    Permissions.VIEW_ADMIN_DASHBOARD,
  ],
  [Roles.SUPERADMIN]: Permissions ? Object.values(Permissions) : [],
};

export const hasPermission = (role, permission) => {
  const perms = RolePermissions[role] || [];
  return perms.includes(permission);
};

export const requireRole = (...allowedRoles) => (req, _res, next) => {
  const user = req.user;
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden('Insufficient role permissions');
  }
  next();
};

export const requirePermission = (permission) => (req, _res, next) => {
  const user = req.user;
  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  if (!hasPermission(user.role, permission)) {
    throw ApiError.forbidden('Missing required permission');
  }

  next();
};

export default {
  Roles,
  Permissions,
  RolePermissions,
  hasPermission,
  requireRole,
  requirePermission,
};

