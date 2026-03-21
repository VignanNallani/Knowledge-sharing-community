// Metrics Collection Middleware - Integrates Production Metrics
import { logger } from '../config/index.js';
import productionMetrics, { normalizeRoute, getStatusClass } from '../utils/productionMetrics.js';
import { BASELINE_TARGETS } from '../utils/productionMetrics.js';
import { register } from '../utils/metrics.js';

class MetricsCollector {
  constructor() {
    this.eventLoopLagInterval = null;
    this.memoryInterval = null;
    this.poolInterval = null;
    this.prisma = null;
    
    // Request-level tracking (correct approach for admission control)
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.requestStartTimes = new Map(); // Track individual request start times
    
    // Legacy query tracking (kept for metrics only)
    this.activeQueries = 0;
    this.totalQueries = 0;
    this.queryTimeouts = 0;
    this.queryStartTimes = new Map();
  }

  // Set prisma instance for pool monitoring
  setPrisma(prisma) {
    this.prisma = prisma;
  }

  // Request-level tracking (for admission control)
  startRequest(requestId = `req_${Date.now()}_${Math.random()}`) {
    this.activeRequests++;
    this.totalRequests++;
    this.requestStartTimes.set(requestId, Date.now());
    
    console.log(`Request started: ${requestId}, active: ${this.activeRequests}`); // Debug
    
    // Update real-time metrics (using correct metric names)
    productionMetrics.dbConnectionPoolActive.set(this.activeRequests);
    productionMetrics.dbConnectionPoolTotal.set(10); // Configured pool size
    productionMetrics.dbConnectionPoolIdle.set(Math.max(0, 10 - this.activeRequests));
  }

  endRequest(requestId, statusCode = 200, duration = null) {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    
    console.log(`Request ended: ${requestId}, active: ${this.activeRequests}`); // Debug
    
    const startTime = this.requestStartTimes.get(requestId);
    if (startTime) {
      const actualDuration = duration || (Date.now() - startTime) / 1000;
      this.requestStartTimes.delete(requestId);
    }
    
    // Update real-time metrics (using correct metric names)
    productionMetrics.dbConnectionPoolActive.set(this.activeRequests);
    productionMetrics.dbConnectionPoolIdle.set(Math.max(0, 10 - this.activeRequests));
  }

  // Get active request count for admission control
  getActiveRequests() {
    return this.activeRequests;
  }

  // In-memory query tracking (zero DB load)
  startQuery(queryId = `query_${Date.now()}_${Math.random()}`) {
    this.activeQueries++;
    this.totalQueries++;
    this.queryStartTimes.set(queryId, Date.now());
    
    console.log(`Query started: ${queryId}, active: ${this.activeQueries}`); // Debug
    
    // Update real-time metrics
    productionMetrics.dbPoolActive.set(this.activeQueries);
    productionMetrics.dbPoolTotal.set(10); // Configured pool size
    productionMetrics.dbPoolIdle.set(Math.max(0, 10 - this.activeQueries));
  }

  endQuery(queryId, success = true, duration = null) {
    this.activeQueries = Math.max(0, this.activeQueries - 1);
    
    console.log(`Query ended: ${queryId}, active: ${this.activeQueries}`); // Debug
    
    const startTime = this.queryStartTimes.get(queryId);
    if (startTime) {
      const actualDuration = duration || (Date.now() - startTime) / 1000;
      
      if (!success) {
        this.queryTimeouts++;
        productionMetrics.dbQueryDuration
          .labels('timeout', 'false')
          .observe(actualDuration);
      } else {
        productionMetrics.dbQueryDuration
          .labels('select', 'true')
          .observe(actualDuration);
      }
      
      this.queryStartTimes.delete(queryId);
    }
    
    // Update real-time metrics
    productionMetrics.dbPoolActive.set(this.activeQueries);
    productionMetrics.dbPoolIdle.set(Math.max(0, 10 - this.activeQueries));
  }

  // Instrument Prisma with in-memory tracking
  instrumentPrisma(prisma) {
    const originalQuery = prisma.$queryRaw;
    const self = this;
    
    // Instrument $queryRaw
    prisma.$queryRaw = async function(...args) {
      const queryId = `raw_${Date.now()}_${Math.random()}`;
      self.startQuery(queryId);
      
      try {
        const result = await originalQuery.apply(this, args);
        self.endQuery(queryId, true);
        return result;
      } catch (error) {
        self.endQuery(queryId, false);
        throw error;
      }
    };
    
    // Note: We'll instrument model methods in databaseMetrics() where we have access to specific models
    console.log('Prisma instrumentation enabled for in-memory pool monitoring');
  }

  // HTTP Request Metrics Middleware
  httpRequestMetrics() {
    return (req, res, next) => {
      const startTime = Date.now();
      const method = req.method;
      const route = normalizeRoute(req.path || req.route?.path || 'unknown');
      
      // Start request tracking for admission control
      const requestId = `req_${Date.now()}_${Math.random()}`;
      this.startRequest(requestId);
      
      // Track active requests with proper lifecycle management
      productionMetrics.concurrencyActiveRequests.inc();
      let requestCompleted = false;

      const completeRequest = () => {
        if (!requestCompleted) {
          requestCompleted = true;
          
          // End request tracking
          this.endRequest(requestId, res.statusCode);
          
          productionMetrics.concurrencyActiveRequests.dec();
        }
      };

      // Handle request completion
      res.on('finish', () => {
        try {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = res.statusCode;
          const statusClass = getStatusClass(statusCode);

          // Record HTTP metrics
          productionMetrics.httpRequestTotal
            .labels(method, route, statusClass)
            .inc();

          productionMetrics.httpRequestDuration
            .labels(method, route, statusClass)
            .observe(duration);

          // Log slow requests
          if (duration > BASELINE_TARGETS.p95Latency) {
            logger.warn('Slow HTTP request detected', {
              method,
              route,
              statusCode,
              duration,
              threshold: BASELINE_TARGETS.p95Latency
            });
          }

        } catch (error) {
          logger.error('Error recording HTTP metrics', { error: error.message });
        } finally {
          completeRequest();
        }
      });

      // Handle request errors and close - ensure single completion
      res.on('error', completeRequest);
      res.on('close', completeRequest);

      next();
    };
  }

  // Database Query Metrics Middleware
  databaseMetrics(prisma) {
    console.log('Setting up database metrics...'); // Debug
    
    // Enhance existing Prisma query event listener with metrics
    prisma.$on('query', (e) => {
      try {
        const duration = e.duration / 1000; // Convert to seconds
        const operation = e.query.trim().split(/\s+/)[0]?.toLowerCase() || 'unknown';
        const success = !e.error;

        // Record query duration (no concurrent tracking here - events fire after completion)
        productionMetrics.dbQueryDuration
          .labels(operation, success.toString())
          .observe(duration);

        // Log slow queries
        if (duration > BASELINE_TARGETS.dbQueryP95) {
          logger.warn('Slow database query detected', {
            operation,
            duration,
            target: e.target,
            threshold: BASELINE_TARGETS.dbQueryP95
          });
        }

        // Track for request profiler (if available)
        // Note: This is a limitation - we don't have access to the request object here
        // We'll need to use a different approach for detailed profiling

      } catch (error) {
        logger.error('Error recording DB metrics', { error: error.message });
      }
    });
    
    // Log error events
    prisma.$on('error', (e) => {
      logger.error('Prisma error event', {
        message: e.message,
        target: e.target
      });
    });
  }

  // Redis Metrics
  async updateRedisMetrics(redisClient) {
    try {
      if (!redisClient) {
        productionMetrics.redisUp.set(0);
        return;
      }

      // Test Redis connectivity
      const startTime = Date.now();
      await redisClient.ping();
      const latency = (Date.now() - startTime) / 1000;

      productionMetrics.redisUp.set(1);
      productionMetrics.redisLatency.set(latency);

      if (latency > BASELINE_TARGETS.redisLatency) {
        logger.warn('High Redis latency detected', {
          latency,
          threshold: BASELINE_TARGETS.redisLatency
        });
      }

    } catch (error) {
      productionMetrics.redisUp.set(0);
      logger.warn('Redis health check failed', { error: error.message });
    }
  }

  // Connection Pool Metrics
  async updatePoolMetrics(prisma) {
    try {
      // Use a simpler, faster query for pool stats
      const result = await prisma.$queryRaw`
        SELECT count(*) as total_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      console.log('Pool query result:', result); // Debug log

      if (result && result[0]) {
        const totalConnections = result[0].total_connections || 0;
        productionMetrics.dbPoolTotal.set(totalConnections);
        
        // For now, estimate active/idle split (we can refine this later)
        const estimatedActive = Math.min(totalConnections, 5); // Conservative estimate
        const estimatedIdle = Math.max(0, totalConnections - estimatedActive);
        
        productionMetrics.dbPoolActive.set(estimatedActive);
        productionMetrics.dbPoolIdle.set(estimatedIdle);
        productionMetrics.dbPoolWaitCount.set(0);

        // Check pool utilization
        const utilization = totalConnections > 0 ? estimatedActive / totalConnections : 0;

        if (utilization > BASELINE_TARGETS.dbPoolUtilization) {
          logger.warn('High database pool utilization', {
            utilization,
            active: estimatedActive,
            total: totalConnections,
            threshold: BASELINE_TARGETS.dbPoolUtilization
          });
        }
      } else {
        console.log('No pool stats returned'); // Debug log
      }
    } catch (error) {
      console.error('Pool metrics error:', error); // Debug log
      logger.error('Failed to update pool metrics', { error: error.message });
    }
  }

  // Process Health Metrics
  startProcessMetrics() {
    // Update memory metrics every 10 seconds
    this.memoryInterval = setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        productionMetrics.processResidentMemory.set(memUsage.rss);
        productionMetrics.processHeapUsed.set(memUsage.heapUsed);
        productionMetrics.processHeapTotal.set(memUsage.heapTotal);

        // Check memory utilization
        const heapUtilization = memUsage.heapUsed / memUsage.heapTotal;
        if (heapUtilization > BASELINE_TARGETS.memoryUtilization) {
          logger.warn('High memory utilization', {
            heapUtilization,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            threshold: BASELINE_TARGETS.memoryUtilization
          });
        }
      } catch (error) {
        logger.error('Error updating memory metrics', { error: error.message });
      }
    }, 10000);

    // Update pool metrics every 30 seconds (in-memory only)
    this.poolInterval = setInterval(() => {
      try {
        // Update metrics from in-memory request tracking (no DB queries!)
        productionMetrics.dbConnectionPoolActive.set(this.activeRequests);
        productionMetrics.dbConnectionPoolTotal.set(10); // Configured pool size
        productionMetrics.dbConnectionPoolIdle.set(Math.max(0, 10 - this.activeRequests));
        productionMetrics.dbPoolWaitCount.set(Math.max(0, this.totalRequests - this.activeRequests));
        
        // Log pool utilization warning
        const utilization = this.activeRequests / 10;
        if (utilization > BASELINE_TARGETS.dbPoolUtilization) {
          logger.warn('High database pool utilization', {
            utilization,
            active: this.activeRequests,
            total: 10,
            threshold: BASELINE_TARGETS.dbPoolUtilization
          });
        }
      } catch (error) {
        logger.error('Failed to update pool metrics', { error: error.message });
      }
    }, 30000);

    // Update event loop lag every 5 seconds
    this.eventLoopLagInterval = setInterval(() => {
      try {
        const start = process.hrtime.bigint();

        if (lag > BASELINE_TARGETS.eventLoopLag) {
          logger.warn('High event loop lag detected', {
            lag,
            threshold: BASELINE_TARGETS.eventLoopLag
          });
        }
      } catch (error) {
        logger.error('Failed to update event loop lag', { error: error.message });
      }
    }, 5000);
  }

  getEventLoopLag() {
    const start = process.hrtime.bigint();
    return new Promise(resolve => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds
        resolve(lag);
      });
    });
  }

  // Resilience Metrics Integration
  updateConcurrencyGuardMetrics(stats) {
    productionMetrics.concurrencyActiveRequests.set(stats.activeRequests);
    productionMetrics.concurrencyQueueDepth.set(stats.utilization * stats.maxConcurrent);
  }

  recordConcurrencyRejection(reason) {
    productionMetrics.concurrencyRejectedTotal.labels(reason).inc();
  }

  updateCircuitBreakerState(state) {
    productionMetrics.circuitBreakerState.set(state);
  }

  recordCircuitBreakerTrip() {
    productionMetrics.circuitBreakerTripsTotal.inc();
  }

  updateLoadSheddingStage(stage) {
    productionMetrics.loadSheddingStage.set(stage);
  }

  recordLoadSheddingActivation(stage, strategy) {
    productionMetrics.loadSheddingActivationsTotal.labels(stage.toString(), strategy).inc();
  }

  recordRateLimitFallback() {
    productionMetrics.rateLimitFallbackTotal.inc();
  }

  // Cleanup
  stop() {
    if (this.eventLoopLagInterval) {
      clearInterval(this.eventLoopLagInterval);
      this.eventLoopLagInterval = null;
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }
}

export default MetricsCollector;
