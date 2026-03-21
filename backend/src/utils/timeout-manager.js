import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';

const logger = createLogger('TimeoutManager');

/**
 * Timeout Manager - Production-Grade Timeout Management
 * 
 * Provides intelligent timeout handling with:
 * - Per-layer timeouts
 * - Adaptive timeouts based on performance
 * - SLA-aware timeouts
 * - Dependency-based timeouts
 * - Timeout propagation
 */

// Timeout layers
export const TIMEOUT_LAYERS = {
  NETWORK: 'network',           // Network layer timeouts
  DATABASE: 'database',         // Database operation timeouts
  CACHE: 'cache',              // Cache operation timeouts
  EXTERNAL_API: 'external_api', // External API call timeouts
  BUSINESS_LOGIC: 'business_logic', // Business logic timeouts
  TOTAL_REQUEST: 'total_request'   // Total request timeout
};

// Default timeout configurations (in milliseconds)
export const TIMEOUT_CONFIGS = {
  // Conservative timeouts for critical operations
  CONSERVATIVE: {
    [TIMEOUT_LAYERS.NETWORK]: 5000,        // 5 seconds
    [TIMEOUT_LAYERS.DATABASE]: 10000,      // 10 seconds
    [TIMEOUT_LAYERS.CACHE]: 2000,          // 2 seconds
    [TIMEOUT_LAYERS.EXTERNAL_API]: 15000,  // 15 seconds
    [TIMEOUT_LAYERS.BUSINESS_LOGIC]: 30000, // 30 seconds
    [TIMEOUT_LAYERS.TOTAL_REQUEST]: 60000   // 60 seconds
  },

  // Aggressive timeouts for performance-critical operations
  AGGRESSIVE: {
    [TIMEOUT_LAYERS.NETWORK]: 2000,        // 2 seconds
    [TIMEOUT_LAYERS.DATABASE]: 5000,        // 5 seconds
    [TIMEOUT_LAYERS.CACHE]: 500,           // 500ms
    [TIMEOUT_LAYERS.EXTERNAL_API]: 8000,   // 8 seconds
    [TIMEOUT_LAYERS.BUSINESS_LOGIC]: 10000, // 10 seconds
    [TIMEOUT_LAYERS.TOTAL_REQUEST]: 20000   // 20 seconds
  },

  // Fast timeouts for real-time operations
  FAST: {
    [TIMEOUT_LAYERS.NETWORK]: 1000,        // 1 second
    [TIMEOUT_LAYERS.DATABASE]: 2000,        // 2 seconds
    [TIMEOUT_LAYERS.CACHE]: 200,           // 200ms
    [TIMEOUT_LAYERS.EXTERNAL_API]: 3000,   // 3 seconds
    [TIMEOUT_LAYERS.BUSINESS_LOGIC]: 5000,  // 5 seconds
    [TIMEOUT_LAYERS.TOTAL_REQUEST]: 8000    // 8 seconds
  },

  // Background timeouts for async operations
  BACKGROUND: {
    [TIMEOUT_LAYERS.NETWORK]: 30000,       // 30 seconds
    [TIMEOUT_LAYERS.DATABASE]: 60000,       // 60 seconds
    [TIMEOUT_LAYERS.CACHE]: 10000,         // 10 seconds
    [TIMEOUT_LAYERS.EXTERNAL_API]: 120000, // 2 minutes
    [TIMEOUT_LAYERS.BUSINESS_LOGIC]: 300000, // 5 minutes
    [TIMEOUT_LAYERS.TOTAL_REQUEST]: 600000  // 10 minutes
  }
};

// SLA configurations
export const SLA_CONFIGS = {
  // Real-time SLA (99.9% uptime, <100ms response)
  REAL_TIME: {
    targetResponseTime: 100,
    acceptableResponseTime: 200,
    timeoutMultiplier: 2.0,
    priority: 'critical'
  },

  // Interactive SLA (99.5% uptime, <1s response)
  INTERACTIVE: {
    targetResponseTime: 1000,
    acceptableResponseTime: 2000,
    timeoutMultiplier: 1.5,
    priority: 'high'
  },

  // Standard SLA (99% uptime, <5s response)
  STANDARD: {
    targetResponseTime: 5000,
    acceptableResponseTime: 10000,
    timeoutMultiplier: 1.2,
    priority: 'medium'
  },

  // Background SLA (95% uptime, <30s response)
  BACKGROUND: {
    targetResponseTime: 30000,
    acceptableResponseTime: 60000,
    timeoutMultiplier: 1.1,
    priority: 'low'
  }
};

class TimeoutManager {
  constructor() {
    this.performanceMetrics = new Map(); // Track performance for adaptive timeouts
    this.slaMetrics = new Map(); // Track SLA compliance
    this.dependencyTimeouts = new Map(); // Dependency-specific timeouts
    this.timeoutStats = new Map(); // Timeout statistics
    this.adaptiveThresholds = new Map(); // Adaptive thresholds per service
    this.timeoutStack = new Map(); // Track timeout stack for nested operations
    this.initializeMetrics();
  }

  /**
   * Initialize performance metrics tracking
   */
  initializeMetrics() {
    // Default adaptive thresholds
    const defaultThresholds = {
      'database': {
        p95Target: 8000, // 95th percentile target
        p99Target: 12000, // 99th percentile target
        adaptationFactor: 1.2,
        minTimeout: 1000,
        maxTimeout: 60000
      },
      'external-api': {
        p95Target: 10000,
        p99Target: 15000,
        adaptationFactor: 1.3,
        minTimeout: 2000,
        maxTimeout: 120000
      },
      'cache': {
        p95Target: 500,
        p99Target: 1000,
        adaptationFactor: 1.1,
        minTimeout: 100,
        maxTimeout: 10000
      },
      'internal-service': {
        p95Target: 3000,
        p99Target: 5000,
        adaptationFactor: 1.15,
        minTimeout: 500,
        maxTimeout: 30000
      }
    };

    for (const [service, thresholds] of Object.entries(defaultThresholds)) {
      this.adaptiveThresholds.set(service, thresholds);
    }
  }

  /**
   * Execute operation with timeout management
   */
  async executeWithTimeout(operation, options = {}) {
    const {
      layer = TIMEOUT_LAYERS.TOTAL_REQUEST,
      config = TIMEOUT_CONFIGS.CONSERVATIVE,
      service = 'unknown',
      sla = null,
      context = {},
      parentTimeout = null,
      onTimeout = null
    } = options;

    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Calculate timeout
    let timeout = this.calculateTimeout(layer, config, service, sla, parentTimeout);

    // Create timeout stack entry
    this.timeoutStack.set(operationId, {
      layer,
      service,
      timeout,
      startTime,
      parentTimeout
    });

    // Create span for distributed tracing
    const span = distributedTracing.startSpan('timeout_execution', {
      operationId,
      layer,
      service,
      timeout,
      sla: sla?.name || 'none'
    });

    try {
      // Execute with timeout
      const result = await this.executeWithTimeoutPromise(operation, timeout, operationId);
      
      // Record success metrics
      const duration = Date.now() - startTime;
      this.recordSuccess(service, layer, duration, timeout);
      
      span.finish({
        success: true,
        duration,
        timeout,
        utilization: duration / timeout
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle timeout vs other errors
      if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
        this.recordTimeout(service, layer, timeout, duration);
        
        // Call timeout callback if provided
        if (onTimeout) {
          await onTimeout(error, { operationId, layer, service, timeout, duration });
        }

        span.finish({
          success: false,
          duration,
          timeout,
          timedOut: true,
          error: error.message
        });

        throw error;
      } else {
        // Record failure (not timeout)
        this.recordFailure(service, layer, duration, timeout, error);
        
        span.finish({
          success: false,
          duration,
          timeout,
          timedOut: false,
          error: error.message
        });

        throw error;
      }
    } finally {
      // Clean up timeout stack
      this.timeoutStack.delete(operationId);
    }
  }

  /**
   * Execute operation with timeout promise
   */
  async executeWithTimeoutPromise(operation, timeout, operationId) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => {
        const timer = setTimeout(() => {
          const error = new Error(`Operation timeout after ${timeout}ms`);
          error.name = 'TimeoutError';
          error.code = 'TIMEOUT';
          error.timeout = timeout;
          error.operationId = operationId;
          reject(error);
        }, timeout);

        // Ensure timer is cleaned up
        timer.unref && timer.unref();
      })
    ]);
  }

  /**
   * Calculate intelligent timeout
   */
  calculateTimeout(layer, config, service, sla, parentTimeout) {
    let timeout = config[layer] || TIMEOUT_CONFIGS.CONSERVATIVE[layer];

    // Apply adaptive adjustments
    timeout = this.applyAdaptiveTimeout(timeout, service, layer);

    // Apply SLA adjustments
    if (sla) {
      timeout = this.applySLATimeout(timeout, sla);
    }

    // Apply dependency-specific adjustments
    timeout = this.applyDependencyTimeout(timeout, service, layer);

    // Apply parent timeout constraint
    if (parentTimeout) {
      timeout = Math.min(timeout, parentTimeout * 0.8); // Leave 20% for parent
    }

    // Ensure minimum timeout
    const thresholds = this.adaptiveThresholds.get(service);
    if (thresholds) {
      timeout = Math.max(timeout, thresholds.minTimeout);
      timeout = Math.min(timeout, thresholds.maxTimeout);
    }

    return Math.floor(timeout);
  }

  /**
   * Apply adaptive timeout based on performance metrics
   */
  applyAdaptiveTimeout(baseTimeout, service, layer) {
    const metrics = this.performanceMetrics.get(service);
    if (!metrics || !metrics[layer]) {
      return baseTimeout;
    }

    const layerMetrics = metrics[layer];
    const thresholds = this.adaptiveThresholds.get(service);
    if (!thresholds) {
      return baseTimeout;
    }

    let adjustedTimeout = baseTimeout;

    // Adjust based on P95 response time
    if (layerMetrics.p95ResponseTime) {
      const targetMultiplier = thresholds.p95Target / layerMetrics.p95ResponseTime;
      if (targetMultiplier > 1.2) {
        // Performance is good, can reduce timeout
        adjustedTimeout *= 0.9;
      } else if (targetMultiplier < 0.8) {
        // Performance is poor, increase timeout
        adjustedTimeout *= thresholds.adaptationFactor;
      }
    }

    // Adjust based on P99 response time
    if (layerMetrics.p99ResponseTime) {
      const targetMultiplier = thresholds.p99Target / layerMetrics.p99ResponseTime;
      if (targetMultiplier < 0.7) {
        // P99 is significantly worse than target
        adjustedTimeout *= 1.5;
      }
    }

    // Adjust based on timeout rate
    if (layerMetrics.timeoutRate && layerMetrics.timeoutRate > 0.05) {
      // High timeout rate, increase timeout
      adjustedTimeout *= 1 + layerMetrics.timeoutRate * 2;
    }

    return Math.floor(adjustedTimeout);
  }

  /**
   * Apply SLA-based timeout adjustments
   */
  applySLATimeout(baseTimeout, sla) {
    const slaConfig = SLA_CONFIGS[sla];
    if (!slaConfig) {
      return baseTimeout;
    }

    let adjustedTimeout = baseTimeout;

    // Adjust based on SLA target response time
    if (slaConfig.targetResponseTime) {
      const slaMultiplier = slaConfig.targetResponseTime / baseTimeout;
      if (slaMultiplier < 1) {
        // SLA is more aggressive than current timeout
        adjustedTimeout = slaConfig.targetResponseTime * slaConfig.timeoutMultiplier;
      }
    }

    // Apply priority-based adjustments
    switch (slaConfig.priority) {
      case 'critical':
        adjustedTimeout *= 0.8; // More aggressive for critical
        break;
      case 'high':
        adjustedTimeout *= 0.9;
        break;
      case 'medium':
        adjustedTimeout *= 1.0;
        break;
      case 'low':
        adjustedTimeout *= 1.2; // More lenient for low priority
        break;
    }

    return Math.floor(adjustedTimeout);
  }

  /**
   * Apply dependency-specific timeout adjustments
   */
  applyDependencyTimeout(baseTimeout, service, layer) {
    const dependencyConfig = this.dependencyTimeouts.get(service);
    if (!dependencyConfig || !dependencyConfig[layer]) {
      return baseTimeout;
    }

    const config = dependencyConfig[layer];
    let adjustedTimeout = baseTimeout;

    // Apply dependency-specific multipliers
    if (config.multiplier) {
      adjustedTimeout *= config.multiplier;
    }

    // Apply dependency-specific offsets
    if (config.offset) {
      adjustedTimeout += config.offset;
    }

    // Apply dependency-specific maximums
    if (config.maxTimeout) {
      adjustedTimeout = Math.min(adjustedTimeout, config.maxTimeout);
    }

    // Apply dependency-specific minimums
    if (config.minTimeout) {
      adjustedTimeout = Math.max(adjustedTimeout, config.minTimeout);
    }

    return Math.floor(adjustedTimeout);
  }

  /**
   * Record successful operation
   */
  recordSuccess(service, layer, duration, timeout) {
    if (!this.performanceMetrics.has(service)) {
      this.performanceMetrics.set(service, {});
    }

    const serviceMetrics = this.performanceMetrics.get(service);
    if (!serviceMetrics[layer]) {
      serviceMetrics[layer] = {
        responseTimes: [],
        timeouts: 0,
        failures: 0,
        totalOperations: 0,
        p95ResponseTime: null,
        p99ResponseTime: null,
        averageResponseTime: null,
        timeoutRate: null
      };
    }

    const layerMetrics = serviceMetrics[layer];
    layerMetrics.responseTimes.push(duration);
    layerMetrics.totalOperations++;

    // Keep only last 1000 response times for percentile calculations
    if (layerMetrics.responseTimes.length > 1000) {
      layerMetrics.responseTimes = layerMetrics.responseTimes.slice(-1000);
    }

    // Update percentiles
    this.updatePercentiles(layerMetrics);

    // Update timeout statistics
    this.updateTimeoutStats(service, layer, duration, timeout, false);

    logger.debug('Timeout success recorded', {
      service,
      layer,
      duration,
      timeout,
      utilization: duration / timeout
    });
  }

  /**
   * Record timeout
   */
  recordTimeout(service, layer, timeout, duration) {
    if (!this.performanceMetrics.has(service)) {
      this.performanceMetrics.set(service, {});
    }

    const serviceMetrics = this.performanceMetrics.get(service);
    if (!serviceMetrics[layer]) {
      serviceMetrics[layer] = {
        responseTimes: [],
        timeouts: 0,
        failures: 0,
        totalOperations: 0,
        p95ResponseTime: null,
        p99ResponseTime: null,
        averageResponseTime: null,
        timeoutRate: null
      };
    }

    const layerMetrics = serviceMetrics[layer];
    layerMetrics.timeouts++;
    layerMetrics.totalOperations++;

    // Update timeout rate
    layerMetrics.timeoutRate = layerMetrics.timeouts / layerMetrics.totalOperations;

    // Update timeout statistics
    this.updateTimeoutStats(service, layer, duration, timeout, true);

    logger.warning('Timeout recorded', {
      service,
      layer,
      timeout,
      duration,
      timeoutRate: layerMetrics.timeoutRate
    });
  }

  /**
   * Record failure (not timeout)
   */
  recordFailure(service, layer, duration, timeout, error) {
    if (!this.performanceMetrics.has(service)) {
      this.performanceMetrics.set(service, {});
    }

    const serviceMetrics = this.performanceMetrics.get(service);
    if (!serviceMetrics[layer]) {
      serviceMetrics[layer] = {
        responseTimes: [],
        timeouts: 0,
        failures: 0,
        totalOperations: 0,
        p95ResponseTime: null,
        p99ResponseTime: null,
        averageResponseTime: null,
        timeoutRate: null
      };
    }

    const layerMetrics = serviceMetrics[layer];
    layerMetrics.failures++;
    layerMetrics.totalOperations++;

    logger.debug('Failure recorded', {
      service,
      layer,
      duration,
      timeout,
      error: error.message
    });
  }

  /**
   * Update percentile calculations
   */
  updatePercentiles(layerMetrics) {
    if (layerMetrics.responseTimes.length === 0) {
      return;
    }

    const sorted = [...layerMetrics.responseTimes].sort((a, b) => a - b);
    const len = sorted.length;

    // Calculate average
    layerMetrics.averageResponseTime = sorted.reduce((a, b) => a + b, 0) / len;

    // Calculate P95
    const p95Index = Math.floor(len * 0.95);
    layerMetrics.p95ResponseTime = sorted[Math.min(p95Index, len - 1)];

    // Calculate P99
    const p99Index = Math.floor(len * 0.99);
    layerMetrics.p99ResponseTime = sorted[Math.min(p99Index, len - 1)];
  }

  /**
   * Update timeout statistics
   */
  updateTimeoutStats(service, layer, duration, timeout, isTimeout) {
    if (!this.timeoutStats.has(service)) {
      this.timeoutStats.set(service, {});
    }

    const serviceStats = this.timeoutStats.get(service);
    if (!serviceStats[layer]) {
      serviceStats[layer] = {
        totalOperations: 0,
        totalTimeouts: 0,
        totalDuration: 0,
        averageTimeout: 0,
        maxTimeout: 0,
        minTimeout: Infinity,
        timeoutUtilization: []
      };
    }

    const layerStats = serviceStats[layer];
    layerStats.totalOperations++;
    layerStats.totalDuration += timeout;

    if (isTimeout) {
      layerStats.totalTimeouts++;
    }

    layerStats.maxTimeout = Math.max(layerStats.maxTimeout, timeout);
    layerStats.minTimeout = Math.min(layerStats.minTimeout, timeout);
    layerStats.averageTimeout = layerStats.totalDuration / layerStats.totalOperations;

    // Track timeout utilization
    const utilization = duration / timeout;
    layerStats.timeoutUtilization.push(utilization);

    // Keep only last 100 utilization values
    if (layerStats.timeoutUtilization.length > 100) {
      layerStats.timeoutUtilization = layerStats.timeoutUtilization.slice(-100);
    }
  }

  /**
   * Configure dependency-specific timeouts
   */
  configureDependencyTimeouts(service, config) {
    this.dependencyTimeouts.set(service, config);
    logger.info('Dependency timeout configuration updated', {
      service,
      config
    });
  }

  /**
   * Get timeout for specific service and layer
   */
  getTimeout(service, layer, config = TIMEOUT_CONFIGS.CONSERVATIVE, sla = null) {
    return this.calculateTimeout(layer, config, service, sla, null);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};
    
    for (const [service, serviceMetrics] of this.performanceMetrics) {
      metrics[service] = {};
      for (const [layer, layerMetrics] of Object.entries(serviceMetrics)) {
        metrics[service][layer] = {
          ...layerMetrics,
          responseTimes: undefined // Don't include raw response times
        };
      }
    }
    
    return metrics;
  }

  /**
   * Get timeout statistics
   */
  getTimeoutStats() {
    const stats = {};
    
    for (const [service, serviceStats] of this.timeoutStats) {
      stats[service] = {};
      for (const [layer, layerStats] of Object.entries(serviceStats)) {
        stats[service][layer] = {
          ...layerStats,
          minTimeout: layerStats.minTimeout === Infinity ? 0 : layerStats.minTimeout,
          averageUtilization: layerStats.timeoutUtilization.length > 0
            ? layerStats.timeoutUtilization.reduce((a, b) => a + b, 0) / layerStats.timeoutUtilization.length
            : 0
        };
      }
    }
    
    return stats;
  }

  /**
   * Get timeout recommendations
   */
  getTimeoutRecommendations(service, layer) {
    const metrics = this.performanceMetrics.get(service);
    if (!metrics || !metrics[layer]) {
      return null;
    }

    const layerMetrics = metrics[layer];
    const thresholds = this.adaptiveThresholds.get(service);
    if (!thresholds) {
      return null;
    }

    const recommendations = {
      current: this.getTimeout(service, layer),
      recommended: null,
      reasons: [],
      confidence: 0
    };

    // Calculate recommended timeout based on P99
    if (layerMetrics.p99ResponseTime) {
      const recommended = layerMetrics.p99ResponseTime * 1.5;
      recommendations.recommended = Math.floor(recommended);
      recommendations.reasons.push(`Based on P99 response time: ${layerMetrics.p99ResponseTime}ms`);
    }

    // Adjust for timeout rate
    if (layerMetrics.timeoutRate > 0.05) {
      recommendations.recommended *= 1.5;
      recommendations.reasons.push(`High timeout rate: ${(layerMetrics.timeoutRate * 100).toFixed(1)}%`);
    }

    // Ensure within bounds
    if (recommendations.recommended) {
      recommendations.recommended = Math.max(
        thresholds.minTimeout,
        Math.min(thresholds.maxTimeout, recommendations.recommended)
      );
    }

    // Calculate confidence based on data volume
    const dataVolume = layerMetrics.totalOperations;
    if (dataVolume > 1000) {
      recommendations.confidence = 0.9;
    } else if (dataVolume > 100) {
      recommendations.confidence = 0.7;
    } else {
      recommendations.confidence = 0.4;
    }

    return recommendations;
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId() {
    return `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.performanceMetrics.clear();
    this.timeoutStats.clear();
    this.slaMetrics.clear();
    logger.info('Timeout manager statistics reset');
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean up old performance metrics
    for (const [service, serviceMetrics] of this.performanceMetrics) {
      for (const [layer, layerMetrics] of Object.entries(serviceMetrics)) {
        // Keep only recent response times
        const recentResponseTimes = layerMetrics.responseTimes.filter(time => 
          Date.now() - time < cutoff
        );
        layerMetrics.responseTimes = recentResponseTimes;
      }
    }

    logger.debug('Timeout manager cleanup completed');
  }
}

// Create singleton instance
export const timeoutManager = new TimeoutManager();

// Export convenience functions
export const executeWithTimeout = (operation, options) => 
  timeoutManager.executeWithTimeout(operation, options);

export const getTimeout = (service, layer, config, sla) => 
  timeoutManager.getTimeout(service, layer, config, sla);

export const configureDependencyTimeouts = (service, config) => 
  timeoutManager.configureDependencyTimeouts(service, config);

export const getTimeoutStats = () => timeoutManager.getTimeoutStats();
export const getPerformanceMetrics = () => timeoutManager.getPerformanceMetrics();
export const getTimeoutRecommendations = (service, layer) => 
  timeoutManager.getTimeoutRecommendations(service, layer);

export default TimeoutManager;
