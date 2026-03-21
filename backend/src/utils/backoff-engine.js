import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';

const logger = createLogger('BackoffEngine');

/**
 * Backoff Engine - Production-Grade Delay Management
 * 
 * Provides intelligent backoff strategies with:
 * - Exponential backoff with jitter
 * - Adaptive backoff based on system conditions
 * - Load-aware backoff
 * - Failure-aware backoff
 * - Storm prevention
 */

// Backoff strategies
export const BACKOFF_STRATEGIES = {
  // Fixed delay strategy
  FIXED: {
    type: 'fixed',
    calculate: (attempt, baseDelay, options = {}) => {
      return baseDelay;
    }
  },

  // Linear backoff
  LINEAR: {
    type: 'linear',
    calculate: (attempt, baseDelay, options = {}) => {
      const { multiplier = 1 } = options;
      return baseDelay + (attempt - 1) * multiplier * baseDelay;
    }
  },

  // Exponential backoff
  EXPONENTIAL: {
    type: 'exponential',
    calculate: (attempt, baseDelay, options = {}) => {
      const { multiplier = 2, maxDelay = 30000 } = options;
      const delay = baseDelay * Math.pow(multiplier, attempt - 1);
      return Math.min(delay, maxDelay);
    }
  },

  // Fibonacci backoff
  FIBONACCI: {
    type: 'fibonacci',
    calculate: (attempt, baseDelay, options = {}) => {
      const { maxDelay = 30000 } = options;
      const fibonacci = this.getFibonacci(attempt);
      const delay = baseDelay * fibonacci;
      return Math.min(delay, maxDelay);
    },
    getFibonacci: (n) => {
      if (n <= 1) return n;
      let a = 0, b = 1;
      for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
      }
      return b;
    }
  }
};

// Jitter strategies
export const JITTER_STRATEGIES = {
  // No jitter
  NONE: {
    apply: (delay) => delay
  },

  // Full jitter - random between 0 and delay
  FULL: {
    apply: (delay) => Math.random() * delay
  },

  // Equal jitter - delay/2 + random between 0 and delay/2
  EQUAL: {
    apply: (delay) => delay / 2 + Math.random() * (delay / 2)
  },

  // Decorrelated jitter - random between previous delay and delay * 3
  DECORRELATED: {
    apply: (delay, previousDelay) => {
      const min = previousDelay || delay;
      const max = delay * 3;
      return min + Math.random() * (max - min);
    }
  },

  // Exponential decorrelated jitter
  EXPONENTIAL_DECORRELATED: {
    apply: (delay, previousDelay) => {
      const base = previousDelay || delay;
      return base + Math.random() * (delay * 3 - base);
    }
  }
};

class BackoffEngine {
  constructor() {
    this.systemMetrics = new Map(); // Track system metrics for adaptive backoff
    this.loadMetrics = new Map(); // Track load metrics
    this.failureHistory = new Map(); // Track failure patterns
    this.backoffStats = new Map(); // Track backoff statistics
    this.adaptiveThresholds = new Map(); // Adaptive thresholds per service
    this.initializeMetrics();
  }

  /**
   * Initialize system metrics tracking
   */
  initializeMetrics() {
    // Default adaptive thresholds
    const defaultThresholds = {
      'database': {
        highLoadThreshold: 80, // CPU/Connection usage
        failureRateThreshold: 0.1, // 10% failure rate
        responseTimeThreshold: 1000, // 1 second
        adaptiveMultiplier: 1.5
      },
      'external-api': {
        highLoadThreshold: 70,
        failureRateThreshold: 0.05, // 5% failure rate
        responseTimeThreshold: 2000, // 2 seconds
        adaptiveMultiplier: 2.0
      },
      'cache': {
        highLoadThreshold: 90,
        failureRateThreshold: 0.02, // 2% failure rate
        responseTimeThreshold: 100, // 100ms
        adaptiveMultiplier: 1.2
      },
      'internal-service': {
        highLoadThreshold: 75,
        failureRateThreshold: 0.08, // 8% failure rate
        responseTimeThreshold: 500, // 500ms
        adaptiveMultiplier: 1.3
      }
    };

    for (const [service, thresholds] of Object.entries(defaultThresholds)) {
      this.adaptiveThresholds.set(service, thresholds);
    }
  }

  /**
   * Calculate intelligent backoff delay
   */
  async calculateBackoff(attempt, options = {}) {
    const {
      strategy = BACKOFF_STRATEGIES.EXPONENTIAL,
      jitter = JITTER_STRATEGIES.EQUAL,
      baseDelay = 1000,
      maxDelay = 30000,
      service = 'unknown',
      error = null,
      context = {},
      previousDelay = null
    } = options;

    // Create span for distributed tracing
    const span = distributedTracing.startSpan('backoff_calculation', {
      attempt,
      strategy: strategy.type,
      service,
      baseDelay,
      maxDelay
    });

    try {
      // Calculate base delay using strategy
      let delay = strategy.calculate(attempt, baseDelay, { maxDelay });

      // Apply adaptive adjustments
      delay = await this.applyAdaptiveAdjustments(delay, service, error, context);

      // Apply load-aware adjustments
      delay = await this.applyLoadAwareAdjustments(delay, service);

      // Apply failure-aware adjustments
      delay = await this.applyFailureAwareAdjustments(delay, service, error, attempt);

      // Apply jitter
      delay = jitter.apply(delay, previousDelay);

      // Ensure delay is within bounds
      delay = Math.max(0, Math.min(delay, maxDelay));

      // Record statistics
      this.recordBackoff(service, attempt, delay, strategy.type, jitter.name);

      span.finish({
        calculatedDelay: delay,
        adaptiveAdjustments: true,
        loadAwareAdjustments: true,
        failureAwareAdjustments: true
      });

      return delay;

    } catch (error) {
      span.finish({
        error: error.message,
        fallbackDelay: baseDelay
      });
      
      logger.error('Backoff calculation failed, using base delay', {
        service,
        attempt,
        error: error.message
      });

      return baseDelay;
    }
  }

  /**
   * Apply adaptive adjustments based on system conditions
   */
  async applyAdaptiveAdjustments(delay, service, error, context) {
    const thresholds = this.adaptiveThresholds.get(service);
    if (!thresholds) {
      return delay;
    }

    const metrics = this.systemMetrics.get(service) || {};
    let adjustedDelay = delay;
    let adjustmentReasons = [];

    // Adjust based on response time
    if (metrics.averageResponseTime && metrics.averageResponseTime > thresholds.responseTimeThreshold) {
      const multiplier = 1 + (metrics.averageResponseTime - thresholds.responseTimeThreshold) / thresholds.responseTimeThreshold;
      adjustedDelay *= multiplier;
      adjustmentReasons.push(`high_response_time_${metrics.averageResponseTime}ms`);
    }

    // Adjust based on failure rate
    if (metrics.failureRate && metrics.failureRate > thresholds.failureRateThreshold) {
      const multiplier = 1 + (metrics.failureRate - thresholds.failureRateThreshold) / thresholds.failureRateThreshold;
      adjustedDelay *= multiplier * thresholds.adaptiveMultiplier;
      adjustmentReasons.push(`high_failure_rate_${(metrics.failureRate * 100).toFixed(1)}%`);
    }

    // Adjust based on system load
    if (metrics.systemLoad && metrics.systemLoad > thresholds.highLoadThreshold) {
      const multiplier = 1 + (metrics.systemLoad - thresholds.highLoadThreshold) / thresholds.highLoadThreshold;
      adjustedDelay *= multiplier;
      adjustmentReasons.push(`high_system_load_${metrics.systemLoad}%`);
    }

    // Adjust based on error severity
    if (error) {
      const classification = errorIntelligence.classifyError(error, context);
      if (classification.severity === ERROR_SEVERITY.HIGH) {
        adjustedDelay *= 1.5;
        adjustmentReasons.push('high_severity_error');
      } else if (classification.severity === ERROR_SEVERITY.CRITICAL) {
        adjustedDelay *= 2.0;
        adjustmentReasons.push('critical_severity_error');
      }
    }

    if (adjustmentReasons.length > 0) {
      logger.debug('Adaptive backoff adjustments applied', {
        service,
        originalDelay: delay,
        adjustedDelay,
        reasons: adjustmentReasons
      });
    }

    return adjustedDelay;
  }

  /**
   * Apply load-aware adjustments
   */
  async applyLoadAwareAdjustments(delay, service) {
    const loadMetrics = this.loadMetrics.get(service);
    if (!loadMetrics) {
      return delay;
    }

    let adjustedDelay = delay;

    // Adjust based on concurrent operations
    if (loadMetrics.concurrentOperations > 10) {
      const multiplier = 1 + (loadMetrics.concurrentOperations - 10) * 0.1;
      adjustedDelay *= multiplier;
    }

    // Adjust based on queue depth
    if (loadMetrics.queueDepth > 50) {
      const multiplier = 1 + (loadMetrics.queueDepth - 50) * 0.05;
      adjustedDelay *= multiplier;
    }

    // Adjust based on resource utilization
    if (loadMetrics.resourceUtilization > 0.8) {
      const multiplier = 1 + (loadMetrics.resourceUtilization - 0.8) * 2;
      adjustedDelay *= multiplier;
    }

    return adjustedDelay;
  }

  /**
   * Apply failure-aware adjustments
   */
  async applyFailureAwareAdjustments(delay, service, error, attempt) {
    if (!error) {
      return delay;
    }

    const failureHistory = this.failureHistory.get(service) || [];
    let adjustedDelay = delay;

    // Check for recent failures
    const recentFailures = failureHistory.filter(f => 
      Date.now() - f.timestamp < 300000 // Last 5 minutes
    );

    if (recentFailures.length > 5) {
      // Many recent failures - increase backoff
      adjustedDelay *= 1 + (recentFailures.length - 5) * 0.2;
    }

    // Check for consecutive failures
    const consecutiveFailures = this.getConsecutiveFailures(failureHistory);
    if (consecutiveFailures > 3) {
      adjustedDelay *= 1 + consecutiveFailures * 0.3;
    }

    // Check for error pattern repetition
    const errorPattern = this.getErrorPattern(error);
    const patternOccurrences = recentFailures.filter(f => 
      this.getErrorPattern(f.error) === errorPattern
    ).length;

    if (patternOccurrences > 2) {
      adjustedDelay *= 1.5;
    }

    return adjustedDelay;
  }

  /**
   * Update system metrics for adaptive backoff
   */
  updateSystemMetrics(service, metrics) {
    const current = this.systemMetrics.get(service) || {};
    const updated = { ...current, ...metrics, lastUpdated: Date.now() };
    this.systemMetrics.set(service, updated);

    logger.debug('System metrics updated', {
      service,
      metrics: updated
    });
  }

  /**
   * Update load metrics
   */
  updateLoadMetrics(service, metrics) {
    const current = this.loadMetrics.get(service) || {};
    const updated = { ...current, ...metrics, lastUpdated: Date.now() };
    this.loadMetrics.set(service, updated);

    logger.debug('Load metrics updated', {
      service,
      metrics: updated
    });
  }

  /**
   * Record failure for failure-aware backoff
   */
  recordFailure(service, error, context = {}) {
    if (!this.failureHistory.has(service)) {
      this.failureHistory.set(service, []);
    }

    const history = this.failureHistory.get(service);
    history.push({
      timestamp: Date.now(),
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      },
      context,
      pattern: this.getErrorPattern(error)
    });

    // Keep only last 100 failures
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    logger.debug('Failure recorded for backoff analysis', {
      service,
      error: error.message,
      pattern: this.getErrorPattern(error)
    });
  }

  /**
   * Record backoff statistics
   */
  recordBackoff(service, attempt, delay, strategy, jitter) {
    if (!this.backoffStats.has(service)) {
      this.backoffStats.set(service, {
        totalBackoffs: 0,
        totalDelay: 0,
        averageDelay: 0,
        maxDelay: 0,
        minDelay: Infinity,
        strategyUsage: {},
        jitterUsage: {}
      });
    }

    const stats = this.backoffStats.get(service);
    stats.totalBackoffs++;
    stats.totalDelay += delay;
    stats.averageDelay = stats.totalDelay / stats.totalBackoffs;
    stats.maxDelay = Math.max(stats.maxDelay, delay);
    stats.minDelay = Math.min(stats.minDelay, delay);

    // Track strategy usage
    stats.strategyUsage[strategy] = (stats.strategyUsage[strategy] || 0) + 1;
    stats.jitterUsage[jitter] = (stats.jitterUsage[jitter] || 0) + 1;

    logger.debug('Backoff statistics updated', {
      service,
      attempt,
      delay,
      strategy,
      jitter,
      averageDelay: Math.round(stats.averageDelay)
    });
  }

  /**
   * Get error pattern for pattern matching
   */
  getErrorPattern(error) {
    if (!error) return 'unknown';
    
    const message = (error.message || '').toLowerCase();
    const code = (error.code || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    
    // Extract pattern by removing dynamic values
    const pattern = message
      .replace(/\d+/g, '*')
      .replace(/['"][^'"]*['"]/g, '"*"')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '*');
    
    return `${name}:${code}:${pattern}`;
  }

  /**
   * Get consecutive failures count
   */
  getConsecutiveFailures(history) {
    if (history.length === 0) return 0;
    
    let consecutive = 1;
    const now = Date.now();
    
    for (let i = history.length - 2; i >= 0; i--) {
      const failure = history[i];
      const timeDiff = now - failure.timestamp;
      
      // Check if failures are within a reasonable time window (5 minutes)
      if (timeDiff < 300000) {
        consecutive++;
      } else {
        break;
      }
    }
    
    return consecutive;
  }

  /**
   * Get backoff statistics
   */
  getBackoffStats() {
    const stats = {};
    
    for (const [service, serviceStats] of this.backoffStats) {
      stats[service] = {
        ...serviceStats,
        minDelay: serviceStats.minDelay === Infinity ? 0 : serviceStats.minDelay
      };
    }
    
    return stats;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const metrics = {};
    
    for (const [service, serviceMetrics] of this.systemMetrics) {
      metrics[service] = serviceMetrics;
    }
    
    return metrics;
  }

  /**
   * Get load metrics
   */
  getLoadMetrics() {
    const metrics = {};
    
    for (const [service, serviceMetrics] of this.loadMetrics) {
      metrics[service] = serviceMetrics;
    }
    
    return metrics;
  }

  /**
   * Get failure analysis
   */
  getFailureAnalysis(service, timeWindow = 3600000) { // Default 1 hour
    const history = this.failureHistory.get(service) || [];
    const cutoff = Date.now() - timeWindow;
    const recentFailures = history.filter(f => f.timestamp >= cutoff);

    const analysis = {
      totalFailures: recentFailures.length,
      failureRate: 0,
      topPatterns: {},
      consecutiveFailures: 0,
      averageTimeBetweenFailures: 0,
      timeWindow
    };

    if (recentFailures.length === 0) {
      return analysis;
    }

    // Calculate failure rate (failures per minute)
    analysis.failureRate = recentFailures.length / (timeWindow / 60000);

    // Analyze patterns
    const patternCounts = {};
    for (const failure of recentFailures) {
      patternCounts[failure.pattern] = (patternCounts[failure.pattern] || 0) + 1;
    }

    // Sort and get top patterns
    analysis.topPatterns = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [pattern, count]) => {
        obj[pattern] = count;
        return obj;
      }, {});

    // Calculate consecutive failures
    analysis.consecutiveFailures = this.getConsecutiveFailures(recentFailures);

    // Calculate average time between failures
    if (recentFailures.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < recentFailures.length; i++) {
        timeDiffs.push(recentFailures[i].timestamp - recentFailures[i-1].timestamp);
      }
      analysis.averageTimeBetweenFailures = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    }

    return analysis;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.backoffStats.clear();
    this.failureHistory.clear();
    logger.info('Backoff engine statistics reset');
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean up old failure history
    for (const [service, history] of this.failureHistory) {
      const filtered = history.filter(f => f.timestamp >= cutoff);
      this.failureHistory.set(service, filtered);
    }

    // Clean up old metrics
    for (const [service, metrics] of this.systemMetrics) {
      if (metrics.lastUpdated && metrics.lastUpdated < cutoff) {
        this.systemMetrics.delete(service);
      }
    }

    for (const [service, metrics] of this.loadMetrics) {
      if (metrics.lastUpdated && metrics.lastUpdated < cutoff) {
        this.loadMetrics.delete(service);
      }
    }

    logger.debug('Backoff engine cleanup completed');
  }
}

// Create singleton instance
export const backoffEngine = new BackoffEngine();

// Export convenience functions
export const calculateBackoff = (attempt, options) => 
  backoffEngine.calculateBackoff(attempt, options);

export const updateSystemMetrics = (service, metrics) => 
  backoffEngine.updateSystemMetrics(service, metrics);

export const updateLoadMetrics = (service, metrics) => 
  backoffEngine.updateLoadMetrics(service, metrics);

export const recordFailure = (service, error, context) => 
  backoffEngine.recordFailure(service, error, context);

export const getBackoffStats = () => backoffEngine.getBackoffStats();
export const getFailureAnalysis = (service, timeWindow) => 
  backoffEngine.getFailureAnalysis(service, timeWindow);

export default BackoffEngine;
