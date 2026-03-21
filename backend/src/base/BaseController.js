import { asyncHandler } from '../errors/index.js';
import { Response } from '../utils/ResponseBuilder.js';
import { logger } from '../config/index.js';

class BaseController {
  constructor() {
    this.response = Response;
  }

  // Async handler wrapper for all controller methods
  static asyncHandler(fn) {
    return asyncHandler(fn);
  }

  // Success response helpers
  success(res, data, message = 'Success') {
    return this.response.success(res, message, data);
  }

  created(res, data, message = 'Resource created successfully') {
    return this.response.created(res, data, message);
  }

  updated(res, data, message = 'Resource updated successfully') {
    return this.response.updated(res, data, message);
  }

  deleted(res, message = 'Resource deleted successfully') {
    return this.response.deleted(res, message);
  }

  paginated(res, data, pagination, message = 'Success') {
    return this.response.paginated(res, data, pagination, message);
  }

  // Error response helpers
  notFound(res, resource = 'Resource') {
    return this.response.notFound(res, resource);
  }

  badRequest(res, message, errors = null) {
    return this.response.badRequest(res, message, errors);
  }

  unauthorized(res, message = 'Unauthorized') {
    return this.response.unauthorized(res, message);
  }

  forbidden(res, message = 'Forbidden') {
    return this.response.forbidden(res, message);
  }

  conflict(res, message = 'Conflict') {
    return this.response.conflict(res, message);
  }

  // Request context helpers
  getUser(req) {
    return req.user;
  }

  getUserId(req) {
    return req.user?.id;
  }

  getUserRole(req) {
    return req.user?.role;
  }

  isAdmin(req) {
    return req.user?.role === 'ADMIN';
  }

  isMentor(req) {
    return req.user?.role === 'MENTOR';
  }

  isOwner(req, resourceUserId) {
    return this.getUserId(req) === resourceUserId;
  }

  canModify(req, resourceUserId) {
    return this.isAdmin(req) || this.isOwner(req, resourceUserId);
  }

  // Pagination helpers
  static getPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };
  }

  createPaginationResult(page, limit, total) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  // Logging helpers
  logRequest(req, additionalData = {}) {
    logger.info('Controller request:', {
      method: req.method,
      path: req.path,
      userId: this.getUserId(req),
      userRole: this.getUserRole(req),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ...additionalData
    });
  }

  logError(error, req, additionalData = {}) {
    logger.error('Controller error:', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      userId: this.getUserId(req),
      ip: req.ip,
      ...additionalData
    });
  }

  // Validation helpers
  validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  sanitizeInput(data, allowedFields) {
    const sanitized = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    return sanitized;
  }
}

export default BaseController;
