import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// HTTP Request Duration Histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2]
});

// HTTP Request Counter
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Active Connections Gauge
export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Database Connection Pool Metrics
export const dbConnectionPoolActive = new client.Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections'
});

export const dbConnectionPoolIdle = new client.Gauge({
  name: 'db_connection_pool_idle',
  help: 'Number of idle database connections'
});

export const dbConnectionPoolTotal = new client.Gauge({
  name: 'db_connection_pool_total',
  help: 'Total number of database connections'
});

// Database Query Metrics
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]
});

export const dbQueriesTotal = new client.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status']
});

export const dbSlowQueriesTotal = new client.Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow database queries (>200ms)',
  labelNames: ['operation', 'table']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(dbConnectionPoolActive);
register.registerMetric(dbConnectionPoolIdle);
register.registerMetric(dbConnectionPoolTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbQueriesTotal);
register.registerMetric(dbSlowQueriesTotal);

// Export the register for use in the /metrics endpoint
export { register };
