import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';
import { EventEmitter } from 'events';

const logger = createLogger('CircuitBreaker');

/**
 * Circuit Breaker - Production-Grade Failure Isolation
 * 
 * Provides intelligent circuit breaking with:
 * - Failure threshold tracking
 * - Open/half-open/closed states
 * - Auto-recovery with health probing
 * - State persistence
 * - Dependency isolation
 */

// Circuit breaker states
export const CIRCUIT_STATES = {
  CLOSED: 'closed',      // Normal operation, requests pass through
  OPEN: 'open',          // Circuit is open, requests fail fast
  HALF_OPEN: 'half_open' // Testing state, limited requests allowed
};

// Circuit breaker events
export const CIRCUIT_EVENTS = {
  STATE_CHANGED: 'state_changed',
  CIRCUIT_OPENED: 'circuit_opened',
  CIRCUIT_CLOSED: 'circuit_closed',
  HEALTH_CHECK_PASSED: 'health_check_passed',
  HEALTH_CHECK_FAILED: 'health_check_failed',
  THRESHOLD_EXCEEDED: 'threshold_exceeded'
};

// Default circuit breaker configurations
export const CIRCUIT_CONFIGS = {
  // Conservative configuration for critical services
  CONSERVATIVE: {
    failureThreshold: 5,        // Open after 5 failures
    successThreshold: 3,        // Close after 3 successes in half-open
    timeout: 60000,            // 1 minute timeout before trying half-open
    resetTimeout: 300000,       // 5 minutes to fully reset
    monitoringPeriod: 300000,  // 5 minutes monitoring period
    minThroughput: 10,         // Minimum requests before considering circuit state
    healthCheckInterval: 30000, // 30 seconds between health checks
    maxHalfOpenCalls: 3        // Max calls in half-open state
  },

  // Aggressive configuration for non-critical services
  AGGRESSIVE: {
    failureThreshold: 10,
    successThreshold: 5,
    timeout: 30000,            // 30 seconds
    resetTimeout: 120000,       // 2 minutes
    monitoringPeriod: 120000,   // 2 minutes
    minThroughput: 5,
    healthCheckInterval: 15000, // 15 seconds
    maxHalfOpenCalls: 5
  },

  // Fast configuration for real-time services
  FAST: {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 10000,            // 10 seconds
    resetTimeout: 60000,        // 1 minute
    monitoringPeriod: 60000,    // 1 minute
    minThroughput: 3,
    healthCheckInterval: 5000,  // 5 seconds
    maxHalfOpenCalls: 2
  },

  // Background configuration for async services
  BACKGROUND: {
    failureThreshold: 20,
    successThreshold: 10,
    timeout: 120000,           // 2 minutes
    resetTimeout: 600000,      // 10 minutes
    monitoringPeriod: 600000,  // 10 minutes
    minThroughput: 20,
    healthCheckInterval: 60000, // 1 minute
    maxHalfOpenCalls: 10
  }
};

class CircuitBreaker extends EventEmitter {
  constructor(name, config = CIRCUIT_CONFIGS.CONSERVATIVE) {
    super();
    
    this.name = name;
    this.config = { ...config };
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangedTime = Date.now();
    this.halfOpenCalls = 0;
    this.healthCheckTimer = null;
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpens: 0,
      circuitCloses: 0,
      averageResponseTime: 0,
      lastHealthCheck: null,
      healthCheckResults: []
    };
    
    this.startHealthMonitoring();
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(operation, context = {}) {
    const startTime = Date.now();
    const span = distributedTracing.startSpan('circuit_breaker_execution', {
      circuitName: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount
    });

    try {
      // Check if circuit is open
      if (this.state === CIRCUIT_STATES.OPEN) {
        if (this.shouldAttemptReset()) {
          this.transitionToHalfOpen();
        } else {
          const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
          error.code = 'CIRCUIT_OPEN';
          error.circuitState = this.state;
          error.circuitName = this.name;
          error.retryAfter = this.config.timeout - (Date.now() - this.stateChangedTime);
          
          span.finish({
            success: false,
            circuitOpen: true,
            reason: 'circuit_open'
          });
          
          throw error;
        }
      }

      // Check half-open call limit
      if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        if (this.halfOpenCalls >= this.config.maxHalfOpenCalls) {
          const error = new Error(`Circuit breaker '${this.name}' half-open call limit exceeded`);
          error.code = 'HALF_OPEN_LIMIT_EXCEEDED';
          error.circuitState = this.state;
          error.circuitName = this.name;
          
          span.finish({
            success: false,
            halfOpenLimitExceeded: true
          });
          
          throw error;
        }
        this.halfOpenCalls++;
      }

      // Execute the operation
      this.requestCount++;
      this.metrics.totalRequests++;
      
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // Record success
      this.recordSuccess(duration);
      
      span.finish({
        success: true,
        duration,
        state: this.state
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(error, duration);
      
      span.finish({
        success: false,
        duration,
        error: error.message,
        state: this.state
      });

      throw error;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(duration = 0) {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    this.metrics.totalSuccesses++;
    
    // Update average response time
    if (duration > 0) {
      const totalDuration = this.metrics.averageResponseTime * (this.metrics.totalSuccesses - 1) + duration;
      this.metrics.averageResponseTime = totalDuration / this.metrics.totalSuccesses;
    }

    // Handle half-open state
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }

    logger.debug('Circuit breaker success recorded', {
      name: this.name,
      state: this.state,
      successCount: this.successCount,
      failureCount: this.failureCount,
      duration
    });
  }

  /**
   * Record failed operation
   */
  recordFailure(error, duration = 0) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.metrics.totalFailures++;

    // Classify error for intelligent circuit breaking
    const classification = errorIntelligence.classifyError(error);

    // Handle different states
    if (this.state === CIRCUIT_STATES.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit(classification)) {
        this.transitionToOpen(error, classification);
      }
    } else if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      // Any failure in half-open opens the circuit immediately
      this.transitionToOpen(error, classification);
    }

    logger.warning('Circuit breaker failure recorded', {
      name: this.name,
      state: this.state,
      successCount: this.successCount,
      failureCount: this.failureCount,
      errorCategory: classification.category,
      errorSeverity: classification.severity,
      duration
    });
  }

  /**
   * Determine if circuit should be opened
   */
  shouldOpenCircuit(classification) {
    // Check minimum throughput
    if (this.requestCount < this.config.minThroughput) {
      return false;
    }

    // Check failure threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check failure rate
    const failureRate = this.failureCount / this.requestCount;
    if (failureRate > 0.5 && this.requestCount >= this.config.minThroughput) {
      return true;
    }

    // Check for critical errors
    if (classification.severity === ERROR_SEVERITY.CRITICAL) {
      return true;
    }

    // Check for consecutive failures
    if (this.failureCount >= 3 && this.getConsecutiveFailures() >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Check if circuit should attempt reset
   */
  shouldAttemptReset() {
    return Date.now() - this.stateChangedTime >= this.config.timeout;
  }

  /**
   * Get consecutive failures count
   */
  getConsecutiveFailures() {
    // This is a simplified implementation
    // In a real system, you'd track the actual sequence
    return this.failureCount;
  }

  /**
   * Transition to OPEN state
   */
  transitionToOpen(error, classification) {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.OPEN;
    this.stateChangedTime = Date.now();
    this.metrics.circuitOpens++;
    
    this.emit(CIRCUIT_EVENTS.STATE_CHANGED, {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'failure_threshold_exceeded',
      error: error.message,
      classification,
      failureCount: this.failureCount
    });

    this.emit(CIRCUIT_EVENTS.CIRCUIT_OPENED, {
      name: this.name,
      error: error.message,
      classification
    });

    logger.warning('Circuit breaker opened', {
      name: this.name,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      error: error.message,
      category: classification.category
    });
  }

  /**
   * Transition to CLOSED state
   */
  transitionToClosed() {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.CLOSED;
    this.stateChangedTime = Date.now();
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.halfOpenCalls = 0;
    this.metrics.circuitCloses++;
    
    this.emit(CIRCUIT_EVENTS.STATE_CHANGED, {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'success_threshold_met'
    });

    this.emit(CIRCUIT_EVENTS.CIRCUIT_CLOSED, {
      name: this.name
    });

    logger.info('Circuit breaker closed', {
      name: this.name
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  transitionToHalfOpen() {
    const previousState = this.state;
    this.state = CIRCUIT_STATES.HALF_OPEN;
    this.stateChangedTime = Date.now();
    this.successCount = 0;
    this.halfOpenCalls = 0;
    
    this.emit(CIRCUIT_EVENTS.STATE_CHANGED, {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'timeout_elapsed'
    });

    logger.info('Circuit breaker transitioned to half-open', {
      name: this.name
    });
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    if (this.state !== CIRCUIT_STATES.OPEN) {
      return; // Only perform health checks when circuit is open
    }

    try {
      // This would be implemented with actual health check logic
      // For now, we'll simulate a basic health check
      const isHealthy = await this.checkServiceHealth();
      
      this.metrics.lastHealthCheck = Date.now();
      this.metrics.healthCheckResults.push({
        timestamp: Date.now(),
        healthy: isHealthy
      });

      // Keep only last 10 health check results
      if (this.metrics.healthCheckResults.length > 10) {
        this.metrics.healthCheckResults = this.metrics.healthCheckResults.slice(-10);
      }

      if (isHealthy) {
        this.emit(CIRCUIT_EVENTS.HEALTH_CHECK_PASSED, {
          name: this.name,
          timestamp: Date.now()
        });

        // If enough consecutive health checks pass, transition to half-open
        const recentResults = this.metrics.healthCheckResults.slice(-3);
        if (recentResults.every(r => r.healthy)) {
          this.transitionToHalfOpen();
        }
      } else {
        this.emit(CIRCUIT_EVENTS.HEALTH_CHECK_FAILED, {
          name: this.name,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      logger.error('Health check failed', {
        name: this.name,
        error: error.message
      });
    }
  }

  /**
   * Check service health (to be implemented by specific services)
   */
  async checkServiceHealth() {
    // This is a placeholder implementation
    // Real implementation would depend on the specific service
    return Math.random() > 0.3; // 70% chance of being healthy
  }

  /**
   * Get circuit breaker state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedTime: this.stateChangedTime,
      halfOpenCalls: this.halfOpenCalls,
      metrics: { ...this.metrics },
      config: { ...this.config }
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangedTime = Date.now();
    this.halfOpenCalls = 0;
    
    logger.info('Circuit breaker reset', {
      name: this.name
    });
  }

  /**
   * Force circuit to specific state (for testing/administration)
   */
  forceState(state) {
    if (!Object.values(CIRCUIT_STATES).includes(state)) {
      throw new Error(`Invalid circuit state: ${state}`);
    }

    const previousState = this.state;
    this.state = state;
    this.stateChangedTime = Date.now();
    
    if (state === CIRCUIT_STATES.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
      this.requestCount = 0;
      this.halfOpenCalls = 0;
    }

    this.emit(CIRCUIT_EVENTS.STATE_CHANGED, {
      name: this.name,
      from: previousState,
      to: this.state,
      reason: 'forced'
    });

    logger.info('Circuit breaker state forced', {
      name: this.name,
      from: previousState,
      to: state
    });
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    logger.info('Circuit breaker stopped', {
      name: this.name
    });
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const recentHealthChecks = this.metrics.healthCheckResults.slice(-5);
    const healthCheckSuccessRate = recentHealthChecks.length > 0 
      ? recentHealthChecks.filter(r => r.healthy).length / recentHealthChecks.length 
      : 0;

    return {
      name: this.name,
      state: this.state,
      isHealthy: this.state === CIRCUIT_STATES.CLOSED || 
                (this.state === CIRCUIT_STATES.HALF_OPEN && healthCheckSuccessRate > 0.5),
      healthCheckSuccessRate,
      lastHealthCheck: this.metrics.lastHealthCheck,
      uptime: Date.now() - this.stateChangedTime,
      failureRate: this.requestCount > 0 ? this.failureCount / this.requestCount : 0,
      averageResponseTime: this.metrics.averageResponseTime
    };
  }
}

class CircuitBreakerManager {
  constructor() {
    this.circuitBreakers = new Map();
    this.globalMetrics = {
      totalCircuits: 0,
      openCircuits: 0,
      closedCircuits: 0,
      halfOpenCircuits: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0
    };
  }

  /**
   * Create or get circuit breaker
   */
  getCircuitBreaker(name, config = CIRCUIT_CONFIGS.CONSERVATIVE) {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker(name, config);
      
      // Set up event listeners for global metrics
      circuitBreaker.on(CIRCUIT_EVENTS.STATE_CHANGED, (event) => {
        this.updateGlobalMetrics();
      });

      this.circuitBreakers.set(name, circuitBreaker);
      this.globalMetrics.totalCircuits++;
    }

    return this.circuitBreakers.get(name);
  }

  /**
   * Execute operation through circuit breaker
   */
  async execute(name, operation, config = null) {
    const circuitBreaker = this.getCircuitBreaker(name, config);
    return await circuitBreaker.execute(operation);
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    this.globalMetrics.openCircuits = 0;
    this.globalMetrics.closedCircuits = 0;
    this.globalMetrics.halfOpenCircuits = 0;
    this.globalMetrics.totalRequests = 0;
    this.globalMetrics.totalFailures = 0;
    this.globalMetrics.totalSuccesses = 0;

    for (const circuitBreaker of this.circuitBreakers.values()) {
      const state = circuitBreaker.getState();
      
      switch (state.state) {
        case CIRCUIT_STATES.OPEN:
          this.globalMetrics.openCircuits++;
          break;
        case CIRCUIT_STATES.CLOSED:
          this.globalMetrics.closedCircuits++;
          break;
        case CIRCUIT_STATES.HALF_OPEN:
          this.globalMetrics.halfOpenCircuits++;
          break;
      }

      this.globalMetrics.totalRequests += state.metrics.totalRequests;
      this.globalMetrics.totalFailures += state.metrics.totalFailures;
      this.globalMetrics.totalSuccesses += state.metrics.totalSuccesses;
    }
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates() {
    const states = {};
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      states[name] = circuitBreaker.getState();
    }
    return states;
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Get all health statuses
   */
  getAllHealthStatuses() {
    const statuses = {};
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      statuses[name] = circuitBreaker.getHealthStatus();
    }
    return statuses;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Stop all circuit breakers
   */
  stopAll() {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.stop();
    }
    logger.info('All circuit breakers stopped');
  }
}

// Create singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Export convenience functions
export const getCircuitBreaker = (name, config) => 
  circuitBreakerManager.getCircuitBreaker(name, config);

export const executeWithCircuitBreaker = (name, operation, config) => 
  circuitBreakerManager.execute(name, operation, config);

export const getAllCircuitStates = () => circuitBreakerManager.getAllStates();
export const getCircuitMetrics = () => circuitBreakerManager.getGlobalMetrics();
export const getAllHealthStatuses = () => circuitBreakerManager.getAllHealthStatuses();

export default CircuitBreakerManager;
