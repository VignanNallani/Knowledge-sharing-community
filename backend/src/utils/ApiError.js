import { ERROR_CODES, isValidErrorCode } from '../errors/errorCodes.js';
import { logger } from '../config/index.js';

class ApiError extends Error {
  constructor(statusCode, message, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || ERROR_CODES.INTERNAL_ERROR;
    
    // Enforce error code validation
    if (!isValidErrorCode(this.code)) {
      throw new Error(`Invalid error code: ${this.code}. Must be one of: ${Object.values(ERROR_CODES).join(', ')}`);
    }
    
    this.isOperational = isOperational;
    this.name = this.constructor.name;
  }

  // Static factory methods for common errors
  static badRequest(msg = 'Bad Request', code = ERROR_CODES.BAD_REQUEST, context = {}) {
    const error = new ApiError(400, msg, code);
    Object.assign(error, context);
    return error;
  }

  static unauthorized(msg = 'Unauthorized', code = ERROR_CODES.UNAUTHORIZED, context = {}) {
    const error = new ApiError(401, msg, code);
    Object.assign(error, context);
    return error;
  }

  static forbidden(msg = 'Forbidden', code = ERROR_CODES.FORBIDDEN, context = {}) {
    const error = new ApiError(403, msg, code);
    Object.assign(error, context);
    return error;
  }

  static notFound(msg = 'Resource not found', code = ERROR_CODES.NOT_FOUND, context = {}) {
    const error = new ApiError(404, msg, code);
    Object.assign(error, context);
    return error;
  }

  static conflict(msg = 'Conflict', code = ERROR_CODES.CONFLICT, context = {}) {
    const error = new ApiError(409, msg, code);
    Object.assign(error, context);
    return error;
  }

  static unprocessableEntity(msg = 'Unprocessable Entity', code = ERROR_CODES.VALIDATION_ERROR, context = {}) {
    const error = new ApiError(422, msg, code);
    Object.assign(error, context);
    return error;
  }

  static tooManyRequests(msg = 'Too Many Requests', code = ERROR_CODES.RATE_LIMITED, context = {}) {
    const error = new ApiError(429, msg, code);
    Object.assign(error, context);
    return error;
  }

  static internal(msg = 'Internal Server Error', code = ERROR_CODES.INTERNAL_ERROR, context = {}) {
    const error = new ApiError(500, msg, code, false); // Internal errors are non-operational by default
    Object.assign(error, context);
    return error;
  }

  static badGateway(msg = 'Bad Gateway', code = ERROR_CODES.EXTERNAL_SERVICE_ERROR, context = {}) {
    const error = new ApiError(502, msg, code);
    Object.assign(error, context);
    return error;
  }

  static serviceUnavailable(msg = 'Service Unavailable', code = ERROR_CODES.SERVICE_UNAVAILABLE, context = {}) {
    const error = new ApiError(503, msg, code);
    Object.assign(error, context);
    return error;
  }

  static gatewayTimeout(msg = 'Gateway Timeout', code = ERROR_CODES.GATEWAY_TIMEOUT, context = {}) {
    const error = new ApiError(504, msg, code);
    Object.assign(error, context);
    return error;
  }

  // Validation error helper
  static validation(msg = 'Validation failed', errors = [], code = ERROR_CODES.VALIDATION_ERROR, context = {}) {
    const error = new ApiError(400, msg, code);
    error.errors = errors;
    Object.assign(error, context);
    return error;
  }
}

// Error factory for common scenarios
export class ErrorFactory {
  static userNotFound(context = {}) {
    return ApiError.notFound('User', context);
  }

  static postNotFound(context = {}) {
    return ApiError.notFound('Post', context);
  }

  static commentNotFound(context = {}) {
    return ApiError.notFound('Comment', context);
  }

  static notFound(resource, context = {}) {
    return ApiError.notFound(`${resource} not found`, ERROR_CODES.NOT_FOUND, context);
  }

  static userAlreadyExists(email, context = {}) {
    return ApiError.conflict(`User with email ${email} already exists`, ERROR_CODES.USER_ALREADY_EXISTS, context);
  }

  static alreadyExists(message, context = {}) {
    return ApiError.conflict(message, context);
  }

  static invalidCredentials(context = {}) {
    return ApiError.unauthorized('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS, context);
  }

  static unauthorized(message, context = {}) {
    return ApiError.unauthorized(message, ERROR_CODES.UNAUTHORIZED, context);
  }

  static accessDenied(message, context = {}) {
    return ApiError.forbidden(message, ERROR_CODES.FORBIDDEN, context);
  }

  static validationFailed(errors, context = {}) {
    return ApiError.validation('Validation failed', errors, ERROR_CODES.VALIDATION_ERROR, context);
  }

  static validationError(message, errors = [], context = {}) {
    return ApiError.validation(message, errors, ERROR_CODES.VALIDATION_ERROR, context);
  }

  static databaseOperationFailed(operation, error, context = {}) {
    const apiError = ApiError.internal(`Database operation ${operation} failed: ${error.message}`, ERROR_CODES.DATABASE_ERROR, context);
    apiError.cause = error;
    return apiError;
  }

  static externalServiceFailed(service, error, context = {}) {
    const apiError = ApiError.internal(`External service ${service} failed: ${error.message}`, ERROR_CODES.EXTERNAL_SERVICE_ERROR, context);
    apiError.cause = error;
    return apiError;
  }
}

// Async error wrapper for controllers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Attach correlation context to error
      if (req.requestId) error.requestId = req.requestId;
      if (req.traceId) error.traceId = req.traceId;
      if (req.spanId) error.spanId = req.spanId;
      next(error);
    });
  };
};

// Error logging utility
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    stack: error.stack,
    isOperational: error.isOperational,
    timestamp: new Date().toISOString(),
    ...context
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error', errorInfo);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error', errorInfo);
  } else {
    logger.info('Error', errorInfo);
  }
};

export default ApiError;
export { ApiError };

