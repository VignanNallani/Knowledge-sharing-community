import { logger } from '../config/index.js';
import structuredLogger from '../utils/structuredLogger.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { logError } from '../errors/index.js';

// Response formatter for errors
class ErrorResponseFormatter {
  static format(error, statusCode) {
    const baseResponse = {
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    };

    // Add validation errors if present
    if (error.errors) {
      baseResponse.errors = error.errors;
    }

    // Add correlation IDs if available
    const correlationIds = {};
    if (error.requestId) correlationIds.requestId = error.requestId;
    if (error.traceId) correlationIds.traceId = error.traceId;
    if (error.spanId) correlationIds.spanId = error.spanId;
    
    if (Object.keys(correlationIds).length > 0) {
      baseResponse.correlation = correlationIds;
    }

    // Add debug info only in development
    if (process.env.NODE_ENV === 'development') {
      baseResponse.debug = {
        stack: error.stack,
        name: error.name || 'Error',
        isOperational: error.isOperational !== undefined ? error.isOperational : true,
        statusCode: statusCode
      };
    }

    return baseResponse;
  }
}

export const errorHandler = (err, req, res, next) => {
  // Attach correlation IDs from request if not present on error
  if (!err.requestId && req.requestId) err.requestId = req.requestId;
  if (!err.traceId && req.traceId) err.traceId = req.traceId;
  if (!err.spanId && req.spanId) err.spanId = req.spanId;

  // Classify error type
  const isOperational = err.isOperational !== undefined ? err.isOperational : (err.statusCode < 500);
  
  // Log with structured logger
  structuredLogger.logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    isOperational
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Don't leak internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    const sanitizedError = { 
      ...err,
      message: 'Internal Server Error',
      stack: undefined,
      code: ERROR_CODES.INTERNAL_ERROR
    };
    const sanitizedResponse = ErrorResponseFormatter.format(sanitizedError, statusCode);
    return res.status(statusCode).json(sanitizedResponse);
  }

  // Format error response
  const errorResponse = ErrorResponseFormatter.format(err, statusCode);
  return res.status(statusCode).json(errorResponse);
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    structuredLogger.error('Unhandled Promise Rejection', {
      type: 'unhandledRejection',
      promise: promise.toString(),
      reason: reason.toString(),
      stack: reason?.stack
    });
  });
};

// Handle uncaught exceptions
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    structuredLogger.error('Uncaught Exception', {
      type: 'uncaughtException',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
    
    // Graceful shutdown
    structuredLogger.info('Shutting down due to uncaught exception...');
    process.exit(1);
  });
};

export default errorHandler;
