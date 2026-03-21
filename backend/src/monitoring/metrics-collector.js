import { register, Histogram, Counter, Gauge } from 'prom-client';
import { logger } from '../config/logger.js';

class MetricsCollector {
  constructor() {
    this.initializeMetrics();
  }

  initializeMetrics() {
    // Request metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5, 7, 10],
      registers: [register]
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register]
    });

    // Error rate metrics
    this.errorRate = new Gauge({
      name: 'error_rate_percentage',
      help: 'Current error rate percentage',
      labelNames: ['route'],
      registers: [register]
    });

    // Database metrics
    this.dbConnectionPoolActive = new Gauge({
      name: 'db_connection_pool_active',
      help: 'Number of active database connections',
      registers: [register]
    });

    this.dbConnectionPoolIdle = new Gauge({
      name: 'db_connection_pool_idle',
      help: 'Number of idle database connections',
      registers: [register]
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [register]
    });

    // System metrics
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'], // heap, external, rss
      registers: [register]
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percentage',
      help: 'CPU usage percentage',
      registers: [register]
    });

    // Business metrics
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of currently active users',
      registers: [register]
    });

    this.authAttempts = new Counter({
      name: 'auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['type', 'result'], // login, refresh; success, failure
      registers: [register]
    });

    this.securityIncidents = new Counter({
      name: 'security_incidents_total',
      help: 'Total security incidents',
      labelNames: ['type'], // token_reuse, brute_force, etc.
      registers: [register]
    });
  }

  // Record HTTP request
  recordHttpRequest(method, route, statusCode, duration) {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestTotal.inc(labels);
  }

  // Record error rate
  updateErrorRate(route, errorRate) {
    this.errorRate.set({ route }, errorRate);
  }

  // Record database query
  recordDbQuery(operation, table, duration) {
    this.dbQueryDuration.observe({ operation, table }, duration / 1000);
  }

  // Update system metrics
  updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.memoryUsage.set({ type: 'heap' }, memUsage.heapUsed);
    this.memoryUsage.set({ type: 'external' }, memUsage.external);
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss);

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.cpuUsage.set(50); // Placeholder - would need proper CPU monitoring
  }

  // Record authentication attempt
  recordAuthAttempt(type, result) {
    this.authAttempts.inc({ type, result });
  }

  // Record security incident
  recordSecurityIncident(type) {
    this.securityIncidents.inc({ type });
    logger.error('Security incident detected', { type, timestamp: new Date().toISOString() });
  }

  // Get metrics for Prometheus
  getMetrics() {
    return register.metrics();
  }
}

export default new MetricsCollector();
