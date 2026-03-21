import { requireRole } from '../config/rbac.js';

// Backwards-compatible wrapper around centralized RBAC role guard
export const authorizeRoles = (...allowedRoles) => requireRole(...allowedRoles);

export default authorizeRoles;
