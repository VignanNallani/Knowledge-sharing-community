import { logger } from '../config/index.js';
import { cacheService } from '../cache/cache.service.js';

class ObservabilityService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        methods: {},
        endpoints: {},
        responseTime: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      },
      auth: {
        logins: 0,
        failedLogins: 0,
        registrations: 0,
      },
      business: {
        postsCreated: 0,
        commentsCreated: 0,
        likesGiven: 0,
        follows: 0,
        reports: 0,
      },
    };
    
    this.startTimes = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.slowRequestThreshold = 2000; // 2 seconds
  }

  // Request tracking
  trackRequest(req, res, next) {
    const startTime = Date.now();
    const requestId = req.id || this.generateRequestId();
    
    req.requestId = requestId;
    res.set('X-Request-ID', requestId);
    
    // Track request start
    this.metrics.requests.total++;
    this.trackMethod(req.method);
    this.trackEndpoint(req.route?.path || req.path);
    
    // Override res.end to track completion
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      
      // Track response time
      observability.trackResponseTime(responseTime);
      
      // Track success/error
      if (res.statusCode >= 200 && res.statusCode < 400) {
        observability.trackSuccess();
      } else {
        observability.trackError();
      }
      
      // Log slow requests
      if (responseTime > observability.slowRequestThreshold) {
        logger.warn(`Slow request detected`, {
          requestId,
          method: req.method,
          path: req.path,
          responseTime,
          statusCode: res.statusCode,
        });
      }
      
      // Log request completion
      logger.info(`Request completed`, {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      
      return originalEnd.apply(this, args);
    };
    
    next();
  }

  trackResponseTime(responseTime) {
    this.metrics.requests.responseTime.push(responseTime);
    // Keep only last 1000 response times
    if (this.metrics.requests.responseTime.length > 1000) {
      this.metrics.requests.responseTime.shift();
    }
  }

  trackSuccess() {
    this.metrics.requests.success++;
  }

  trackError() {
    this.metrics.requests.error++;
  }

  trackMethod(method) {
    this.metrics.requests.methods[method] = (this.metrics.requests.methods[method] || 0) + 1;
  }

  trackEndpoint(endpoint) {
    this.metrics.requests.endpoints[endpoint] = (this.metrics.requests.endpoints[endpoint] || 0) + 1;
  }

  // Database tracking
  trackQuery(query, duration) {
    this.metrics.database.queries++;
    
    if (duration > this.slowQueryThreshold) {
      this.metrics.database.slowQueries++;
      logger.warn(`Slow query detected`, {
        query: query.substring(0, 200),
        duration,
      });
    }
  }

  trackDatabaseError(error, query) {
    this.metrics.database.errors++;
    
    if (!error) {
      logger.error(`Database error with null error object`, {
        query: query?.substring(0, 200),
      });
      return;
    }

    const message = error?.message || "Unknown database error";
    
    logger.error(`Database error`, {
      error: message,
      query: query?.substring(0, 200),
      raw: error
    });
  }

  // Cache tracking
  trackCacheHit() {
    this.metrics.cache.hits++;
  }

  trackCacheMiss() {
    this.metrics.cache.misses++;
  }

  trackCacheSet() {
    this.metrics.cache.sets++;
  }

  trackCacheDelete() {
    this.metrics.cache.deletes++;
  }

  // Auth tracking
  trackLogin(success = true) {
    if (success) {
      this.metrics.auth.logins++;
    } else {
      this.metrics.auth.failedLogins++;
    }
  }

  trackRegistration() {
    this.metrics.auth.registrations++;
  }

  // Business metrics tracking
  trackPostCreated() {
    this.metrics.business.postsCreated++;
  }

  trackCommentCreated() {
    this.metrics.business.commentsCreated++;
  }

  trackLikeGiven() {
    this.metrics.business.likesGiven++;
  }

  trackFollow() {
    this.metrics.business.follows++;
  }

  trackReport() {
    this.metrics.business.reports++;
  }

  // Performance monitoring
  getResponseTimeStats() {
    const responseTimes = this.metrics.requests.responseTime;
    if (responseTimes.length === 0) return null;

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      avg: responseTimes.reduce((a, b) => a + b, 0) / len,
      min: sorted[0],
      max: sorted[len - 1],
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
    };
  }

  getCacheStats() {
    const cacheMetrics = cacheService.getStats();
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    
    return {
      ...cacheMetrics,
      hitRate: total > 0 ? this.metrics.cache.hits / total : 0,
      operations: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        sets: this.metrics.cache.sets,
        deletes: this.metrics.cache.deletes,
      },
    };
  }

  // Health check
  getHealthStatus() {
    const responseTimeStats = this.getResponseTimeStats();
    const cacheStats = this.getCacheStats();
    const errorRate = this.metrics.requests.total > 0 
      ? this.metrics.requests.error / this.metrics.requests.total 
      : 0;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      metrics: {
        requests: {
          total: this.metrics.requests.total,
          success: this.metrics.requests.success,
          error: this.metrics.requests.error,
          errorRate: Math.round(errorRate * 10000) / 100, // Round to 2 decimal places
          responseTime: responseTimeStats,
        },
        database: {
          queries: this.metrics.database.queries,
          slowQueries: this.metrics.database.slowQueries,
          errors: this.metrics.database.errors,
        },
        cache: cacheStats,
        auth: this.metrics.auth,
        business: this.metrics.business,
      },
    };
  }

  // Metrics endpoint data
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      ...this.metrics,
      responseTimeStats: this.getResponseTimeStats(),
      cacheStats: this.getCacheStats(),
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        methods: {},
        endpoints: {},
        responseTime: [],
      },
      database: {
        queries: 0,
        slowQueries: 0,
        errors: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      },
      auth: {
        logins: 0,
        failedLogins: 0,
        registrations: 0,
      },
      business: {
        postsCreated: 0,
        commentsCreated: 0,
        likesGiven: 0,
        follows: 0,
        reports: 0,
      },
    };
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Error tracking
  trackError(error = null, req = null) {
    if (!error) {
      logger.error("Unknown error captured", { 
        error: null,
        timestamp: new Date().toISOString(),
        requestId: req?.requestId,
        method: req?.method,
        path: req?.path,
        userId: req?.user?.id,
      });
      return;
    }

    const message = error?.message || "Unknown error";
    const stack = error?.stack || null;
    
    const errorData = {
      message,
      stack,
      timestamp: new Date().toISOString(),
      requestId: req?.requestId,
      method: req?.method,
      path: req?.path,
      userId: req?.user?.id,
      raw: error
    };

    logger.error('Application error', errorData);
  }
}

export const observability = new ObservabilityService();

// Middleware for request tracking
export const requestTracking = (req, res, next) => {
  observability.trackRequest(req, res, next);
};

// Database query tracking wrapper
export const trackDatabaseQuery = (queryFn) => {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await queryFn(...args);
      const duration = Date.now() - startTime;
      observability.trackQuery(args[0] || 'unknown', duration);
      return result;
    } catch (error) {
      observability.trackDatabaseError(error, args[0]);
      throw error;
    }
  };
};

export default observability;
