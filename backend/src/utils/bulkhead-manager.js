import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';
import { EventEmitter } from 'events';

const logger = createLogger('BulkheadManager');

/**
 * Bulkhead Manager - Production-Grade Resource Isolation
 * 
 * Provides intelligent resource isolation with:
 * - Resource isolation between services
 * - Pool separation for different operation types
 * - Queue isolation for preventing resource exhaustion
 * - Dependency partitioning
 * - Failure containment
 */

// Bulkhead types
export const BULKHEAD_TYPES = {
  THREAD_POOL: 'thread_pool',       // Thread pool isolation
  SEMAPHORE: 'semaphore',           // Semaphore-based isolation
  QUEUE: 'queue',                   // Queue-based isolation
  RESOURCE_POOL: 'resource_pool',   // Resource pool isolation
  MEMORY: 'memory',                 // Memory-based isolation
  CONNECTION_POOL: 'connection_pool' // Connection pool isolation
};

// Bulkhead states
export const BULKHEAD_STATES = {
  HEALTHY: 'healthy',               // Normal operation
  DEGRADED: 'degraded',             // Performance degraded
  ISOLATED: 'isolated',             // Bulkhead is isolated
  EXHAUSTED: 'exhausted'            // Resources exhausted
};

// Default bulkhead configurations
export const BULKHEAD_CONFIGS = {
  // Conservative configuration for critical services
  CONSERVATIVE: {
    maxConcurrent: 10,              // Maximum concurrent operations
    maxQueueSize: 50,               // Maximum queue size
    timeout: 30000,                 // 30 seconds timeout
    rejectionPolicy: 'reject',      // Reject when full
    monitoringInterval: 5000,       // 5 seconds monitoring
    healthCheckInterval: 10000,      // 10 seconds health checks
    isolationThreshold: 0.8,        // 80% utilization triggers isolation
    recoveryThreshold: 0.5,         // 50% utilization triggers recovery
    circuitBreakerEnabled: true     // Enable circuit breaker
  },

  // Aggressive configuration for high-throughput services
  AGGRESSIVE: {
    maxConcurrent: 50,
    maxQueueSize: 200,
    timeout: 15000,                 // 15 seconds
    rejectionPolicy: 'reject',
    monitoringInterval: 2000,        // 2 seconds
    healthCheckInterval: 5000,      // 5 seconds
    isolationThreshold: 0.9,        // 90% utilization
    recoveryThreshold: 0.6,         // 60% utilization
    circuitBreakerEnabled: true
  },

  // Fast configuration for real-time services
  FAST: {
    maxConcurrent: 5,
    maxQueueSize: 20,
    timeout: 5000,                  // 5 seconds
    rejectionPolicy: 'reject',
    monitoringInterval: 1000,       // 1 second
    healthCheckInterval: 2000,      // 2 seconds
    isolationThreshold: 0.7,        // 70% utilization
    recoveryThreshold: 0.4,         // 40% utilization
    circuitBreakerEnabled: true
  },

  // Background configuration for async services
  BACKGROUND: {
    maxConcurrent: 20,
    maxQueueSize: 500,
    timeout: 120000,                // 2 minutes
    rejectionPolicy: 'queue',       // Queue when possible
    monitoringInterval: 10000,      // 10 seconds
    healthCheckInterval: 30000,     // 30 seconds
    isolationThreshold: 0.95,       // 95% utilization
    recoveryThreshold: 0.7,         // 70% utilization
    circuitBreakerEnabled: false
  }
};

// Rejection policies
export const REJECTION_POLICIES = {
  REJECT: 'reject',                 // Reject immediately when full
  QUEUE: 'queue',                   // Try to queue when possible
  CALLER_RUNS: 'caller_runs',      // Execute in caller thread
  ABORT: 'abort'                    // Abort with error
};

class Bulkhead extends EventEmitter {
  constructor(name, type, config = BULKHEAD_CONFIGS.CONSERVATIVE) {
    super();
    
    this.name = name;
    this.type = type;
    this.config = { ...config };
    this.state = BULKHEAD_STATES.HEALTHY;
    this.activeCount = 0;
    this.queuedCount = 0;
    this.queue = [];
    this.metrics = {
      totalRequests: 0,
      acceptedRequests: 0,
      rejectedRequests: 0,
      queuedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageExecutionTime: 0,
      peakConcurrency: 0,
      totalWaitTime: 0
    };
    this.stateChangedTime = Date.now();
    this.monitoringTimer = null;
    this.healthCheckTimer = null;
    this.resourcePool = null;
    this.semaphore = null;
    
    this.initializeBulkhead();
  }

  /**
   * Initialize bulkhead based on type
   */
  initializeBulkhead() {
    switch (this.type) {
      case BULKHEAD_TYPES.THREAD_POOL:
        this.initializeThreadPool();
        break;
      case BULKHEAD_TYPES.SEMAPHORE:
        this.initializeSemaphore();
        break;
      case BULKHEAD_TYPES.QUEUE:
        this.initializeQueue();
        break;
      case BULKHEAD_TYPES.RESOURCE_POOL:
        this.initializeResourcePool();
        break;
      case BULKHEAD_TYPES.CONNECTION_POOL:
        this.initializeConnectionPool();
        break;
      default:
        throw new Error(`Unsupported bulkhead type: ${this.type}`);
    }

    this.startMonitoring();
    this.startHealthChecks();
  }

  /**
   * Initialize thread pool bulkhead
   */
  initializeThreadPool() {
    // In Node.js, we simulate thread pool with concurrency control
    this.resourcePool = new Set();
  }

  /**
   * Initialize semaphore bulkhead
   */
  initializeSemaphore() {
    this.semaphore = {
      permits: this.config.maxConcurrent,
      waiting: []
    };
  }

  /**
   * Initialize queue bulkhead
   */
  initializeQueue() {
    this.queue = [];
  }

  /**
   * Initialize resource pool bulkhead
   */
  initializeResourcePool() {
    this.resourcePool = {
      resources: new Array(this.config.maxConcurrent).fill(null),
      available: new Set([...Array(this.config.maxConcurrent).keys()])
    };
  }

  /**
   * Initialize connection pool bulkhead
   */
  initializeConnectionPool() {
    this.resourcePool = {
      connections: new Array(this.config.maxConcurrent).fill(null),
      available: new Set([...Array(this.config.maxConcurrent).keys()])
    };
  }

  /**
   * Execute operation through bulkhead
   */
  async execute(operation, context = {}) {
    const startTime = Date.now();
    const operationId = this.generateOperationId();
    
    const span = distributedTracing.startSpan('bulkhead_execution', {
      bulkheadName: this.name,
      bulkheadType: this.type,
      operationId,
      state: this.state,
      activeCount: this.activeCount,
      queuedCount: this.queuedCount
    });

    try {
      // Check if bulkhead is healthy
      if (this.state === BULKHEAD_STATES.ISOLATED || this.state === BULKHEAD_STATES.EXHAUSTED) {
        const error = new Error(`Bulkhead '${this.name}' is ${this.state}`);
        error.code = 'BULKHEAD_UNAVAILABLE';
        error.bulkheadState = this.state;
        error.bulkheadName = this.name;
        
        span.finish({
          success: false,
          bulkheadUnavailable: true,
          state: this.state
        });
        
        throw error;
      }

      // Try to acquire resource
      const acquired = await this.acquireResource(operationId, context);
      if (!acquired) {
        // Handle rejection based on policy
        return await this.handleRejection(operation, context, operationId, span);
      }

      // Execute operation
      this.metrics.totalRequests++;
      this.metrics.acceptedRequests++;
      
      const result = await this.executeWithResource(operation, operationId, context);
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      
      span.finish({
        success: true,
        duration,
        waitTime: acquired.waitTime,
        state: this.state
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(duration, error);
      
      span.finish({
        success: false,
        duration,
        error: error.message,
        state: this.state
      });

      throw error;
    } finally {
      // Release resource
      this.releaseResource(operationId);
    }
  }

  /**
   * Acquire resource from bulkhead
   */
  async acquireResource(operationId, context) {
    const startTime = Date.now();

    switch (this.type) {
      case BULKHEAD_TYPES.THREAD_POOL:
        return await this.acquireFromThreadPool(operationId, startTime);
      case BULKHEAD_TYPES.SEMAPHORE:
        return await this.acquireFromSemaphore(operationId, startTime);
      case BULKHEAD_TYPES.QUEUE:
        return await this.acquireFromQueue(operationId, startTime);
      case BULKHEAD_TYPES.RESOURCE_POOL:
        return await this.acquireFromResourcePool(operationId, startTime);
      case BULKHEAD_TYPES.CONNECTION_POOL:
        return await this.acquireFromConnectionPool(operationId, startTime);
      default:
        throw new Error(`Unsupported bulkhead type: ${this.type}`);
    }
  }

  /**
   * Acquire from thread pool
   */
  async acquireFromThreadPool(operationId, startTime) {
    if (this.activeCount >= this.config.maxConcurrent) {
      if (this.queuedCount < this.config.maxQueueSize) {
        return await this.queueOperation(operationId, startTime);
      } else {
        return null; // Rejected
      }
    }

    this.activeCount++;
    this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, this.activeCount);
    
    return {
      resourceId: operationId,
      waitTime: Date.now() - startTime
    };
  }

  /**
   * Acquire from semaphore
   */
  async acquireFromSemaphore(operationId, startTime) {
    return new Promise((resolve) => {
      if (this.semaphore.permits > 0) {
        this.semaphore.permits--;
        this.activeCount++;
        this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, this.activeCount);
        
        resolve({
          resourceId: operationId,
          waitTime: Date.now() - startTime
        });
      } else {
        if (this.queuedCount < this.config.maxQueueSize) {
          this.semaphore.waiting.push({ operationId, resolve, startTime });
          this.queuedCount++;
          this.metrics.queuedRequests++;
        } else {
          resolve(null); // Rejected
        }
      }
    });
  }

  /**
   * Acquire from queue
   */
  async acquireFromQueue(operationId, startTime) {
    if (this.activeCount >= this.config.maxConcurrent) {
      if (this.queuedCount < this.config.maxQueueSize) {
        return await this.queueOperation(operationId, startTime);
      } else {
        return null; // Rejected
      }
    }

    this.activeCount++;
    this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, this.activeCount);
    
    return {
      resourceId: operationId,
      waitTime: Date.now() - startTime
    };
  }

  /**
   * Acquire from resource pool
   */
  async acquireFromResourcePool(operationId, startTime) {
    const availableResources = Array.from(this.resourcePool.available);
    
    if (availableResources.length === 0) {
      if (this.queuedCount < this.config.maxQueueSize) {
        return await this.queueOperation(operationId, startTime);
      } else {
        return null; // Rejected
      }
    }

    const resourceId = availableResources[0];
    this.resourcePool.available.delete(resourceId);
    this.resourcePool.resources[resourceId] = operationId;
    this.activeCount++;
    this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, this.activeCount);
    
    return {
      resourceId,
      waitTime: Date.now() - startTime
    };
  }

  /**
   * Acquire from connection pool
   */
  async acquireFromConnectionPool(operationId, startTime) {
    return await this.acquireFromResourcePool(operationId, startTime);
  }

  /**
   * Queue operation
   */
  async queueOperation(operationId, startTime) {
    return new Promise((resolve) => {
      this.queue.push({
        operationId,
        resolve,
        startTime,
        timestamp: Date.now()
      });
      this.queuedCount++;
      this.metrics.queuedRequests++;
    });
  }

  /**
   * Execute operation with acquired resource
   */
  async executeWithResource(operation, operationId, context) {
    // Execute with timeout
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Bulkhead operation timeout after ${this.config.timeout}ms`)), this.config.timeout)
      )
    ]);
  }

  /**
   * Handle rejection based on policy
   */
  async handleRejection(operation, context, operationId, span) {
    this.metrics.rejectedRequests++;

    switch (this.config.rejectionPolicy) {
      case REJECTION_POLICIES.REJECT:
        const error = new Error(`Bulkhead '${this.name}' is full - request rejected`);
        error.code = 'BULKHEAD_FULL';
        error.bulkheadName = this.name;
        error.activeCount = this.activeCount;
        error.maxConcurrent = this.config.maxConcurrent;
        
        span.finish({
          success: false,
          rejected: true,
          reason: 'bulkhead_full'
        });
        
        throw error;

      case REJECTION_POLICIES.CALLER_RUNS:
        // Execute in caller context
        span.finish({
          success: true,
          callerRuns: true
        });
        return await operation();

      case REJECTION_POLICIES.ABORT:
        const abortError = new Error(`Bulkhead '${this.name}' operation aborted`);
        abortError.code = 'BULKHEAD_ABORT';
        
        span.finish({
          success: false,
          aborted: true
        });
        
        throw abortError;

      default:
        throw new Error(`Unknown rejection policy: ${this.config.rejectionPolicy}`);
    }
  }

  /**
   * Release resource
   */
  releaseResource(operationId) {
    this.activeCount--;
    this.metrics.completedRequests++;

    switch (this.type) {
      case BULKHEAD_TYPES.THREAD_POOL:
        this.releaseFromThreadPool(operationId);
        break;
      case BULKHEAD_TYPES.SEMAPHORE:
        this.releaseFromSemaphore(operationId);
        break;
      case BULKHEAD_TYPES.QUEUE:
        this.releaseFromQueue(operationId);
        break;
      case BULKHEAD_TYPES.RESOURCE_POOL:
        this.releaseFromResourcePool(operationId);
        break;
      case BULKHEAD_TYPES.CONNECTION_POOL:
        this.releaseFromConnectionPool(operationId);
        break;
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Release from thread pool
   */
  releaseFromThreadPool(operationId) {
    // Thread pool doesn't need specific release logic
  }

  /**
   * Release from semaphore
   */
  releaseFromSemaphore(operationId) {
    if (this.semaphore.waiting.length > 0) {
      const waiting = this.semaphore.waiting.shift();
      this.queuedCount--;
      waiting.resolve({
        resourceId: waiting.operationId,
        waitTime: Date.now() - waiting.startTime
      });
    } else {
      this.semaphore.permits++;
    }
  }

  /**
   * Release from queue
   */
  releaseFromQueue(operationId) {
    // Queue release is handled by processQueue
  }

  /**
   * Release from resource pool
   */
  releaseFromResourcePool(operationId) {
    const resourceIndex = this.resourcePool.resources.indexOf(operationId);
    if (resourceIndex !== -1) {
      this.resourcePool.resources[resourceIndex] = null;
      this.resourcePool.available.add(resourceIndex);
    }
  }

  /**
   * Release from connection pool
   */
  releaseFromConnectionPool(operationId) {
    this.releaseFromResourcePool(operationId);
  }

  /**
   * Process queued operations
   */
  processQueue() {
    while (this.queue.length > 0 && this.activeCount < this.config.maxConcurrent) {
      const queued = this.queue.shift();
      this.queuedCount--;
      
      this.activeCount++;
      this.metrics.peakConcurrency = Math.max(this.metrics.peakConcurrency, this.activeCount);
      
      const waitTime = Date.now() - queued.startTime;
      this.metrics.totalWaitTime += waitTime;
      
      queued.resolve({
        resourceId: queued.operationId,
        waitTime
      });
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(duration) {
    this.metrics.totalRequests++;
    this.metrics.acceptedRequests++;
    this.metrics.completedRequests++;

    // Update average execution time
    const totalExecutionTime = this.metrics.averageExecutionTime * (this.metrics.completedRequests - 1) + duration;
    this.metrics.averageExecutionTime = totalExecutionTime / this.metrics.completedRequests;

    logger.debug('Bulkhead operation completed', {
      name: this.name,
      duration,
      activeCount: this.activeCount,
      queuedCount: this.queuedCount
    });
  }

  /**
   * Record failed operation
   */
  recordFailure(duration, error) {
    this.metrics.totalRequests++;
    this.metrics.acceptedRequests++;
    this.metrics.failedRequests++;

    logger.warning('Bulkhead operation failed', {
      name: this.name,
      duration,
      error: error.message,
      activeCount: this.activeCount,
      queuedCount: this.queuedCount
    });
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoringInterval);
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const utilization = this.activeCount / this.config.maxConcurrent;
    const queueUtilization = this.queuedCount / this.config.maxQueueSize;
    
    let newState = this.state;
    
    // Check for isolation conditions
    if (utilization >= this.config.isolationThreshold || queueUtilization >= 0.9) {
      if (this.state !== BULKHEAD_STATES.ISOLATED) {
        newState = BULKHEAD_STATES.ISOLATED;
      }
    }
    
    // Check for exhaustion
    if (utilization >= 1.0 && queueUtilization >= 1.0) {
      newState = BULKHEAD_STATES.EXHAUSTED;
    }
    
    // Check for recovery
    if (this.state === BULKHEAD_STATES.ISOLATED && 
        utilization <= this.config.recoveryThreshold && 
        queueUtilization <= 0.5) {
      newState = BULKHEAD_STATES.HEALTHY;
    }
    
    // Check for degradation
    if (this.state === BULKHEAD_STATES.HEALTHY && utilization >= 0.7) {
      newState = BULKHEAD_STATES.DEGRADED;
    }
    
    // Check for recovery from degradation
    if (this.state === BULKHEAD_STATES.DEGRADED && utilization <= 0.5) {
      newState = BULKHEAD_STATES.HEALTHY;
    }
    
    if (newState !== this.state) {
      this.transitionState(newState);
    }

    logger.debug('Bulkhead health check', {
      name: this.name,
      state: this.state,
      utilization,
      queueUtilization,
      activeCount: this.activeCount,
      maxConcurrent: this.config.maxConcurrent
    });
  }

  /**
   * Transition bulkhead state
   */
  transitionState(newState) {
    const previousState = this.state;
    this.state = newState;
    this.stateChangedTime = Date.now();
    
    this.emit('stateChanged', {
      name: this.name,
      from: previousState,
      to: newState,
      timestamp: Date.now()
    });

    logger.info('Bulkhead state changed', {
      name: this.name,
      from: previousState,
      to: newState
    });
  }

  /**
   * Get bulkhead status
   */
  getStatus() {
    return {
      name: this.name,
      type: this.type,
      state: this.state,
      activeCount: this.activeCount,
      queuedCount: this.queuedCount,
      maxConcurrent: this.config.maxConcurrent,
      maxQueueSize: this.config.maxQueueSize,
      utilization: this.activeCount / this.config.maxConcurrent,
      queueUtilization: this.queuedCount / this.config.maxQueueSize,
      metrics: { ...this.metrics },
      config: { ...this.config },
      stateChangedTime: this.stateChangedTime
    };
  }

  /**
   * Reset bulkhead
   */
  reset() {
    this.state = BULKHEAD_STATES.HEALTHY;
    this.activeCount = 0;
    this.queuedCount = 0;
    this.queue = [];
    this.stateChangedTime = Date.now();
    
    logger.info('Bulkhead reset', {
      name: this.name
    });
  }

  /**
   * Stop bulkhead
   */
  stop() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    logger.info('Bulkhead stopped', {
      name: this.name
    });
  }

  /**
   * Generate operation ID
   */
  generateOperationId() {
    return `bulkhead_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class BulkheadManager {
  constructor() {
    this.bulkheads = new Map();
    this.globalMetrics = {
      totalBulkheads: 0,
      healthyBulkheads: 0,
      degradedBulkheads: 0,
      isolatedBulkheads: 0,
      exhaustedBulkheads: 0,
      totalOperations: 0,
      totalRejections: 0,
      averageUtilization: 0
    };
  }

  /**
   * Create or get bulkhead
   */
  getBulkhead(name, type, config = BULKHEAD_CONFIGS.CONSERVATIVE) {
    if (!this.bulkheads.has(name)) {
      const bulkhead = new Bulkhead(name, type, config);
      
      // Set up event listeners for global metrics
      bulkhead.on('stateChanged', (event) => {
        this.updateGlobalMetrics();
      });

      this.bulkheads.set(name, bulkhead);
      this.globalMetrics.totalBulkheads++;
    }

    return this.bulkheads.get(name);
  }

  /**
   * Execute operation through bulkhead
   */
  async execute(name, type, operation, config = null) {
    const bulkhead = this.getBulkhead(name, type, config);
    return await bulkhead.execute(operation);
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    this.globalMetrics.healthyBulkheads = 0;
    this.globalMetrics.degradedBulkheads = 0;
    this.globalMetrics.isolatedBulkheads = 0;
    this.globalMetrics.exhaustedBulkheads = 0;
    this.globalMetrics.totalOperations = 0;
    this.globalMetrics.totalRejections = 0;
    let totalUtilization = 0;

    for (const bulkhead of this.bulkheads.values()) {
      const status = bulkhead.getStatus();
      
      switch (status.state) {
        case BULKHEAD_STATES.HEALTHY:
          this.globalMetrics.healthyBulkheads++;
          break;
        case BULKHEAD_STATES.DEGRADED:
          this.globalMetrics.degradedBulkheads++;
          break;
        case BULKHEAD_STATES.ISOLATED:
          this.globalMetrics.isolatedBulkheads++;
          break;
        case BULKHEAD_STATES.EXHAUSTED:
          this.globalMetrics.exhaustedBulkheads++;
          break;
      }

      this.globalMetrics.totalOperations += status.metrics.totalRequests;
      this.globalMetrics.totalRejections += status.metrics.rejectedRequests;
      totalUtilization += status.utilization;
    }

    this.globalMetrics.averageUtilization = this.bulkheads.size > 0 
      ? totalUtilization / this.bulkheads.size 
      : 0;
  }

  /**
   * Get all bulkhead statuses
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name, bulkhead] of this.bulkheads) {
      statuses[name] = bulkhead.getStatus();
    }
    return statuses;
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Reset all bulkheads
   */
  resetAll() {
    for (const bulkhead of this.bulkheads.values()) {
      bulkhead.reset();
    }
    logger.info('All bulkheads reset');
  }

  /**
   * Stop all bulkheads
   */
  stopAll() {
    for (const bulkhead of this.bulkheads.values()) {
      bulkhead.stop();
    }
    logger.info('All bulkheads stopped');
  }
}

// Create singleton instance
export const bulkheadManager = new BulkheadManager();

// Export convenience functions
export const getBulkhead = (name, type, config) => 
  bulkheadManager.getBulkhead(name, type, config);

export const executeWithBulkhead = (name, type, operation, config) => 
  bulkheadManager.execute(name, type, operation, config);

export const getAllBulkheadStatuses = () => bulkheadManager.getAllStatuses();
export const getBulkheadMetrics = () => bulkheadManager.getGlobalMetrics();

export default BulkheadManager;
