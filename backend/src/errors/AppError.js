import { logger } from '../config/index.js';

export class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class DatabaseError extends AppError {
  constructor(message, operation = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.operation = operation;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`External service ${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// Error factory for common scenarios
export class ErrorFactory {
  static userNotFound() {
    return new NotFoundError('User');
  }

  static postNotFound() {
    return new NotFoundError('Post');
  }

  static commentNotFound() {
    return new NotFoundError('Comment');
  }

  static notFound(resource = 'Resource') {
    return new NotFoundError(resource);
  }

  static userAlreadyExists(email) {
    return new ConflictError(`User with email ${email} already exists`);
  }

  static alreadyExists(message) {
    return new ConflictError(message);
  }

  static invalidCredentials() {
    return new UnauthorizedError('Invalid email or password');
  }

  static unauthorized(message = 'Unauthorized') {
    return new UnauthorizedError(message);
  }

  static accessDenied(message = 'Access denied to this resource') {
    return new ForbiddenError(message);
  }

  static validationFailed(errors) {
    return new ValidationError('Validation failed', errors);
  }

  static validationError(message, errors = []) {
    return new ValidationError(message, errors);
  }

  static databaseOperationFailed(operation, error) {
    return new DatabaseError(`Database operation ${operation} failed: ${error.message}`, operation);
  }

  static externalServiceFailed(service, error) {
    return new ExternalServiceError(service, error.message);
  }
}

// Async error wrapper for controllers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
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
    timestamp: error.timestamp || new Date().toISOString(),
    ...context
  };

  if (error.statusCode >= 500) {
    logger.error('Server Error:', errorInfo);
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error:', errorInfo);
  } else {
    logger.info('Error:', errorInfo);
  }
};
