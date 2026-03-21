export const ROLES = {
  USER: 'USER',
  MENTOR: 'MENTOR',
  ADMIN: 'ADMIN',
  SUPERADMIN: 'SUPERADMIN',
};

export const PERMISSIONS = {
  // User permissions
  READ_OWN_PROFILE: 'read_own_profile',
  UPDATE_OWN_PROFILE: 'update_own_profile',
  DELETE_OWN_ACCOUNT: 'delete_own_account',
  
  // Post permissions
  CREATE_POST: 'create_post',
  READ_POST: 'read_post',
  UPDATE_OWN_POST: 'update_own_post',
  DELETE_OWN_POST: 'delete_own_post',
  LIKE_POST: 'like_post',
  
  // Comment permissions
  CREATE_COMMENT: 'create_comment',
  UPDATE_OWN_COMMENT: 'update_own_comment',
  DELETE_OWN_COMMENT: 'delete_own_comment',
  LIKE_COMMENT: 'like_comment',
  
  // Follow permissions
  FOLLOW_USER: 'follow_user',
  UNFOLLOW_USER: 'unfollow_user',
  
  // Mentor permissions
  CREATE_SLOT: 'create_slot',
  UPDATE_OWN_SLOT: 'update_own_slot',
  DELETE_OWN_SLOT: 'delete_own_slot',
  MANAGE_MENTORSHIP: 'manage_mentorship',
  
  // Admin permissions
  APPROVE_POST: 'approve_post',
  REJECT_POST: 'reject_post',
  DELETE_ANY_POST: 'delete_any_post',
  DELETE_ANY_COMMENT: 'delete_any_comment',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  VIEW_REPORTS: 'view_reports',
  MANAGE_REPORTS: 'manage_reports',
  VIEW_ANALYTICS: 'view_analytics',
  
  // Superadmin permissions
  DELETE_ANY_USER: 'delete_any_user',
  MANAGE_SYSTEM: 'manage_system',
};

const USER_PERMISSIONS = [
  PERMISSIONS.READ_OWN_PROFILE,
  PERMISSIONS.UPDATE_OWN_PROFILE,
  PERMISSIONS.DELETE_OWN_ACCOUNT,
  PERMISSIONS.CREATE_POST,
  PERMISSIONS.READ_POST,
  PERMISSIONS.UPDATE_OWN_POST,
  PERMISSIONS.DELETE_OWN_POST,
  PERMISSIONS.LIKE_POST,
  PERMISSIONS.CREATE_COMMENT,
  PERMISSIONS.UPDATE_OWN_COMMENT,
  PERMISSIONS.DELETE_OWN_COMMENT,
  PERMISSIONS.LIKE_COMMENT,
  PERMISSIONS.FOLLOW_USER,
  PERMISSIONS.UNFOLLOW_USER,
];

const MENTOR_PERMISSIONS = [
  ...USER_PERMISSIONS,
  PERMISSIONS.CREATE_SLOT,
  PERMISSIONS.UPDATE_OWN_SLOT,
  PERMISSIONS.DELETE_OWN_SLOT,
  PERMISSIONS.MANAGE_MENTORSHIP,
];

const ADMIN_PERMISSIONS = [
  ...MENTOR_PERMISSIONS,
  PERMISSIONS.APPROVE_POST,
  PERMISSIONS.REJECT_POST,
  PERMISSIONS.DELETE_ANY_POST,
  PERMISSIONS.DELETE_ANY_COMMENT,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.MANAGE_REPORTS,
  PERMISSIONS.VIEW_ANALYTICS,
];

const SUPERADMIN_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.MANAGE_ROLES,
  PERMISSIONS.DELETE_ANY_USER,
  PERMISSIONS.MANAGE_SYSTEM,
];

export const ROLE_PERMISSIONS = {
  [ROLES.USER]: USER_PERMISSIONS,
  [ROLES.MENTOR]: MENTOR_PERMISSIONS,
  [ROLES.ADMIN]: ADMIN_PERMISSIONS,
  [ROLES.SUPERADMIN]: SUPERADMIN_PERMISSIONS,
};

export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const hasAnyPermission = (userRole, permissions) => {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (userRole, permissions) => {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.every(permission => userPermissions.includes(permission));
};

export const getRoleHierarchy = () => ({
  [ROLES.USER]: 1,
  [ROLES.MENTOR]: 2,
  [ROLES.ADMIN]: 3,
  [ROLES.SUPERADMIN]: 4,
});

export const hasHigherOrEqualRole = (userRole, targetRole) => {
  const hierarchy = getRoleHierarchy();
  return hierarchy[userRole] >= hierarchy[targetRole];
};

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasHigherOrEqualRole,
  getRoleHierarchy,
};
