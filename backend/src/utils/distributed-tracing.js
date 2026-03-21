import crypto from 'crypto';
import { logPerformance, logInfo, logDebug } from '../config/structured-logger.js';

/**
 * Distributed Tracing System
 * 
 * Provides comprehensive distributed tracing capabilities including:
 * - Trace and span management
 * - Cross-service propagation
 * - Performance monitoring
 * - Trace sampling
 * - Span relationships
 */

// Span types
export const SPAN_TYPES = {
  HTTP: 'http',
  DATABASE: 'database',
  CACHE: 'cache',
  EXTERNAL: 'external',
  INTERNAL: 'internal',
  MESSAGE: 'message',
  WEBHOOK: 'webhook',
  BACKGROUND: 'background'
};

// Span status codes
export const SPAN_STATUS = {
  OK: { code: 0, description: 'OK' },
  CANCELLED: { code: 1, description: 'Cancelled' },
  UNKNOWN: { code: 2, description: 'Unknown' },
  INVALID_ARGUMENT: { code: 3, description: 'Invalid argument' },
  DEADLINE_EXCEEDED: { code: 4, description: 'Deadline exceeded' },
  NOT_FOUND: { code: 5, description: 'Not found' },
  ALREADY_EXISTS: { code: 6, description: 'Already exists' },
  PERMISSION_DENIED: { code: 7, description: 'Permission denied' },
  RESOURCE_EXHAUSTED: { code: 8, description: 'Resource exhausted' },
  FAILED_PRECONDITION: { code: 9, description: 'Failed precondition' },
  ABORTED: { code: 10, description: 'Aborted' },
  OUT_OF_RANGE: { code: 11, description: 'Out of range' },
  UNIMPLEMENTED: { code: 12, description: 'Unimplemented' },
  INTERNAL: { code: 13, description: 'Internal' },
  UNAVAILABLE: { code: 14, description: 'Unavailable' },
  DATA_LOSS: { code: 15, description: 'Data loss' },
  UNAUTHENTICATED: { code: 16, description: 'Unauthenticated' }
};

class Span {
  constructor(options = {}) {
    this.traceId = options.traceId || this.generateTraceId();
    this.spanId = options.spanId || this.generateSpanId();
    this.parentSpanId = options.parentSpanId || null;
    this.operationName = options.operationName || 'unknown';
    this.startTime = options.startTime || Date.now();
    this.endTime = null;
    this.duration = null;
    this.type = options.type || SPAN_TYPES.INTERNAL;
    this.status = SPAN_STATUS.OK;
    this.tags = options.tags || {};
    this.logs = [];
    this.events = [];
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'knowledge-sharing-backend';
    this.resource = options.resource || {};
    this.sampled = options.sampled !== false; // Default to sampled
  }

  /**
   * Set a tag on the span
   */
  setTag(key, value) {
    this.tags[key] = value;
    return this;
  }

  /**
   * Set multiple tags
   */
  setTags(tags) {
    Object.assign(this.tags, tags);
    return this;
  }

  /**
   * Add a log entry to the span
   */
  log(message, attributes = {}) {
    this.logs.push({
      timestamp: Date.now(),
      level: attributes.level || 'INFO',
      message,
      attributes
    });
    return this;
  }

  /**
   * Add an event to the span
   */
  addEvent(name, attributes = {}) {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
    return this;
  }

  /**
   * Set the span status
   */
  setStatus(status, description = null) {
    if (typeof status === 'string') {
      this.status = SPAN_STATUS[status.toUpperCase()] || SPAN_STATUS.UNKNOWN;
    } else {
      this.status = status;
    }
    
    if (description) {
      this.status.description = description;
    }
    
    return this;
  }

  /**
   * Set an error on the span
   */
  setError(error) {
    this.setStatus(SPAN_STATUS.INTERNAL, error.message);
    this.setTag('error', true);
    this.setTag('error.message', error.message);
    this.setTag('error.type', error.constructor.name);
    if (error.stack) {
      this.setTag('error.stack', error.stack);
    }
    return this;
  }

  /**
   * Finish the span
   */
  finish(endTime = null) {
    this.endTime = endTime || Date.now();
    this.duration = this.endTime - this.startTime;
    
    // Log the completed span
    this.logSpan();
    
    return this;
  }

  /**
   * Log the span for observability
   */
  logSpan() {
    if (!this.sampled) return;

    const spanData = {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      operationName: this.operationName,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      type: this.type,
      status: this.status,
      tags: this.tags,
      logs: this.logs,
      events: this.events,
      serviceName: this.serviceName,
      resource: this.resource
    };

    logPerformance('span_completed', this.duration, {
      type: 'distributed_tracing',
      spanData,
      context: {
        component: 'Tracing',
        operation: 'span_completion'
      },
      tags: ['tracing', 'span', this.type]
    });
  }

  /**
   * Create a child span
   */
  createChild(operationName, options = {}) {
    return new Span({
      traceId: this.traceId,
      parentSpanId: this.spanId,
      operationName,
      serviceName: this.serviceName,
      sampled: this.sampled,
      ...options
    });
  }

  /**
   * Generate trace ID
   */
  generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate span ID
   */
  generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Convert to JSON for serialization
   */
  toJSON() {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      operationName: this.operationName,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      type: this.type,
      status: this.status,
      tags: this.tags,
      logs: this.logs,
      events: this.events,
      serviceName: this.serviceName,
      resource: this.resource,
      sampled: this.sampled
    };
  }
}

class Tracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'knowledge-sharing-backend';
    this.samplingRate = options.samplingRate || 0.1; // 10% default sampling
    this.activeSpans = new Map();
    this.completedSpans = [];
    this.maxSpansInMemory = options.maxSpansInMemory || 10000;
  }

  /**
   * Start a new root span
   */
  startRootSpan(operationName, options = {}) {
    const shouldSample = this.shouldSample();
    
    const span = new Span({
      operationName,
      serviceName: this.serviceName,
      sampled: shouldSample,
      ...options
    });

    this.activeSpans.set(span.spanId, span);
    
    logDebug('Started root span', {
      traceId: span.traceId,
      spanId: span.spanId,
      operationName,
      sampled: shouldSample
    });

    return span;
  }

  /**
   * Start a child span
   */
  startChildSpan(operationName, parentSpan, options = {}) {
    if (!parentSpan) {
      throw new Error('Parent span is required for child spans');
    }

    const span = parentSpan.createChild(operationName, options);
    this.activeSpans.set(span.spanId, span);
    
    logDebug('Started child span', {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operationName
    });

    return span;
  }

  /**
   * Get active span by ID
   */
  getActiveSpan(spanId) {
    return this.activeSpans.get(spanId);
  }

  /**
   * Finish a span
   */
  finishSpan(spanId, endTime = null) {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      logDebug('Attempted to finish non-existent span', { spanId });
      return null;
    }

    span.finish(endTime);
    this.activeSpans.delete(spanId);
    
    // Add to completed spans (with size limit)
    this.completedSpans.push(span);
    if (this.completedSpans.length > this.maxSpansInMemory) {
      this.completedSpans.shift();
    }

    logDebug('Finished span', {
      traceId: span.traceId,
      spanId: span.spanId,
      duration: span.duration
    });

    return span;
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers) {
    const context = {};

    // W3C Trace Context format
    if (headers.traceparent) {
      const parts = headers.traceparent.split('-');
      if (parts.length >= 4) {
        context.traceId = parts[1];
        context.spanId = parts[2];
        context.traceFlags = parts[3];
      }
    }

    // B3 format (Zipkin)
    if (headers['x-b3-traceid']) {
      context.traceId = headers['x-b3-traceid'];
      context.spanId = headers['x-b3-spanid'];
      context.parentSpanId = headers['x-b3-parentspanid'];
      context.sampled = headers['x-b3-sampled'] === '1';
    }

    // Custom headers
    if (headers['x-trace-id']) {
      context.traceId = headers['x-trace-id'];
    }
    if (headers['x-span-id']) {
      context.spanId = headers['x-span-id'];
    }
    if (headers['x-parent-span-id']) {
      context.parentSpanId = headers['x-parent-span-id'];
    }

    return context;
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(span, headers = {}) {
    const injected = { ...headers };

    // W3C Trace Context
    injected.traceparent = `00-${span.traceId}-${span.spanId}-01`;

    // B3 format
    injected['x-b3-traceid'] = span.traceId;
    injected['x-b3-spanid'] = span.spanId;
    injected['x-b3-parentspanid'] = span.parentSpanId || '';
    injected['x-b3-sampled'] = span.sampled ? '1' : '0';

    // Custom headers
    injected['x-trace-id'] = span.traceId;
    injected['x-span-id'] = span.spanId;
    injected['x-parent-span-id'] = span.parentSpanId || '';

    return injected;
  }

  /**
   * Create a span from extracted context
   */
  createSpanFromContext(operationName, context, options = {}) {
    return new Span({
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operationName,
      serviceName: this.serviceName,
      sampled: context.sampled !== false,
      ...options
    });
  }

  /**
   * Determine if a trace should be sampled
   */
  shouldSample() {
    return Math.random() < this.samplingRate;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId) {
    const spans = this.completedSpans.filter(span => span.traceId === traceId);
    const activeSpans = Array.from(this.activeSpans.values()).filter(span => span.traceId === traceId);
    
    return {
      traceId,
      spans: [...spans, ...activeSpans].sort((a, b) => a.startTime - b.startTime),
      duration: this.calculateTraceDuration([...spans, ...activeSpans])
    };
  }

  /**
   * Calculate trace duration
   */
  calculateTraceDuration(spans) {
    if (spans.length === 0) return 0;
    
    const startTimes = spans.map(span => span.startTime);
    const endTimes = spans.filter(span => span.endTime).map(span => span.endTime);
    
    const startTime = Math.min(...startTimes);
    const endTime = endTimes.length > 0 ? Math.max(...endTimes) : Date.now();
    
    return endTime - startTime;
  }

  /**
   * Get active spans count
   */
  getActiveSpansCount() {
    return this.activeSpans.size;
  }

  /**
   * Get completed spans count
   */
  getCompletedSpansCount() {
    return this.completedSpans.length;
  }

  /**
   * Get tracer statistics
   */
  getStats() {
    const recentSpans = this.completedSpans.slice(-1000);
    const avgDuration = recentSpans.length > 0 
      ? recentSpans.reduce((sum, span) => sum + (span.duration || 0), 0) / recentSpans.length
      : 0;

    return {
      activeSpans: this.activeSpans.size,
      completedSpans: this.completedSpans.length,
      averageDuration: Math.round(avgDuration),
      samplingRate: this.samplingRate,
      serviceName: this.serviceName
    };
  }

  /**
   * Clean up old spans
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // Default 24 hours
    const cutoff = Date.now() - maxAge;
    const initialCount = this.completedSpans.length;
    
    this.completedSpans = this.completedSpans.filter(span => 
      span.endTime && span.endTime > cutoff
    );

    const cleaned = initialCount - this.completedSpans.length;
    if (cleaned > 0) {
      logDebug('Cleaned up old spans', { count: cleaned });
    }

    return cleaned;
  }
}

// Create singleton tracer instance
export const tracer = new Tracer();

/**
 * Span context for async operations
 */
export class SpanContext {
  constructor(span) {
    this.span = span;
  }

  /**
   * Run a function within the span context
   */
  async run(fn) {
    try {
      const result = await fn();
      this.span.setStatus(SPAN_STATUS.OK);
      return result;
    } catch (error) {
      this.span.setError(error);
      throw error;
    } finally {
      this.span.finish();
    }
  }

  /**
   * Create a child span
   */
  createChild(operationName, options = {}) {
    return tracer.startChildSpan(operationName, this.span, options);
  }
}

/**
 * Decorator for tracing functions
 */
export function trace(operationName, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const span = tracer.startRootSpan(operationName, {
        type: SPAN_TYPES.INTERNAL,
        tags: {
          'function.name': propertyKey,
          'function.class': target.constructor.name,
          'function.args.length': args.length
        },
        ...options
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setTag('success', true);
        return result;
      } catch (error) {
        span.setError(error);
        span.setTag('success', false);
        throw error;
      } finally {
        span.finish();
      }
    };

    return descriptor;
  };
}

/**
 * Middleware for HTTP request tracing
 */
export function createTracingMiddleware(options = {}) {
  return (req, res, next) => {
    // Extract trace context from headers
    const context = tracer.extractTraceContext(req.headers);
    
    // Create span for the request
    const span = context.traceId 
      ? tracer.createSpanFromContext(`${req.method} ${req.route?.path || req.path}`, context, {
          type: SPAN_TYPES.HTTP,
          tags: {
            'http.method': req.method,
            'http.url': req.originalUrl || req.url,
            'http.user_agent': req.get('User-Agent'),
            'http.remote_addr': req.ip || req.connection.remoteAddress,
            'user.id': req.user?.id
          },
          ...options
        })
      : tracer.startRootSpan(`${req.method} ${req.route?.path || req.path}`, {
          type: SPAN_TYPES.HTTP,
          tags: {
            'http.method': req.method,
            'http.url': req.originalUrl || req.url,
            'http.user_agent': req.get('User-Agent'),
            'http.remote_addr': req.ip || req.connection.remoteAddress,
            'user.id': req.user?.id
          },
          ...options
        });

    // Add span to request
    req.span = span;
    req.traceId = span.traceId;
    req.spanId = span.spanId;

    // Inject trace context into response headers
    const traceHeaders = tracer.injectTraceContext(span);
    Object.entries(traceHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Override res.end to finish the span
    const originalEnd = res.end;
    res.end = function(...args) {
      span.setTag('http.status_code', res.statusCode);
      
      if (res.statusCode >= 400) {
        span.setStatus(SPAN_STATUS.UNKNOWN, `HTTP ${res.statusCode}`);
      } else {
        span.setStatus(SPAN_STATUS.OK);
      }

      span.finish();
      return originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Database tracing helper
 */
export function traceDatabaseQuery(query, duration, error = null) {
  const span = tracer.startRootSpan('database_query', {
    type: SPAN_TYPES.DATABASE,
    tags: {
      'db.query': query.substring(0, 200), // Limit query length
      'db.type': 'sql'
    }
  });

  if (error) {
    span.setError(error);
  } else {
    span.setStatus(SPAN_STATUS.OK);
  }

  span.setTag('db.duration', duration);
  span.finish(span.startTime + duration);
}

/**
 * External API tracing helper
 */
export function traceExternalCall(url, method, duration, statusCode, error = null) {
  const span = tracer.startRootSpan('external_api_call', {
    type: SPAN_TYPES.EXTERNAL,
    tags: {
      'http.url': url,
      'http.method': method,
      'http.status_code': statusCode
    }
  });

  if (error) {
    span.setError(error);
  } else if (statusCode >= 400) {
    span.setStatus(SPAN_STATUS.UNKNOWN, `HTTP ${statusCode}`);
  } else {
    span.setStatus(SPAN_STATUS.OK);
  }

  span.finish(span.startTime + duration);
}

export default {
  tracer,
  Span,
  SpanContext,
  trace,
  createTracingMiddleware,
  traceDatabaseQuery,
  traceExternalCall,
  SPAN_TYPES,
  SPAN_STATUS
};
