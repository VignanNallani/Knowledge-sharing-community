// Core middleware exports
export { default as errorHandler, handleUnhandledRejection, handleUncaughtException } from './error.middleware.js';
export { authenticate } from './authMiddleware.js';
export { default as validationMiddleware } from './validation.middleware.js';

// Security middleware
export { 
  securityHeaders, 
  corsOptions, 
  xssProtection, 
  sqlInjectionProtection, 
  requestId,
  apiSecurityHeaders 
} from './security.middleware.js';

// Rate limiting middleware
export { 
  rateLimiter,
  authRateLimiter,
  commentRateLimiter,
  followRateLimiter,
  searchRateLimiter,
  suspiciousActivityMiddleware,
  requestSizeLimit
} from './rateLimit.middleware.js';

// Observability middleware
export { 
  requestTrackingMiddleware,
  businessEventTrackingMiddleware,
  errorTrackingMiddleware 
} from './request-tracking.middleware.js';

// Tracing middleware
export { 
  tracingMiddleware, 
  databaseTracingMiddleware, 
  externalServiceTracingMiddleware, 
  cacheTracingMiddleware,
  businessLogicTracingMiddleware,
  performanceTracingMiddleware,
  errorTracingMiddleware,
  asyncContextTracingMiddleware,
  traceAggregationMiddleware 
} from './tracing.middleware.js';

// Utility middleware
export { correlationMiddleware } from './correlation.middleware.js';
export { errorContextEnrichmentMiddleware, errorRateMonitoringMiddleware } from './error-tracking.middleware.js';
