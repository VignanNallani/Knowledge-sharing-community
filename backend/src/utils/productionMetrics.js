// Production Metrics - Extends Existing Metrics Infrastructure
import client from 'prom-client';
import { register } from './metrics.js';

// Import existing metrics to avoid conflicts
import { 
  httpRequestDuration as existingHttpRequestDuration,
  httpRequestsTotal as existingHttpRequestsTotal,
  dbQueryDuration as existingDbQueryDuration,
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolTotal,
  activeConnections
} from './metrics.js';

// ==================== ENHANCED HTTP LAYER METRICS ====================

// Use existing HTTP duration histogram but add enhanced labels
export const httpRequestDuration = existingHttpRequestDuration;

// Use existing HTTP request counter
export const httpRequestsTotal = existingHttpRequestsTotal;

// ==================== DATABASE METRICS ====================

// Use existing DB query duration histogram
export const dbQueryDuration = existingDbQueryDuration;

// Additional pool wait count metric
export const dbPoolWaitCount = new client.Gauge({
  name: 'db_pool_wait_count',
  help: 'Number of requests waiting for database connection'
});

// ==================== REDIS METRICS ====================

// Redis Health - Distributed Dependency Health
export const redisUp = new client.Gauge({
  name: 'redis_up',
  help: 'Redis connection status (1 = up, 0 = down)'
});

export const redisLatency = new client.Gauge({
  name: 'redis_latency_seconds',
  help: 'Redis command latency in seconds'
});

export const rateLimitFallbackTotal = new client.Counter({
  name: 'rate_limit_fallback_total',
  help: 'Total rate limiting fallbacks to in-memory'
});

// ==================== RESILIENCE CONTROL METRICS ====================

// Concurrency Guard Metrics
export const concurrencyActiveRequests = new client.Gauge({
  name: 'concurrency_active_requests',
  help: 'Currently active requests'
});

export const concurrencyRejectedTotal = new client.Counter({
  name: 'concurrency_rejected_total',
  help: 'Total rejected requests due to concurrency limits',
  labelNames: ['reason'] // 'concurrency_limit' or 'circuit_open'
});

export const concurrencyQueueDepth = new client.Gauge({
  name: 'concurrency_queue_depth',
  help: 'Current queue depth for concurrency guard'
});

// Circuit Breaker Metrics
export const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)'
});

export const circuitBreakerTripsTotal = new client.Counter({
  name: 'circuit_breaker_trips_total',
  help: 'Total circuit breaker trips'
});

// Load Shedding Metrics
export const loadSheddingStage = new client.Gauge({
  name: 'load_shedding_stage',
  help: 'Load shedding stage (0=normal, 1=warning, 2=load_shed, 3=critical, 4=emergency)'
});

export const loadSheddingActivationsTotal = new client.Counter({
  name: 'load_shedding_activations_total',
  help: 'Total load shedding activations',
  labelNames: ['stage', 'strategy'] // stage + strategy type
});

// ==================== MEMORY & PROCESS HEALTH ====================

// Memory Metrics
export const processResidentMemory = new client.Gauge({
  name: 'process_resident_memory_bytes',
  help: 'Process resident memory in bytes'
});

export const processHeapUsed = new client.Gauge({
  name: 'process_heap_used_bytes',
  help: 'Process heap used in bytes'
});

export const processHeapTotal = new client.Gauge({
  name: 'process_heap_total_bytes',
  help: 'Process heap total in bytes'
});

// Event Loop Lag - Critical for Node.js
export const eventLoopLag = new client.Gauge({
  name: 'event_loop_lag_seconds',
  help: 'Event loop lag in seconds'
});

// ==================== BUSINESS METRICS ====================

// Business Operation Metrics
export const businessOperationsTotal = new client.Counter({
  name: 'business_operations_total',
  help: 'Total business operations',
  labelNames: ['operation', 'status'] // login, register, create_post, etc.
});

// Active User Sessions
export const activeUserSessions = new client.Gauge({
  name: 'active_user_sessions',
  help: 'Currently active user sessions'
});

// ==================== BASELINE DEFINITIONS ====================

// Define baseline targets for monitoring
export const BASELINE_TARGETS = {
  // HTTP Layer
  p95Latency: 0.2, // 200ms
  errorRate: 0.005, // 0.5%
  
  // Database Layer
  dbPoolUtilization: 0.7, // 70%
  dbQueryP95: 0.1, // 100ms
  
  // Redis Layer
  redisLatency: 0.005, // 5ms
  
  // Process Health
  eventLoopLag: 0.02, // 20ms
  memoryUtilization: 0.8 // 80%
};

// ==================== UTILITY FUNCTIONS ====================

// Function to normalize route names (avoid high cardinality)
export function normalizeRoute(path) {
  // Replace UUIDs and IDs with placeholders
  return path
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/:uuid')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
}

// Function to extract operation type from SQL query
export function extractOperationType(query) {
  const operation = query.trim().split(/\s+/)[0]?.toUpperCase();
  switch (operation) {
    case 'SELECT':
    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
      return operation.toLowerCase();
    default:
      return 'other';
  }
}

// Function to get status code class
export function getStatusClass(statusCode) {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 300 && statusCode < 400) return '3xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500) return '5xx';
  return 'unknown';
}

// Register new metrics (avoid re-registering existing ones)
register.registerMetric(dbPoolWaitCount);
register.registerMetric(redisUp);
register.registerMetric(redisLatency);
register.registerMetric(rateLimitFallbackTotal);
register.registerMetric(concurrencyActiveRequests);
register.registerMetric(concurrencyRejectedTotal);
register.registerMetric(concurrencyQueueDepth);
register.registerMetric(circuitBreakerState);
register.registerMetric(circuitBreakerTripsTotal);
register.registerMetric(loadSheddingStage);
register.registerMetric(loadSheddingActivationsTotal);
// Note: processResidentMemory, processHeapUsed, processHeapTotal are handled by prom-client default metrics
register.registerMetric(eventLoopLag);
register.registerMetric(businessOperationsTotal);
register.registerMetric(activeUserSessions);

export default {
  // Enhanced HTTP metrics (reusing existing)
  httpRequestDuration,
  httpRequestsTotal,
  
  // Database metrics (reusing existing + new)
  dbQueryDuration,
  dbPoolWaitCount,
  
  // Pool metrics (existing)
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolTotal,
  
  // Redis metrics
  redisUp,
  redisLatency,
  rateLimitFallbackTotal,
  
  // Resilience metrics
  concurrencyActiveRequests,
  concurrencyRejectedTotal,
  concurrencyQueueDepth,
  circuitBreakerState,
  circuitBreakerTripsTotal,
  loadSheddingStage,
  loadSheddingActivationsTotal,
  
  // Process metrics
  processResidentMemory,
  processHeapUsed,
  processHeapTotal,
  eventLoopLag,
  
  // Business metrics
  businessOperationsTotal,
  activeUserSessions,
  
  // Utilities
  BASELINE_TARGETS,
  normalizeRoute,
  extractOperationType,
  getStatusClass
};
