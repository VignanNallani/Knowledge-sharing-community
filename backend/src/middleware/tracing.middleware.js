import { tracer, createTracingMiddleware, traceDatabaseQuery, traceExternalCall } from '../utils/distributed-tracing.js';
import { logInfo, logDebug } from '../config/structured-logger.js';

/**
 * Enhanced Tracing Middleware
 * 
 * Provides comprehensive HTTP request tracing with automatic span creation,
 * context propagation, and performance monitoring.
 */
export const tracingMiddleware = createTracingMiddleware({
  serviceName: process.env.SERVICE_NAME || 'knowledge-sharing-backend'
});

/**
 * Database Tracing Middleware
 * 
 * Automatically traces database queries and operations.
 */
export const databaseTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Override common database methods to add tracing
  const originalQuery = req.db?.query;
  if (originalQuery) {
    req.db.query = function(...args) {
      const startTime = Date.now();
      const query = args[0] || 'unknown';
      
      return originalQuery.apply(this, args)
        .then(result => {
          const duration = Date.now() - startTime;
          traceDatabaseQuery(query, duration);
          
          // Add database span as child of request span
          const dbSpan = req.span.createChild('database_query', {
            type: 'database',
            tags: {
              'db.query': query.substring(0, 200),
              'db.duration': duration,
              'db.success': true
            }
          });
          dbSpan.finish();
          
          return result;
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          traceDatabaseQuery(query, duration, error);
          
          // Add error span
          const dbSpan = req.span.createChild('database_query', {
            type: 'database',
            tags: {
              'db.query': query.substring(0, 200),
              'db.duration': duration,
              'db.success': false,
              'db.error': error.message
            }
          });
          dbSpan.setError(error);
          dbSpan.finish();
          
          throw error;
        });
    };
  }

  next();
};

/**
 * External Service Tracing Middleware
 * 
 * Automatically traces calls to external services.
 */
export const externalServiceTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Override fetch to add tracing
  const originalFetch = global.fetch;
  if (originalFetch) {
    global.fetch = function(url, options = {}) {
      const startTime = Date.now();
      const method = options.method || 'GET';
      
      // Create child span for external call
      const externalSpan = req.span.createChild('external_api_call', {
        type: 'external',
        tags: {
          'http.url': url,
          'http.method': method,
          'external.service': new URL(url).hostname
        }
      });

      return originalFetch(url, options)
        .then(response => {
          const duration = Date.now() - startTime;
          
          externalSpan.setTag('http.status_code', response.status);
          externalSpan.setTag('external.duration', duration);
          
          if (response.ok) {
            externalSpan.setStatus('OK');
          } else {
            externalSpan.setStatus('UNKNOWN', `HTTP ${response.status}`);
          }
          
          externalSpan.finish();
          traceExternalCall(url, method, duration, response.status);
          
          return response;
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          
          externalSpan.setError(error);
          externalSpan.setTag('external.duration', duration);
          externalSpan.finish();
          
          traceExternalCall(url, method, duration, null, error);
          
          throw error;
        });
    };
  }

  next();
};

/**
 * Cache Tracing Middleware
 * 
 * Automatically traces cache operations.
 */
export const cacheTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Override cache methods if available
  if (req.app.locals.cache) {
    const cache = req.app.locals.cache;
    
    // Trace get operations
    const originalGet = cache.get;
    if (originalGet) {
      cache.get = function(key, ...args) {
        const startTime = Date.now();
        
        return originalGet.apply(this, args)
          .then(result => {
            const duration = Date.now() - startTime;
            const hit = result !== null && result !== undefined;
            
            const cacheSpan = req.span.createChild('cache_get', {
              type: 'cache',
              tags: {
                'cache.key': key,
                'cache.hit': hit,
                'cache.duration': duration
              }
            });
            
            cacheSpan.setStatus('OK');
            cacheSpan.finish();
            
            return result;
          })
          .catch(error => {
            const duration = Date.now() - startTime;
            
            const cacheSpan = req.span.createChild('cache_get', {
              type: 'cache',
              tags: {
                'cache.key': key,
                'cache.hit': false,
                'cache.duration': duration,
                'cache.error': error.message
              }
            });
            
            cacheSpan.setError(error);
            cacheSpan.finish();
            
            throw error;
          });
      };
    }
    
    // Trace set operations
    const originalSet = cache.set;
    if (originalSet) {
      cache.set = function(key, value, ...args) {
        const startTime = Date.now();
        
        return originalSet.apply(this, [key, value, ...args])
          .then(result => {
            const duration = Date.now() - startTime;
            
            const cacheSpan = req.span.createChild('cache_set', {
              type: 'cache',
              tags: {
                'cache.key': key,
                'cache.duration': duration
              }
            });
            
            cacheSpan.setStatus('OK');
            cacheSpan.finish();
            
            return result;
          })
          .catch(error => {
            const duration = Date.now() - startTime;
            
            const cacheSpan = req.span.createChild('cache_set', {
              type: 'cache',
              tags: {
                'cache.key': key,
                'cache.duration': duration,
                'cache.error': error.message
              }
            });
            
            cacheSpan.setError(error);
            cacheSpan.finish();
            
            throw error;
          });
      };
    }
  }

  next();
};

/**
 * Business Logic Tracing Middleware
 * 
 * Automatically traces business logic operations based on request patterns.
 */
export const businessLogicTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Override res.end to add business logic tracing
  const originalEnd = res.end;
  res.end = function(...args) {
    // Create business logic spans based on request
    const businessOperation = getBusinessOperation(req);
    
    if (businessOperation) {
      const businessSpan = req.span.createChild(businessOperation.name, {
        type: 'internal',
        tags: {
          'business.operation': businessOperation.name,
          'business.category': businessOperation.category,
          'user.id': req.user?.id,
          'http.status_code': res.statusCode
        }
      });
      
      if (res.statusCode >= 400) {
        businessSpan.setStatus('UNKNOWN', `HTTP ${res.statusCode}`);
      } else {
        businessSpan.setStatus('OK');
      }
      
      businessSpan.finish();
    }

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Get business operation from request
 */
function getBusinessOperation(req) {
  const { method, originalUrl, user } = req;
  const path = originalUrl?.split('?')[0];

  // Authentication operations
  if (path?.includes('/auth/login') && method === 'POST') {
    return { name: 'user_login', category: 'authentication' };
  }
  if (path?.includes('/auth/register') && method === 'POST') {
    return { name: 'user_registration', category: 'authentication' };
  }
  if (path?.includes('/auth/logout') && method === 'POST') {
    return { name: 'user_logout', category: 'authentication' };
  }

  // Content operations
  if (path?.includes('/posts') && method === 'POST') {
    return { name: 'post_creation', category: 'content' };
  }
  if (path?.includes('/posts') && method === 'GET') {
    return { name: 'post_retrieval', category: 'content' };
  }
  if (path?.includes('/comments') && method === 'POST') {
    return { name: 'comment_creation', category: 'content' };
  }
  if (path?.includes('/likes') && method === 'POST') {
    return { name: 'content_like', category: 'content' };
  }

  // Social operations
  if (path?.includes('/follow') && method === 'POST') {
    return { name: 'user_follow', category: 'social' };
  }
  if (path?.includes('/unfollow') && method === 'POST') {
    return { name: 'user_unfollow', category: 'social' };
  }

  // Mentorship operations
  if (path?.includes('/mentorship') && method === 'POST') {
    return { name: 'mentorship_request', category: 'mentorship' };
  }
  if (path?.includes('/mentorship') && method === 'GET') {
    return { name: 'mentorship_browse', category: 'mentorship' };
  }

  // Moderation operations
  if (path?.includes('/moderation') && method === 'POST') {
    return { name: 'content_moderation', category: 'moderation' };
  }

  return null;
}

/**
 * Performance Tracing Middleware
 * 
 * Monitors performance metrics and creates spans for slow operations.
 */
export const performanceTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  const startTime = process.hrtime.bigint();
  
  // Override res.end to measure performance
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Create performance span
    const perfSpan = req.span.createChild('request_performance', {
      type: 'internal',
      tags: {
        'performance.duration': duration,
        'performance.slow': duration > 1000 // Mark as slow if > 1 second
      }
    });
    
    if (duration > 1000) {
      perfSpan.setStatus('UNKNOWN', 'Slow request detected');
      logInfo('Slow request detected', {
        duration,
        url: req.originalUrl,
        method: req.method,
        traceId: req.traceId,
        spanId: req.spanId
      });
    } else {
      perfSpan.setStatus('OK');
    }
    
    perfSpan.finish();
    
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Error Tracing Middleware
 * 
 * Automatically traces errors and creates error spans.
 */
export const errorTracingMiddleware = (error, req, res, next) => {
  if (req.span) {
    // Create error span
    const errorSpan = req.span.createChild('error_handling', {
      type: 'internal',
      tags: {
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.code': error.code,
        'http.status_code': res.statusCode
      }
    });
    
    errorSpan.setError(error);
    errorSpan.finish();
    
    // Add error to parent span
    req.span.setError(error);
  }

  next(error);
};

/**
 * Async Context Tracing Middleware
 * 
 * Maintains trace context across async operations.
 */
export const asyncContextTracingMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Store current span in async local storage (simplified version)
  const originalThen = Promise.prototype.then;
  
  Promise.prototype.then = function(onFulfilled, onRejected) {
    const wrappedOnFulfilled = onFulfilled ? function(value) {
      // Restore span context
      if (req.span && !global.currentSpan) {
        global.currentSpan = req.span;
      }
      return onFulfilled(value);
    } : undefined;
    
    const wrappedOnRejected = onRejected ? function(error) {
      // Restore span context
      if (req.span && !global.currentSpan) {
        global.currentSpan = req.span;
      }
      return onRejected(error);
    } : undefined;
    
    return originalThen.call(this, wrappedOnFulfilled, wrappedOnRejected);
  };

  // Set current span globally
  global.currentSpan = req.span;

  next();
};

/**
 * Trace Aggregation Middleware
 * 
 * Aggregates trace data for analysis and reporting.
 */
export const traceAggregationMiddleware = (req, res, next) => {
  if (!req.span) {
    return next();
  }

  // Override res.end to aggregate trace data
  const originalEnd = res.end;
  res.end = function(...args) {
    // Collect trace data for aggregation
    const traceData = {
      traceId: req.traceId,
      spanId: req.spanId,
      operation: req.span.operationName,
      duration: req.span.duration,
      tags: req.span.tags,
      statusCode: res.statusCode,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    };

    // Store trace data for analysis (in production, this would go to a trace collector)
    if (!global.traceData) {
      global.traceData = [];
    }
    global.traceData.push(traceData);
    
    // Keep only recent traces to prevent memory issues
    if (global.traceData.length > 10000) {
      global.traceData = global.traceData.slice(-5000);
    }

    logDebug('Trace data aggregated', {
      traceId: traceData.traceId,
      operation: traceData.operation,
      duration: traceData.duration
    });

    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Get trace statistics
 */
export function getTraceStatistics() {
  const stats = tracer.getStats();
  const recentTraces = global.traceData?.slice(-1000) || [];
  
  // Calculate additional statistics
  const avgDuration = recentTraces.length > 0
    ? recentTraces.reduce((sum, trace) => sum + (trace.duration || 0), 0) / recentTraces.length
    : 0;

  const errorRate = recentTraces.length > 0
    ? recentTraces.filter(trace => trace.statusCode >= 400).length / recentTraces.length
    : 0;

  return {
    ...stats,
    recentTraces: recentTraces.length,
    averageDuration: Math.round(avgDuration),
    errorRate: Math.round(errorRate * 10000) / 100, // Round to 2 decimal places
    slowRequests: recentTraces.filter(trace => (trace.duration || 0) > 1000).length
  };
}

export default {
  tracingMiddleware,
  databaseTracingMiddleware,
  externalServiceTracingMiddleware,
  cacheTracingMiddleware,
  businessLogicTracingMiddleware,
  performanceTracingMiddleware,
  errorTracingMiddleware,
  asyncContextTracingMiddleware,
  traceAggregationMiddleware,
  getTraceStatistics
};
