import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';
import { EventEmitter } from 'events';

const logger = createLogger('FallbackManager');

/**
 * Fallback Manager - Production-Grade Fallback Systems
 * 
 * Provides intelligent fallback mechanisms with:
 * - Fallback handlers for different failure scenarios
 * - Cached fallbacks for performance
 * - Default behavior modes
 * - Reduced functionality modes
 * - Graceful degradation strategies
 */

// Fallback types
export const FALLBACK_TYPES = {
  FUNCTION: 'function',           // Function-based fallback
  CACHED_VALUE: 'cached_value',   // Cached value fallback
  DEFAULT_VALUE: 'default_value', // Default value fallback
  REDUCED_FUNCTIONALITY: 'reduced_functionality', // Reduced functionality
  ALTERNATIVE_SERVICE: 'alternative_service',     // Alternative service
  CIRCUIT_FALLBACK: 'circuit_fallback',           // Circuit breaker fallback
  GRACEFUL_DEGRADATION: 'graceful_degradation'    // Graceful degradation
};

// Fallback strategies
export const FALLBACK_STRATEGIES = {
  // Try fallback immediately on failure
  IMMEDIATE: 'immediate',
  
  // Try fallback after retries are exhausted
  AFTER_RETRIES: 'after_retries',
  
  // Try fallback only for specific errors
  CONDITIONAL: 'conditional',
  
  // Try fallback based on performance degradation
  PERFORMANCE_BASED: 'performance_based',
  
  // Adaptive combination of strategies
  ADAPTIVE: 'adaptive'
};

// Fallback modes
export const FALLBACK_MODES = {
  // Full functionality - no fallback
  FULL: 'full',
  
  // Reduced functionality with fallbacks
  REDUCED: 'reduced',
  
  // Minimal functionality - essential operations only
  MINIMAL: 'minimal',
  
  // Safe mode - read-only operations
  SAFE: 'safe',
  
  // Emergency mode - critical operations only
  EMERGENCY: 'emergency'
};

// Default fallback configurations
export const FALLBACK_CONFIGS = {
  // Conservative configuration for critical services
  CONSERVATIVE: {
    strategy: FALLBACK_STRATEGIES.CONDITIONAL,
    mode: FALLBACK_MODES.REDUCED,
    cacheEnabled: true,
    cacheTTL: 300000,              // 5 minutes
    maxFallbackAttempts: 3,
    fallbackTimeout: 5000,         // 5 seconds
    performanceThreshold: 2000,    // 2 seconds
    errorThreshold: 0.1,           // 10% error rate
    monitoringInterval: 10000,     // 10 seconds
    adaptiveThresholds: {
      responseTimeMultiplier: 2.0,
      errorRateMultiplier: 1.5,
      consecutiveFailuresThreshold: 3
    }
  },

  // Aggressive configuration for high-throughput services
  AGGRESSIVE: {
    strategy: FALLBACK_STRATEGIES.ADAPTIVE,
    mode: FALLBACK_MODES.FULL,
    cacheEnabled: true,
    cacheTTL: 60000,              // 1 minute
    maxFallbackAttempts: 5,
    fallbackTimeout: 2000,         // 2 seconds
    performanceThreshold: 1000,    // 1 second
    errorThreshold: 0.05,          // 5% error rate
    monitoringInterval: 5000,      // 5 seconds
    adaptiveThresholds: {
      responseTimeMultiplier: 1.5,
      errorRateMultiplier: 1.2,
      consecutiveFailuresThreshold: 5
    }
  },

  // Fast configuration for real-time services
  FAST: {
    strategy: FALLBACK_STRATEGIES.IMMEDIATE,
    mode: FALLBACK_MODES.REDUCED,
    cacheEnabled: true,
    cacheTTL: 30000,              // 30 seconds
    maxFallbackAttempts: 2,
    fallbackTimeout: 1000,         // 1 second
    performanceThreshold: 500,    // 500ms
    errorThreshold: 0.02,          // 2% error rate
    monitoringInterval: 2000,      // 2 seconds
    adaptiveThresholds: {
      responseTimeMultiplier: 1.2,
      errorRateMultiplier: 1.1,
      consecutiveFailuresThreshold: 2
    }
  }
};

class FallbackManager extends EventEmitter {
  constructor(name, config = FALLBACK_CONFIGS.CONSERVATIVE) {
    super();
    
    this.name = name;
    this.config = { ...config };
    this.currentMode = FALLBACK_MODES.FULL;
    this.fallbackHandlers = new Map();
    this.cachedFallbacks = new Map();
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      fallbackActivations: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      modeTransitions: []
    };
    this.performanceMetrics = {
      responseTimes: [],
      errors: [],
      consecutiveFailures: 0
    };
    this.monitoringTimer = null;
    
    this.startMonitoring();
  }

  /**
   * Execute operation with fallback support
   */
  async execute(operation, options = {}) {
    const {
      fallbackKey = null,
      fallbackHandler = null,
      context = {},
      priority = 'normal',
      timeout = null
    } = options;

    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    const span = distributedTracing.startSpan('fallback_execution', {
      fallbackManagerName: this.name,
      operationId,
      mode: this.currentMode,
      fallbackKey,
      priority
    });

    try {
      this.metrics.totalOperations++;
      
      // Check if we should use fallback based on current mode
      if (this.shouldUseFallbackMode(context)) {
        return await this.executeFallback(fallbackKey, fallbackHandler, context, operationId, span);
      }

      // Try primary operation
      const result = await this.executePrimary(operation, timeout, operationId, span);
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      
      // Cache successful result if enabled
      if (this.config.cacheEnabled && fallbackKey) {
        this.cacheFallbackResult(fallbackKey, result);
      }
      
      span.finish({
        success: true,
        duration,
        mode: this.currentMode,
        fallbackUsed: false
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure
      this.recordFailure(duration, error);
      
      // Try fallback if appropriate
      if (this.shouldUseFallback(error, context)) {
        try {
          const fallbackResult = await this.executeFallback(fallbackKey, fallbackHandler, context, operationId, span);
          
          span.finish({
            success: true,
            duration,
            mode: this.currentMode,
            fallbackUsed: true,
            primaryError: error.message
          });

          return fallbackResult;
        } catch (fallbackError) {
          // Fallback also failed
          this.metrics.fallbackFailures++;
          
          span.finish({
            success: false,
            duration,
            mode: this.currentMode,
            fallbackUsed: true,
            primaryError: error.message,
            fallbackError: fallbackError.message
          });

          throw fallbackError;
        }
      } else {
        // No fallback, re-throw original error
        span.finish({
          success: false,
          duration,
          mode: this.currentMode,
          fallbackUsed: false,
          primaryError: error.message
        });

        throw error;
      }
    }
  }

  /**
   * Execute primary operation
   */
  async executePrimary(operation, timeout, operationId, span) {
    if (!timeout) {
      return await operation();
    }

    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Execute fallback
   */
  async executeFallback(fallbackKey, fallbackHandler, context, operationId, span) {
    this.metrics.fallbackActivations++;
    
    // Try cached fallback first
    if (this.config.cacheEnabled && fallbackKey) {
      const cached = this.getCachedFallback(fallbackKey);
      if (cached !== null) {
        this.metrics.cacheHits++;
        logger.debug('Using cached fallback', {
          name: this.name,
          fallbackKey,
          operationId
        });
        return cached;
      }
      this.metrics.cacheMisses++;
    }

    // Try registered fallback handler
    if (fallbackKey && this.fallbackHandlers.has(fallbackKey)) {
      const handler = this.fallbackHandlers.get(fallbackKey);
      try {
        const result = await this.executeWithTimeout(
          () => handler(context),
          this.config.fallbackTimeout
        );
        
        this.metrics.fallbackSuccesses++;
        
        // Cache successful fallback result
        if (this.config.cacheEnabled && fallbackKey) {
          this.cacheFallbackResult(fallbackKey, result);
        }
        
        return result;
      } catch (error) {
        logger.warning('Fallback handler failed', {
          name: this.name,
          fallbackKey,
          error: error.message
        });
        throw error;
      }
    }

    // Try provided fallback handler
    if (fallbackHandler) {
      try {
        const result = await this.executeWithTimeout(
          () => fallbackHandler(context),
          this.config.fallbackTimeout
        );
        
        this.metrics.fallbackSuccesses++;
        return result;
      } catch (error) {
        logger.warning('Provided fallback handler failed', {
          name: this.name,
          error: error.message
        });
        throw error;
      }
    }

    // No fallback available
    throw new Error(`No fallback available for key: ${fallbackKey}`);
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(operation, timeout) {
    if (!timeout) {
      return await operation();
    }

    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Fallback timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Check if fallback should be used based on current mode
   */
  shouldUseFallbackMode(context) {
    switch (this.currentMode) {
      case FALLBACK_MODES.FULL:
        return false;
      
      case FALLBACK_MODES.REDUCED:
        return context.priority === 'low' || context.priority === 'background';
      
      case FALLBACK_MODES.MINIMAL:
        return context.priority !== 'critical';
      
      case FALLBACK_MODES.SAFE:
        return context.operation && context.operation.includes('write');
      
      case FALLBACK_MODES.EMERGENCY:
        return context.priority !== 'critical' || !context.operation || !context.operation.includes('health');
      
      default:
        return false;
    }
  }

  /**
   * Check if fallback should be used based on error and context
   */
  shouldUseFallback(error, context) {
    // Classify error
    const classification = errorIntelligence.classifyError(error, context);
    
    switch (this.config.strategy) {
      case FALLBACK_STRATEGIES.IMMEDIATE:
        return true;
      
      case FALLBACK_STRATEGIES.AFTER_RETRIES:
        return context.retryAttempt >= (context.maxRetries || 3);
      
      case FALLBACK_STRATEGIES.CONDITIONAL:
        return this.shouldUseFallbackConditional(classification, context);
      
      case FALLBACK_STRATEGIES.PERFORMANCE_BASED:
        return this.shouldUseFallbackPerformanceBased(classification, context);
      
      case FALLBACK_STRATEGIES.ADAPTIVE:
        return this.shouldUseFallbackAdaptive(classification, context);
      
      default:
        return false;
    }
  }

  /**
   * Conditional fallback decision
   */
  shouldUseFallbackConditional(classification, context) {
    // Use fallback for specific error categories
    const fallbackCategories = [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.EXTERNAL,
      ERROR_CATEGORIES.DATABASE
    ];
    
    return fallbackCategories.includes(classification.category) ||
           classification.severity === ERROR_SEVERITY.HIGH ||
           classification.severity === ERROR_SEVERITY.CRITICAL;
  }

  /**
   * Performance-based fallback decision
   */
  shouldUseFallbackPerformanceBased(classification, context) {
    // Check response time
    if (this.performanceMetrics.averageResponseTime > this.config.performanceThreshold) {
      return true;
    }
    
    // Check error rate
    if (this.metrics.errorRate > this.config.errorThreshold) {
      return true;
    }
    
    // Check consecutive failures
    if (this.performanceMetrics.consecutiveFailures >= this.config.adaptiveThresholds.consecutiveFailuresThreshold) {
      return true;
    }
    
    return false;
  }

  /**
   * Adaptive fallback decision
   */
  shouldUseFallbackAdaptive(classification, context) {
    // Combine multiple factors
    const conditionalDecision = this.shouldUseFallbackConditional(classification, context);
    const performanceDecision = this.shouldUseFallbackPerformanceBased(classification, context);
    
    // Weight the decisions
    const weights = {
      conditional: 0.6,
      performance: 0.4
    };
    
    const weightedScore = 
      (conditionalDecision ? weights.conditional : 0) +
      (performanceDecision ? weights.performance : 0);
    
    return weightedScore >= 0.5;
  }

  /**
   * Register fallback handler
   */
  registerFallback(key, handler) {
    this.fallbackHandlers.set(key, handler);
    logger.info('Fallback handler registered', {
      name: this.name,
      key
    });
  }

  /**
   * Unregister fallback handler
   */
  unregisterFallback(key) {
    this.fallbackHandlers.delete(key);
    logger.info('Fallback handler unregistered', {
      name: this.name,
      key
    });
  }

  /**
   * Cache fallback result
   */
  cacheFallbackResult(key, result) {
    const cacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL
    };
    
    this.cachedFallbacks.set(key, cacheEntry);
    
    logger.debug('Fallback result cached', {
      name: this.name,
      key,
      ttl: this.config.cacheTTL
    });
  }

  /**
   * Get cached fallback
   */
  getCachedFallback(key) {
    const cached = this.cachedFallbacks.get(key);
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cachedFallbacks.delete(key);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Clear cached fallbacks
   */
  clearCachedFallbacks() {
    this.cachedFallbacks.clear();
    logger.info('Cached fallbacks cleared', {
      name: this.name
    });
  }

  /**
   * Record successful operation
   */
  recordSuccess(duration) {
    this.metrics.successfulOperations++;
    this.performanceMetrics.responseTimes.push(duration);
    this.performanceMetrics.consecutiveFailures = 0;
    
    // Keep only last 100 response times
    if (this.performanceMetrics.responseTimes.length > 100) {
      this.performanceMetrics.responseTimes = this.performanceMetrics.responseTimes.slice(-100);
    }
    
    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.successfulOperations - 1) + duration;
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.successfulOperations;
    
    // Update error rate
    this.updateErrorRate();
    
    logger.debug('Fallback manager operation completed', {
      name: this.name,
      duration,
      mode: this.currentMode
    });
  }

  /**
   * Record failed operation
   */
  recordFailure(duration, error) {
    this.performanceMetrics.errors.push({
      timestamp: Date.now(),
      duration,
      error: error.message,
      classification: errorIntelligence.classifyError(error)
    });
    
    this.performanceMetrics.consecutiveFailures++;
    
    // Keep only last 100 errors
    if (this.performanceMetrics.errors.length > 100) {
      this.performanceMetrics.errors = this.performanceMetrics.errors.slice(-100);
    }
    
    // Update error rate
    this.updateErrorRate();
    
    logger.debug('Fallback manager operation failed', {
      name: this.name,
      duration,
      error: error.message,
      consecutiveFailures: this.performanceMetrics.consecutiveFailures
    });
  }

  /**
   * Update error rate
   */
  updateErrorRate() {
    const totalOperations = this.metrics.successfulOperations + this.performanceMetrics.errors.length;
    this.metrics.errorRate = totalOperations > 0 ? this.performanceMetrics.errors.length / totalOperations : 0;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = setInterval(() => {
      this.performMonitoring();
    }, this.config.monitoringInterval);
  }

  /**
   * Perform monitoring and mode adaptation
   */
  performMonitoring() {
    // Calculate current performance metrics
    const averageResponseTime = this.calculateAverageResponseTime();
    const errorRate = this.metrics.errorRate;
    const consecutiveFailures = this.performanceMetrics.consecutiveFailures;
    
    // Determine if mode should change
    const newMode = this.calculateOptimalMode(averageResponseTime, errorRate, consecutiveFailures);
    
    if (newMode !== this.currentMode) {
      this.transitionMode(newMode);
    }
    
    // Clean up expired cache entries
    this.cleanupCache();
    
    // Emit monitoring event
    this.emit('monitoring', {
      name: this.name,
      currentMode: this.currentMode,
      averageResponseTime,
      errorRate,
      consecutiveFailures,
      metrics: this.getMetrics()
    });
    
    logger.debug('Fallback manager monitoring', {
      name: this.name,
      currentMode: this.currentMode,
      averageResponseTime,
      errorRate,
      consecutiveFailures
    });
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    if (this.performanceMetrics.responseTimes.length === 0) {
      return 0;
    }
    
    const sum = this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.performanceMetrics.responseTimes.length;
  }

  /**
   * Calculate optimal mode based on performance
   */
  calculateOptimalMode(averageResponseTime, errorRate, consecutiveFailures) {
    const thresholds = this.config.adaptiveThresholds;
    
    // Check for emergency conditions
    if (consecutiveFailures >= thresholds.consecutiveFailuresThreshold * 2 ||
        errorRate >= thresholds.errorRateMultiplier * 2) {
      return FALLBACK_MODES.EMERGENCY;
    }
    
    // Check for safe mode conditions
    if (consecutiveFailures >= thresholds.consecutiveFailuresThreshold ||
        errorRate >= thresholds.errorRateMultiplier ||
        averageResponseTime >= this.config.performanceThreshold * thresholds.responseTimeMultiplier) {
      return FALLBACK_MODES.SAFE;
    }
    
    // Check for minimal mode conditions
    if (errorRate >= this.config.errorThreshold * 1.5 ||
        averageResponseTime >= this.config.performanceThreshold * 1.5) {
      return FALLBACK_MODES.MINIMAL;
    }
    
    // Check for reduced mode conditions
    if (errorRate >= this.config.errorThreshold ||
        averageResponseTime >= this.config.performanceThreshold) {
      return FALLBACK_MODES.REDUCED;
    }
    
    // Default to full mode
    return FALLBACK_MODES.FULL;
  }

  /**
   * Transition to new mode
   */
  transitionMode(newMode) {
    const previousMode = this.currentMode;
    this.currentMode = newMode;
    
    // Record transition
    this.metrics.modeTransitions.push({
      timestamp: Date.now(),
      from: previousMode,
      to: newMode,
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.metrics.errorRate,
      consecutiveFailures: this.performanceMetrics.consecutiveFailures
    });
    
    // Keep only last 50 transitions
    if (this.metrics.modeTransitions.length > 50) {
      this.metrics.modeTransitions = this.metrics.modeTransitions.slice(-50);
    }
    
    this.emit('modeChanged', {
      name: this.name,
      from: previousMode,
      to: newMode
    });
    
    logger.info('Fallback manager mode changed', {
      name: this.name,
      from: previousMode,
      to: newMode
    });
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.cachedFallbacks) {
      if (now - cached.timestamp > cached.ttl) {
        this.cachedFallbacks.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Cleaned up expired cache entries', {
        name: this.name,
        cleaned
      });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      name: this.name,
      currentMode: this.currentMode,
      metrics: { ...this.metrics },
      performanceMetrics: {
        ...this.performanceMetrics,
        responseTimes: undefined, // Don't include raw response times
        errors: undefined // Don't include raw errors
      },
      config: { ...this.config }
    };
  }

  /**
   * Get fallback statistics
   */
  getFallbackStats() {
    const stats = {
      ...this.metrics,
      successRate: this.metrics.totalOperations > 0 ? this.metrics.successfulOperations / this.metrics.totalOperations : 0,
      fallbackActivationRate: this.metrics.totalOperations > 0 ? this.metrics.fallbackActivations / this.metrics.totalOperations : 0,
      fallbackSuccessRate: this.metrics.fallbackActivations > 0 ? this.metrics.fallbackSuccesses / this.metrics.fallbackActivations : 0,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) : 0,
      registeredHandlers: this.fallbackHandlers.size,
      cachedEntries: this.cachedFallbacks.size
    };
    
    return stats;
  }

  /**
   * Force mode (for testing/administration)
   */
  forceMode(mode) {
    if (!Object.values(FALLBACK_MODES).includes(mode)) {
      throw new Error(`Invalid fallback mode: ${mode}`);
    }
    
    this.transitionMode(mode);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      fallbackActivations: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      errorRate: 0,
      modeTransitions: []
    };
    
    this.performanceMetrics = {
      responseTimes: [],
      errors: [],
      consecutiveFailures: 0
    };
    
    logger.info('Fallback manager metrics reset', {
      name: this.name
    });
  }

  /**
   * Stop fallback manager
   */
  stop() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    logger.info('Fallback manager stopped', {
      name: this.name
    });
  }

  /**
   * Generate operation ID
   */
  generateOperationId() {
    return `fallback_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class FallbackManagerCollection {
  constructor() {
    this.fallbackManagers = new Map();
    this.globalMetrics = {
      totalManagers: 0,
      totalOperations: 0,
      totalFallbackActivations: 0,
      modeDistribution: {}
    };
  }

  /**
   * Create or get fallback manager
   */
  getFallbackManager(name, config = FALLBACK_CONFIGS.CONSERVATIVE) {
    if (!this.fallbackManagers.has(name)) {
      const fallbackManager = new FallbackManager(name, config);
      
      // Set up event listeners for global metrics
      fallbackManager.on('modeChanged', (event) => {
        this.updateGlobalMetrics();
      });

      this.fallbackManagers.set(name, fallbackManager);
      this.globalMetrics.totalManagers++;
    }

    return this.fallbackManagers.get(name);
  }

  /**
   * Execute operation through fallback manager
   */
  async execute(name, operation, options = {}) {
    const fallbackManager = this.getFallbackManager(name);
    return await fallbackManager.execute(operation, options);
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    this.globalMetrics.totalOperations = 0;
    this.globalMetrics.totalFallbackActivations = 0;
    this.globalMetrics.modeDistribution = {};
    
    for (const fallbackManager of this.fallbackManagers.values()) {
      const metrics = fallbackManager.getMetrics();
      
      this.globalMetrics.totalOperations += metrics.metrics.totalOperations;
      this.globalMetrics.totalFallbackActivations += metrics.metrics.fallbackActivations;
      
      // Track mode distribution
      const mode = metrics.currentMode;
      this.globalMetrics.modeDistribution[mode] = 
        (this.globalMetrics.modeDistribution[mode] || 0) + 1;
    }
  }

  /**
   * Get all fallback manager metrics
   */
  getAllMetrics() {
    const metrics = {};
    for (const [name, fallbackManager] of this.fallbackManagers) {
      metrics[name] = fallbackManager.getMetrics();
    }
    return metrics;
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Get all fallback statistics
   */
  getAllFallbackStats() {
    const stats = {};
    for (const [name, fallbackManager] of this.fallbackManagers) {
      stats[name] = fallbackManager.getFallbackStats();
    }
    return stats;
  }

  /**
   * Reset all fallback managers
   */
  resetAll() {
    for (const fallbackManager of this.fallbackManagers.values()) {
      fallbackManager.resetMetrics();
    }
    logger.info('All fallback managers reset');
  }

  /**
   * Stop all fallback managers
   */
  stopAll() {
    for (const fallbackManager of this.fallbackManagers.values()) {
      fallbackManager.stop();
    }
    logger.info('All fallback managers stopped');
  }
}

// Create singleton instance
export const fallbackManagerCollection = new FallbackManagerCollection();

// Export convenience functions
export const getFallbackManager = (name, config) => 
  fallbackManagerCollection.getFallbackManager(name, config);

export const executeWithFallback = (name, operation, options) => 
  fallbackManagerCollection.execute(name, operation, options);

export const getAllFallbackMetrics = () => fallbackManagerCollection.getAllMetrics();
export const getFallbackStats = () => fallbackManagerCollection.getGlobalMetrics();

export default FallbackManagerCollection;
