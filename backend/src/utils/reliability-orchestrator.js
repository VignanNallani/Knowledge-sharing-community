import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';
import { EventEmitter } from 'events';

// Import all reliability systems
import { retryEngine, RETRY_POLICIES } from './retry-engine.js';
import { backoffEngine, BACKOFF_STRATEGIES, JITTER_STRATEGIES } from './backoff-engine.js';
import { circuitBreakerManager, CIRCUIT_CONFIGS } from './circuit-breaker.js';
import { timeoutManager, TIMEOUT_CONFIGS, SLA_CONFIGS } from './timeout-manager.js';
import { bulkheadManager, BULKHEAD_TYPES, BULKHEAD_CONFIGS } from './bulkhead-manager.js';
import { loadShedderManager, REQUEST_PRIORITIES, LOAD_SHEDDING_CONFIGS } from './load-shedder.js';
import { fallbackManagerCollection, FALLBACK_CONFIGS } from './fallback-manager.js';

const logger = createLogger('ReliabilityOrchestrator');

/**
 * Reliability Orchestrator - Production-Grade Reliability Coordination
 * 
 * Provides unified interface for all reliability systems with:
 * - Coordinated reliability patterns
 * - Intelligent system selection
 * - Unified monitoring and observability
 * - Adaptive reliability strategies
 * - System-wide health management
 */

// Reliability levels
export const RELIABILITY_LEVELS = {
  CRITICAL: 'critical',    // Maximum reliability for critical systems
  HIGH: 'high',            // High reliability for important systems
  STANDARD: 'standard',    // Standard reliability for normal systems
  BASIC: 'basic',          // Basic reliability for non-critical systems
  MINIMAL: 'minimal'       // Minimal reliability for background systems
};

// Orchestration strategies
export const ORCHESTRATION_STRATEGIES = {
  // Apply all reliability systems
  COMPREHENSIVE: 'comprehensive',
  
  // Apply only essential reliability systems
  ESSENTIAL: 'essential',
  
  // Apply reliability systems based on system load
  LOAD_ADAPTIVE: 'load_adaptive',
  
  // Apply reliability systems based on error patterns
  ERROR_ADAPTIVE: 'error_adaptive',
  
  // Apply reliability systems based on SLA requirements
  SLA_DRIVEN: 'sla_driven'
};

// Pre-configured reliability profiles
export const RELIABILITY_PROFILES = {
  // Critical systems - maximum reliability
  [RELIABILITY_LEVELS.CRITICAL]: {
    strategy: ORCHESTRATION_STRATEGIES.COMPREHENSIVE,
    retryPolicy: RETRY_POLICIES.CONSERVATIVE,
    circuitConfig: CIRCUIT_CONFIGS.CONSERVATIVE,
    timeoutConfig: TIMEOUT_CONFIGS.CONSERVATIVE,
    bulkheadConfig: BULKHEAD_CONFIGS.CONSERVATIVE,
    loadShedderConfig: LOAD_SHEDDING_CONFIGS.CONSERVATIVE,
    fallbackConfig: FALLBACK_CONFIGS.CONSERVATIVE,
    sla: SLA_CONFIGS.REAL_TIME,
    priority: REQUEST_PRIORITIES.CRITICAL,
    backoffStrategy: BACKOFF_STRATEGIES.EXPONENTIAL,
    jitterStrategy: JITTER_STRATEGIES.EQUAL
  },

  // High importance systems
  [RELIABILITY_LEVELS.HIGH]: {
    strategy: ORCHESTRATION_STRATEGIES.ESSENTIAL,
    retryPolicy: RETRY_POLICIES.CONSERVATIVE,
    circuitConfig: CIRCUIT_CONFIGS.CONSERVATIVE,
    timeoutConfig: TIMEOUT_CONFIGS.CONSERVATIVE,
    bulkheadConfig: BULKHEAD_CONFIGS.CONSERVATIVE,
    loadShedderConfig: LOAD_SHEDDING_CONFIGS.CONSERVATIVE,
    fallbackConfig: FALLBACK_CONFIGS.CONSERVATIVE,
    sla: SLA_CONFIGS.INTERACTIVE,
    priority: REQUEST_PRIORITIES.HIGH,
    backoffStrategy: BACKOFF_STRATEGIES.EXPONENTIAL,
    jitterStrategy: JITTER_STRATEGIES.EQUAL
  },

  // Standard systems
  [RELIABILITY_LEVELS.STANDARD]: {
    strategy: ORCHESTRATION_STRATEGIES.ESSENTIAL,
    retryPolicy: RETRY_POLICIES.AGGRESSIVE,
    circuitConfig: CIRCUIT_CONFIGS.AGGRESSIVE,
    timeoutConfig: TIMEOUT_CONFIGS.AGGRESSIVE,
    bulkheadConfig: BULKHEAD_CONFIGS.AGGRESSIVE,
    loadShedderConfig: LOAD_SHEDDING_CONFIGS.AGGRESSIVE,
    fallbackConfig: FALLBACK_CONFIGS.AGGRESSIVE,
    sla: SLA_CONFIGS.STANDARD,
    priority: REQUEST_PRIORITIES.MEDIUM,
    backoffStrategy: BACKOFF_STRATEGIES.EXPONENTIAL,
    jitterStrategy: JITTER_STRATEGIES.FULL
  },

  // Basic systems
  [RELIABILITY_LEVELS.BASIC]: {
    strategy: ORCHESTRATION_STRATEGIES.ESSENTIAL,
    retryPolicy: RETRY_POLICIES.AGGRESSIVE,
    circuitConfig: CIRCUIT_CONFIGS.AGGRESSIVE,
    timeoutConfig: TIMEOUT_CONFIGS.AGGRESSIVE,
    bulkheadConfig: BULKHEAD_CONFIGS.BACKGROUND,
    loadShedderConfig: LOAD_SHEDDING_CONFIGS.BACKGROUND,
    fallbackConfig: FALLBACK_CONFIGS.AGGRESSIVE,
    sla: SLA_CONFIGS.BACKGROUND,
    priority: REQUEST_PRIORITIES.LOW,
    backoffStrategy: BACKOFF_STRATEGIES.LINEAR,
    jitterStrategy: JITTER_STRATEGIES.FULL
  },

  // Minimal systems
  [RELIABILITY_LEVELS.MINIMAL]: {
    strategy: ORCHESTRATION_STRATEGIES.ESSENTIAL,
    retryPolicy: RETRY_POLICIES.BACKGROUND,
    circuitConfig: CIRCUIT_CONFIGS.BACKGROUND,
    timeoutConfig: TIMEOUT_CONFIGS.BACKGROUND,
    bulkheadConfig: BULKHEAD_CONFIGS.BACKGROUND,
    loadShedderConfig: LOAD_SHEDDING_CONFIGS.BACKGROUND,
    fallbackConfig: FALLBACK_CONFIGS.AGGRESSIVE,
    sla: SLA_CONFIGS.BACKGROUND,
    priority: REQUEST_PRIORITIES.BACKGROUND,
    backoffStrategy: BACKOFF_STRATEGIES.FIXED,
    jitterStrategy: JITTER_STRATEGIES.NONE
  }
};

class ReliabilityOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    this.systemMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      reliabilityActivations: {},
      systemHealth: 'healthy',
      lastHealthCheck: Date.now()
    };
    
    this.adaptiveStrategies = new Map();
    this.performanceHistory = [];
    this.monitoringTimer = null;
    
    this.initializeAdaptiveStrategies();
    this.startMonitoring();
  }

  /**
   * Initialize adaptive strategies
   */
  initializeAdaptiveStrategies() {
    // Default adaptive thresholds
    this.adaptiveStrategies.set('load_threshold', 0.8);
    this.adaptiveStrategies.set('error_rate_threshold', 0.1);
    this.adaptiveStrategies.set('response_time_threshold', 2000);
    this.adaptiveStrategies.set('consecutive_failures_threshold', 5);
  }

  /**
   * Execute operation with orchestrated reliability
   */
  async execute(operation, options = {}) {
    const {
      serviceName = 'default',
      reliabilityLevel = RELIABILITY_LEVELS.STANDARD,
      profile = null,
      context = {},
      customConfig = {}
    } = options;

    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    // Get reliability profile
    const reliabilityProfile = profile || RELIABILITY_PROFILES[reliabilityLevel];
    const mergedProfile = { ...reliabilityProfile, ...customConfig };
    
    const span = distributedTracing.startSpan('reliability_orchestration', {
      operationId,
      serviceName,
      reliabilityLevel,
      strategy: mergedProfile.strategy
    });

    try {
      this.systemMetrics.totalOperations++;
      
      // Determine which reliability systems to apply
      const systemsToApply = this.determineReliabilitySystems(mergedProfile, context);
      
      // Apply reliability systems in the correct order
      let wrappedOperation = operation;
      
      // 1. Apply timeout management (outermost)
      wrappedOperation = this.applyTimeoutManagement(wrappedOperation, serviceName, mergedProfile, context);
      
      // 2. Apply bulkhead isolation
      wrappedOperation = this.applyBulkheadIsolation(wrappedOperation, serviceName, mergedProfile, context);
      
      // 3. Apply load shedding
      wrappedOperation = this.applyLoadShedding(wrappedOperation, serviceName, mergedProfile, context);
      
      // 4. Apply circuit breaker
      wrappedOperation = this.applyCircuitBreaker(wrappedOperation, serviceName, mergedProfile, context);
      
      // 5. Apply retry with backoff
      wrappedOperation = this.applyRetryWithBackoff(wrappedOperation, serviceName, mergedProfile, context);
      
      // 6. Apply fallback management (innermost)
      wrappedOperation = this.applyFallbackManagement(wrappedOperation, serviceName, mergedProfile, context);
      
      // Execute the wrapped operation
      const result = await wrappedOperation();
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(serviceName, duration, systemsToApply);
      
      span.finish({
        success: true,
        duration,
        serviceName,
        reliabilityLevel,
        systemsApplied: systemsToApply
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(serviceName, duration, error);
      
      span.finish({
        success: false,
        duration,
        serviceName,
        reliabilityLevel,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Determine which reliability systems to apply
   */
  determineReliabilitySystems(profile, context) {
    const systems = [];
    
    switch (profile.strategy) {
      case ORCHESTRATION_STRATEGIES.COMPREHENSIVE:
        systems.push('timeout', 'bulkhead', 'loadShedding', 'circuitBreaker', 'retry', 'fallback');
        break;
      
      case ORCHESTRATION_STRATEGIES.ESSENTIAL:
        systems.push('timeout', 'circuitBreaker', 'retry', 'fallback');
        break;
      
      case ORCHESTRATION_STRATEGIES.LOAD_ADAPTIVE:
        const systemLoad = this.getCurrentSystemLoad();
        if (systemLoad > this.adaptiveStrategies.get('load_threshold')) {
          systems.push('timeout', 'bulkhead', 'loadShedding', 'circuitBreaker', 'retry', 'fallback');
        } else {
          systems.push('timeout', 'circuitBreaker', 'retry');
        }
        break;
      
      case ORCHESTRATION_STRATEGIES.ERROR_ADAPTIVE:
        const errorRate = this.getCurrentErrorRate();
        if (errorRate > this.adaptiveStrategies.get('error_rate_threshold')) {
          systems.push('timeout', 'bulkhead', 'loadShedding', 'circuitBreaker', 'retry', 'fallback');
        } else {
          systems.push('timeout', 'circuitBreaker', 'retry');
        }
        break;
      
      case ORCHESTRATION_STRATEGIES.SLA_DRIVEN:
        if (profile.sla === SLA_CONFIGS.REAL_TIME) {
          systems.push('timeout', 'bulkhead', 'circuitBreaker', 'retry', 'fallback');
        } else if (profile.sla === SLA_CONFIGS.INTERACTIVE) {
          systems.push('timeout', 'circuitBreaker', 'retry', 'fallback');
        } else {
          systems.push('timeout', 'circuitBreaker', 'retry');
        }
        break;
      
      default:
        systems.push('timeout', 'circuitBreaker', 'retry');
    }
    
    return systems;
  }

  /**
   * Apply timeout management
   */
  applyTimeoutManagement(operation, serviceName, profile, context) {
    return async () => {
      return await timeoutManager.executeWithTimeout(operation, {
        layer: 'total_request',
        config: profile.timeoutConfig,
        service: serviceName,
        sla: profile.sla,
        context
      });
    };
  }

  /**
   * Apply bulkhead isolation
   */
  applyBulkheadIsolation(operation, serviceName, profile, context) {
    return async () => {
      return await bulkheadManager.execute(
        `${serviceName}_bulkhead`,
        BULKHEAD_TYPES.THREAD_POOL,
        operation,
        profile.bulkheadConfig
      );
    };
  }

  /**
   * Apply load shedding
   */
  applyLoadShedding(operation, serviceName, profile, context) {
    return async () => {
      return await loadShedderManager.execute(
        `${serviceName}_loadshedder`,
        operation,
        profile.priority,
        profile.loadShedderConfig
      );
    };
  }

  /**
   * Apply circuit breaker
   */
  applyCircuitBreaker(operation, serviceName, profile, context) {
    return async () => {
      return await circuitBreakerManager.execute(
        `${serviceName}_circuit`,
        operation,
        profile.circuitConfig
      );
    };
  }

  /**
   * Apply retry with backoff
   */
  applyRetryWithBackoff(operation, serviceName, profile, context) {
    return async () => {
      return await retryEngine.executeWithRetry(operation, {
        policy: profile.retryPolicy,
        service: serviceName,
        context,
        onRetry: async (error, attempt, delay) => {
          // Update backoff engine with failure information
          backoffEngine.recordFailure(serviceName, error, context);
        }
      });
    };
  }

  /**
   * Apply fallback management
   */
  applyFallbackManagement(operation, serviceName, profile, context) {
    return async () => {
      return await fallbackManagerCollection.execute(
        `${serviceName}_fallback`,
        operation,
        {
          fallbackKey: `${serviceName}_fallback`,
          context,
          priority: profile.priority
        }
      );
    };
  }

  /**
   * Get current system load (placeholder)
   */
  getCurrentSystemLoad() {
    // This would be implemented with actual system monitoring
    return Math.random(); // Placeholder
  }

  /**
   * Get current error rate
   */
  getCurrentErrorRate() {
    const totalOps = this.systemMetrics.totalOperations;
    const failedOps = this.systemMetrics.failedOperations;
    return totalOps > 0 ? failedOps / totalOps : 0;
  }

  /**
   * Record successful operation
   */
  recordSuccess(serviceName, duration, systemsApplied) {
    this.systemMetrics.successfulOperations++;
    
    // Track reliability system activations
    for (const system of systemsApplied) {
      this.systemMetrics.reliabilityActivations[system] = 
        (this.systemMetrics.reliabilityActivations[system] || 0) + 1;
    }
    
    // Record performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      serviceName,
      duration,
      success: true,
      systemsApplied
    });
    
    // Keep only last 1000 entries
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
    
    logger.debug('Reliability orchestrator operation completed', {
      serviceName,
      duration,
      systemsApplied
    });
  }

  /**
   * Record failed operation
   */
  recordFailure(serviceName, duration, error) {
    this.systemMetrics.failedOperations++;
    
    // Record performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      serviceName,
      duration,
      success: false,
      error: error.message
    });
    
    // Keep only last 1000 entries
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
    
    logger.debug('Reliability orchestrator operation failed', {
      serviceName,
      duration,
      error: error.message
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
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform system health check
   */
  performHealthCheck() {
    const errorRate = this.getCurrentErrorRate();
    const recentOperations = this.performanceHistory.slice(-100); // Last 100 operations
    const recentFailures = recentOperations.filter(op => !op.success).length;
    const recentFailureRate = recentOperations.length > 0 ? recentFailures / recentOperations.length : 0;
    
    let newHealth = 'healthy';
    
    if (recentFailureRate > 0.2) {
      newHealth = 'critical';
    } else if (recentFailureRate > 0.1) {
      newHealth = 'degraded';
    } else if (recentFailureRate > 0.05) {
      newHealth = 'warning';
    }
    
    if (newHealth !== this.systemMetrics.systemHealth) {
      const previousHealth = this.systemMetrics.systemHealth;
      this.systemMetrics.systemHealth = newHealth;
      this.systemMetrics.lastHealthCheck = Date.now();
      
      this.emit('systemHealthChanged', {
        from: previousHealth,
        to: newHealth,
        errorRate,
        recentFailureRate
      });
      
      logger.info('Reliability orchestrator system health changed', {
        from: previousHealth,
        to: newHealth,
        errorRate,
        recentFailureRate
      });
    }
    
    // Emit monitoring event
    this.emit('monitoring', {
      systemHealth: this.systemMetrics.systemHealth,
      totalOperations: this.systemMetrics.totalOperations,
      errorRate,
      recentFailureRate,
      metrics: this.getMetrics()
    });
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      systemMetrics: { ...this.systemMetrics },
      reliabilitySystemMetrics: {
        retry: retryEngine.getRetryStats(),
        backoff: backoffEngine.getBackoffStats(),
        circuitBreaker: circuitBreakerManager.getGlobalMetrics(),
        timeout: timeoutManager.getTimeoutStats(),
        bulkhead: bulkheadManager.getGlobalMetrics(),
        loadShedder: loadShedderManager.getGlobalMetrics(),
        fallback: fallbackManagerCollection.getGlobalMetrics()
      },
      performanceHistory: this.performanceHistory.slice(-100), // Last 100 operations
      adaptiveStrategies: Object.fromEntries(this.adaptiveStrategies)
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    return {
      health: this.systemMetrics.systemHealth,
      lastHealthCheck: this.systemMetrics.lastHealthCheck,
      totalOperations: this.systemMetrics.totalOperations,
      successRate: this.systemMetrics.totalOperations > 0 
        ? this.systemMetrics.successfulOperations / this.systemMetrics.totalOperations 
        : 0,
      errorRate: this.getCurrentErrorRate(),
      reliabilityActivations: this.systemMetrics.reliabilityActivations
    };
  }

  /**
   * Update adaptive strategy
   */
  updateAdaptiveStrategy(strategy, value) {
    this.adaptiveStrategies.set(strategy, value);
    logger.info('Adaptive strategy updated', {
      strategy,
      value
    });
  }

  /**
   * Get reliability recommendations
   */
  getReliabilityRecommendations(serviceName) {
    const serviceHistory = this.performanceHistory.filter(op => op.serviceName === serviceName);
    if (serviceHistory.length < 10) {
      return null; // Not enough data
    }
    
    const recentHistory = serviceHistory.slice(-50);
    const failureRate = recentHistory.filter(op => !op.success).length / recentHistory.length;
    const averageDuration = recentHistory.reduce((sum, op) => sum + op.duration, 0) / recentHistory.length;
    
    const recommendations = {
      currentPerformance: {
        failureRate,
        averageDuration,
        totalOperations: recentHistory.length
      },
      suggestedReliabilityLevel: RELIABILITY_LEVELS.STANDARD,
      suggestedAdjustments: []
    };
    
    // Suggest reliability level based on performance
    if (failureRate > 0.15) {
      recommendations.suggestedReliabilityLevel = RELIABILITY_LEVELS.CRITICAL;
      recommendations.suggestedAdjustments.push('Increase reliability due to high failure rate');
    } else if (failureRate > 0.05) {
      recommendations.suggestedReliabilityLevel = RELIABILITY_LEVELS.HIGH;
      recommendations.suggestedAdjustments.push('Consider higher reliability level');
    } else if (failureRate < 0.01 && averageDuration < 1000) {
      recommendations.suggestedReliabilityLevel = RELIABILITY_LEVELS.BASIC;
      recommendations.suggestedAdjustments.push('Performance is good, can use basic reliability');
    }
    
    // Suggest specific adjustments
    if (averageDuration > 5000) {
      recommendations.suggestedAdjustments.push('Consider increasing timeout values');
    }
    
    if (failureRate > 0.1) {
      recommendations.suggestedAdjustments.push('Consider enabling circuit breaker');
      recommendations.suggestedAdjustments.push('Consider implementing fallback mechanisms');
    }
    
    return recommendations;
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.systemMetrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      reliabilityActivations: {},
      systemHealth: 'healthy',
      lastHealthCheck: Date.now()
    };
    
    this.performanceHistory = [];
    
    // Reset all reliability system metrics
    retryEngine.resetStats();
    backoffEngine.resetStats();
    circuitBreakerManager.resetAll();
    timeoutManager.resetStats();
    bulkheadManager.resetAll();
    loadShedderManager.resetAll();
    fallbackManagerCollection.resetAll();
    
    logger.info('Reliability orchestrator metrics reset');
  }

  /**
   * Stop orchestrator
   */
  stop() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    // Stop all reliability systems
    circuitBreakerManager.stopAll();
    bulkheadManager.stopAll();
    loadShedderManager.stopAll();
    fallbackManagerCollection.stopAll();
    
    logger.info('Reliability orchestrator stopped');
  }

  /**
   * Generate operation ID
   */
  generateOperationId() {
    return `reliability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const reliabilityOrchestrator = new ReliabilityOrchestrator();

// Export convenience functions
export const executeWithReliability = (operation, options) => 
  reliabilityOrchestrator.execute(operation, options);

export const getReliabilityMetrics = () => reliabilityOrchestrator.getMetrics();
export const getSystemHealth = () => reliabilityOrchestrator.getSystemHealth();
export const getReliabilityRecommendations = (serviceName) => 
  reliabilityOrchestrator.getReliabilityRecommendations(serviceName);

export default ReliabilityOrchestrator;
