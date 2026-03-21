import { generateRequestId, generateTraceId, generateSpanId, setLogContext } from '../config/structured-logger.js';

/**
 * Correlation Middleware
 * 
 * This middleware adds correlation IDs to all incoming requests:
 * - requestId: Unique identifier for this specific request
 * - traceId: Identifier for the entire trace (can span multiple services)
 * - spanId: Identifier for this specific operation within the trace
 * 
 * It also sets up logging context for the duration of the request.
 */
export const correlationMiddleware = (req, res, next) => {
  // Generate or extract correlation IDs
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  const spanId = generateSpanId();

  // Add IDs to request object
  req.requestId = requestId;
  req.traceId = traceId;
  req.spanId = spanId;

  // Set response headers for downstream services
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Trace-ID', traceId);
  res.setHeader('X-Span-ID', spanId);

  // Set up logging context for this request
  setLogContext('requestId', requestId);
  setLogContext('traceId', traceId);
  setLogContext('spanId', spanId);
  setLogContext('method', req.method);
  setLogContext('url', req.originalUrl || req.url);
  setLogContext('userAgent', req.get('User-Agent'));
  setLogContext('ip', req.ip || req.connection.remoteAddress);

  // Add user context if available
  if (req.user) {
    setLogContext('userId', req.user.id);
    setLogContext('userEmail', req.user.email);
    setLogContext('userRole', req.user.role);
  }

  // Add session context if available
  if (req.session) {
    setLogContext('sessionId', req.session.id);
  }

  // Store original context to restore after request
  const originalContext = new Map();
  for (const [key, value] of Object.entries({
    requestId,
    traceId,
    spanId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    sessionId: req.session?.id
  })) {
    if (value !== undefined) {
      originalContext.set(key, value);
    }
  }

  // Override res.end to clean up context after response
  const originalEnd = res.end;
  res.end = function(...args) {
    // Clear context after response
    for (const key of originalContext.keys()) {
      // Note: In a real implementation, you'd want to remove specific keys
      // rather than clearing all context, as other middleware might be using it
    }
    
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Child Span Middleware
 * 
 * Creates child spans for specific operations within a request.
 * Use this for nested operations that need their own span tracking.
 */
export const childSpanMiddleware = (operationName) => {
  return (req, res, next) => {
    const parentSpanId = req.spanId;
    const childSpanId = generateSpanId();
    
    // Store parent span and set child span
    req.parentSpanId = parentSpanId;
    req.spanId = childSpanId;
    
    // Update response header
    res.setHeader('X-Span-ID', childSpanId);
    
    // Update logging context
    setLogContext('spanId', childSpanId);
    setLogContext('operation', operationName);
    setLogContext('parentSpanId', parentSpanId);
    
    next();
  };
};

/**
 * Trace Context Extractor
 * 
 * Extracts trace context from incoming requests from external services.
 * Handles different trace propagation formats.
 */
export const extractTraceContext = (req) => {
  const contexts = {};

  // W3C Trace Context format
  if (req.headers['traceparent']) {
    const traceparent = req.headers['traceparent'];
    const parts = traceparent.split('-');
    if (parts.length >= 2) {
      contexts.traceId = parts[1];
      contexts.spanId = parts[2];
    }
  }

  // B3 format (Zipkin)
  if (req.headers['x-b3-traceid']) {
    contexts.traceId = req.headers['x-b3-traceid'];
    contexts.spanId = req.headers['x-b3-spanid'];
    contexts.parentSpanId = req.headers['x-b3-parentspanid'];
    contexts.sampled = req.headers['x-b3-sampled'];
  }

  // Custom headers
  if (req.headers['x-trace-id']) {
    contexts.traceId = req.headers['x-trace-id'];
  }
  if (req.headers['x-span-id']) {
    contexts.spanId = req.headers['x-span-id'];
  }
  if (req.headers['x-parent-span-id']) {
    contexts.parentSpanId = req.headers['x-parent-span-id'];
  }

  return contexts;
};

/**
 * Trace Context Injector
 * 
 * Injects trace context into outgoing requests to external services.
 */
export const injectTraceContext = (req, headers = {}) => {
  const traceHeaders = {
    'X-Request-ID': req.requestId,
    'X-Trace-ID': req.traceId,
    'X-Span-ID': req.spanId,
    'X-Parent-Span-ID': req.spanId, // Current span becomes parent for next service
    ...headers
  };

  // Add W3C Trace Context
  if (req.traceId && req.spanId) {
    traceHeaders['traceparent'] = `00-${req.traceId}-${req.spanId}-01`;
  }

  // Add B3 format
  traceHeaders['X-B3-TraceId'] = req.traceId;
  traceHeaders['X-B3-SpanId'] = generateSpanId(); // New span for external call
  traceHeaders['X-B3-ParentSpanId'] = req.spanId;
  traceHeaders['X-B3-Sampled'] = '1';

  return traceHeaders;
};

/**
 * Async Context Manager
 * 
 * Manages correlation context across async operations.
 * This is a simplified version - in production you might want to use
 * AsyncLocalStorage or similar mechanisms.
 */
export class AsyncContextManager {
  constructor() {
    this.context = new Map();
  }

  run(context, fn) {
    // Store current context
    const previousContext = new Map(this.context);
    
    // Set new context
    this.context.clear();
    for (const [key, value] of Object.entries(context)) {
      this.context.set(key, value);
    }

    try {
      return fn();
    } finally {
      // Restore previous context
      this.context.clear();
      for (const [key, value] of previousContext) {
        this.context.set(key, value);
      }
    }
  }

  get(key) {
    return this.context.get(key);
  }

  set(key, value) {
    this.context.set(key, value);
  }
}

// Global context manager instance
export const asyncContext = new AsyncContextManager();

/**
 * Async Context Middleware
 * 
 * Sets up async context for the duration of a request.
 */
export const asyncContextMiddleware = (req, res, next) => {
  const context = {
    requestId: req.requestId,
    traceId: req.traceId,
    spanId: req.spanId,
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl || req.url
  };

  asyncContext.run(context, () => {
    next();
  });
};

export default {
  correlationMiddleware,
  childSpanMiddleware,
  extractTraceContext,
  injectTraceContext,
  AsyncContextManager,
  asyncContext,
  asyncContextMiddleware
};
