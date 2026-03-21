import { logRequest, logErrorWithContext, logPerformance, logSecurity, logBusinessEvent } from '../config/structured-logger.js';
import { injectTraceContext } from './correlation.middleware.js';

/**
 * Enhanced Request Tracking Middleware
 * 
 * This middleware provides comprehensive request tracking with:
 * - Request/response logging
 * - Performance monitoring
 * - Error tracking
 * - Security monitoring
 * - Business event tracking
 */
export const requestTrackingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const startHrTime = process.hrtime.bigint();

  // Track request start
  logRequest(req, res, 0); // Initial request log with 0 duration

  // Override res.end to track completion
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const endHrTime = process.hrtime.bigint();
    const responseTime = endTime - startTime;
    const preciseResponseTime = Number(endHrTime - startHrTime) / 1000000; // Convert to milliseconds

    // Log completed request
    logRequest(req, res, responseTime);

    // Log performance metrics
    logPerformance('http_request', responseTime, {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      preciseResponseTime,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      requestId: req.requestId,
      traceId: req.traceId,
      spanId: req.spanId
    });

    // Log slow requests
    if (responseTime > 2000) {
      logPerformance('slow_request', responseTime, {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        threshold: 2000,
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });
    }

    // Log security events
    if (res.statusCode === 401) {
      logSecurity('authentication_failure', 'WARNING', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });
    }

    if (res.statusCode === 403) {
      logSecurity('authorization_failure', 'WARNING', {
        method: req.method,
        url: req.originalUrl || req.url,
        userId: req.user?.id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });
    }

    // Log potential attacks
    if (res.statusCode === 429) {
      logSecurity('rate_limit_exceeded', 'HIGH', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Business Event Tracking Middleware
 * 
 * Automatically tracks business events based on request patterns.
 */
export const businessEventTrackingMiddleware = (req, res, next) => {
  // Override res.end to track business events
  const originalEnd = res.end;
  res.end = function(...args) {
    // Track successful business events
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const event = mapRequestToBusinessEvent(req);
      if (event) {
        logBusinessEvent(event.name, {
          method: req.method,
          url: req.originalUrl || req.url,
          userId: req.user?.id,
          requestId: req.requestId,
          traceId: req.traceId,
          spanId: req.spanId,
          ...event.data
        });
      }
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Map HTTP requests to business events
 */
function mapRequestToBusinessEvent(req) {
  const { method, originalUrl, user } = req;
  const path = originalUrl?.split('?')[0]; // Remove query params

  // Authentication events
  if (path?.includes('/auth/login') && method === 'POST') {
    return {
      name: 'user_login',
      data: { userId: user?.id }
    };
  }

  if (path?.includes('/auth/register') && method === 'POST') {
    return {
      name: 'user_registration',
      data: { userId: user?.id }
    };
  }

  if (path?.includes('/auth/logout') && method === 'POST') {
    return {
      name: 'user_logout',
      data: { userId: user?.id }
    };
  }

  // Content events
  if (path?.includes('/posts') && method === 'POST') {
    return {
      name: 'post_created',
      data: { userId: user?.id }
    };
  }

  if (path?.includes('/comments') && method === 'POST') {
    return {
      name: 'comment_created',
      data: { userId: user?.id }
    };
  }

  if (path?.includes('/likes') && method === 'POST') {
    return {
      name: 'content_liked',
      data: { userId: user?.id }
    };
  }

  // Social events
  if (path?.includes('/follow') && method === 'POST') {
    return {
      name: 'user_followed',
      data: { userId: user?.id }
    };
  }

  // Mentorship events
  if (path?.includes('/mentorship') && method === 'POST') {
    return {
      name: 'mentorship_request',
      data: { userId: user?.id }
    };
  }

  return null;
}

/**
 * Error Tracking Middleware
 * 
 * Enhanced error tracking with context and correlation.
 */
export const errorTrackingMiddleware = (error, req, res, next) => {
  // Log the error with full context
  logErrorWithContext(error, req, {
    component: getComponentFromPath(req.originalUrl),
    operation: `${req.method} ${req.route?.path || req.path}`,
    statusCode: res.statusCode,
    requestBody: sanitizeRequestBody(req.body),
    requestParams: req.params,
    requestQuery: req.query,
    headers: sanitizeHeaders(req.headers)
  });

  next(error);
};

/**
 * Get component name from request path
 */
function getComponentFromPath(path) {
  if (path?.includes('/auth')) return 'Auth';
  if (path?.includes('/posts')) return 'Posts';
  if (path?.includes('/comments')) return 'Comments';
  if (path?.includes('/likes')) return 'Likes';
  if (path?.includes('/users')) return 'Users';
  if (path?.includes('/mentorship')) return 'Mentorship';
  if (path?.includes('/moderation')) return 'Moderation';
  return 'Unknown';
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body) {
  if (!body) return null;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize headers for logging (remove sensitive data)
 */
function sanitizeHeaders(headers) {
  if (!headers) return null;

  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sanitized = { ...headers };

  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * HTTP Client with Trace Propagation
 * 
 * Enhanced HTTP client that automatically propagates trace context.
 */
export class TracedHttpClient {
  constructor(baseOptions = {}) {
    this.baseOptions = baseOptions;
  }

  async request(url, options = {}) {
    const req = options.req || {}; // Pass request object for trace context
    const startTime = Date.now();

    // Inject trace context
    const headers = injectTraceContext(req, options.headers || {});

    try {
      // Make the actual HTTP request (using fetch or other HTTP client)
      const response = await fetch(url, {
        ...options,
        headers
      });

      const duration = Date.now() - startTime;

      // Log successful dependency call
      logPerformance('http_client_request', duration, {
        url,
        method: options.method || 'GET',
        statusCode: response.status,
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed dependency call
      logPerformance('http_client_error', duration, {
        url,
        method: options.method || 'GET',
        error: error.message,
        requestId: req.requestId,
        traceId: req.traceId,
        spanId: req.spanId
      });

      throw error;
    }
  }

  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
export const httpClient = new TracedHttpClient();

export default {
  requestTrackingMiddleware,
  businessEventTrackingMiddleware,
  errorTrackingMiddleware,
  TracedHttpClient,
  httpClient
};
