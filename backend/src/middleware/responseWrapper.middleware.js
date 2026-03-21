/**
 * Global Response Format Middleware
 * Enforces consistent response format across all endpoints
 */

class ResponseFormatter {
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      data,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  static error(code, message, statusCode = 500) {
    return {
      success: false,
      error: {
        code,
        message
      },
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  static paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      data,
      message,
      pagination,
      statusCode: 200,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Response wrapper middleware
 * Intercepts res.json and res.status calls to enforce format
 */
export const responseWrapper = (req, res, next) => {
  // Store original methods
  const originalJson = res.json;
  const originalStatus = res.status;

  // Override status method to chain with our formatter
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  // Override json method to enforce format
  res.json = function(body) {
    // If response already follows our format, send as-is
    if (body && typeof body === 'object' && 'success' in body) {
      return originalJson.call(res, body);
    }

    // If this is an error response from error middleware, send as-is
    if (res.statusCode >= 400) {
      return originalJson.call(res, body);
    }

    // Format successful responses
    const formattedResponse = ResponseFormatter.success(body, 'Success', res.statusCode || 200);
    return originalJson.call(res, formattedResponse);
  };

  // Helper methods for common responses
  res.success = function(data, message = 'Success') {
    const formattedResponse = ResponseFormatter.success(data, message, 200);
    return originalStatus.call(res, 200).json(formattedResponse);
  };

  res.created = function(data, message = 'Resource created successfully') {
    const formattedResponse = ResponseFormatter.success(data, message, 201);
    return originalStatus.call(res, 201).json(formattedResponse);
  };

  res.updated = function(data, message = 'Resource updated successfully') {
    const formattedResponse = ResponseFormatter.success(data, message, 200);
    return originalStatus.call(res, 200).json(formattedResponse);
  };

  res.deleted = function(message = 'Resource deleted successfully') {
    const formattedResponse = ResponseFormatter.success(null, message, 204);
    return originalStatus.call(res, 204).json(formattedResponse);
  };

  res.notFound = function(resource = 'Resource') {
    const formattedResponse = ResponseFormatter.error('NOT_FOUND', `${resource} not found`, 404);
    return originalStatus.call(res, 404).json(formattedResponse);
  };

  res.badRequest = function(message = 'Bad request', errors = null) {
    const formattedResponse = ResponseFormatter.error('VALIDATION_ERROR', message, 400);
    if (errors) {
      formattedResponse.errors = errors;
    }
    return originalStatus.call(res, 400).json(formattedResponse);
  };

  res.unauthorized = function(message = 'Unauthorized') {
    const formattedResponse = ResponseFormatter.error('UNAUTHORIZED', message, 401);
    return originalStatus.call(res, 401).json(formattedResponse);
  };

  res.forbidden = function(message = 'Forbidden') {
    const formattedResponse = ResponseFormatter.error('FORBIDDEN', message, 403);
    return originalStatus.call(res, 403).json(formattedResponse);
  };

  res.conflict = function(message = 'Conflict') {
    const formattedResponse = ResponseFormatter.error('CONFLICT', message, 409);
    return originalStatus.call(res, 409).json(formattedResponse);
  };

  res.tooManyRequests = function(message = 'Too many requests') {
    const formattedResponse = ResponseFormatter.error('RATE_LIMIT_EXCEEDED', message, 429);
    return originalStatus.call(res, 429).json(formattedResponse);
  };

  res.serverError = function(message = 'Internal server error') {
    const formattedResponse = ResponseFormatter.error('INTERNAL_ERROR', message, 500);
    return originalStatus.call(res, 500).json(formattedResponse);
  };

  res.paginated = function(data, pagination, message = 'Success') {
    const formattedResponse = ResponseFormatter.paginated(data, pagination, message);
    return originalStatus.call(res, 200).json(formattedResponse);
  };

  next();
};

export default responseWrapper;
