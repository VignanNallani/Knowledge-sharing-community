import { logger } from '../config/index.js';

/**
 * Performance monitoring utility for tracking query performance and identifying bottlenecks
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.maxMetricsHistory = 1000;
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  /**
   * Start timing a query or operation
   * @param {string} operation - Operation name (e.g., 'getPosts', 'findUser')
   * @param {Object} context - Additional context (user ID, query params, etc.)
   * @returns {Function} Function to call when operation completes
   */
  static startTimer(operation, context = {}) {
    const startTime = process.hrtime.bigint();
    
    return (result = null, error = null) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          operation,
          duration: `${duration.toFixed(2)}ms`,
          context,
          error: error?.message
        });
      }

      // Record metrics
      this.recordMetric(operation, duration, context, error);
      
      return { duration, operation, context };
    };
  }

  /**
   * Record performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} context - Additional context
   * @param {Error} error - Error if operation failed
   */
  static recordMetric(operation, duration, context = {}, error = null) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        recentDurations: []
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    if (error) {
      metric.errors++;
    }

    // Keep only recent durations for percentile calculations
    metric.recentDurations.push({ duration, timestamp: Date.now(), context, error: !!error });
    if (metric.recentDurations.length > this.maxMetricsHistory) {
      metric.recentDurations.shift();
    }
  }

  /**
   * Get performance statistics for an operation
   * @param {string} operation - Operation name
   * @returns {Object} Performance statistics
   */
  static getStats(operation) {
    const metric = this.metrics.get(operation);
    if (!metric) {
      return null;
    }

    const avgDuration = metric.totalDuration / metric.count;
    const errorRate = (metric.errors / metric.count) * 100;
    
    // Calculate percentiles from recent durations
    const durations = metric.recentDurations.map(r => r.duration).sort((a, b) => a - b);
    const p50 = this.percentile(durations, 50);
    const p90 = this.percentile(durations, 90);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    return {
      operation,
      count: metric.count,
      avgDuration: avgDuration.toFixed(2),
      minDuration: metric.minDuration.toFixed(2),
      maxDuration: metric.maxDuration.toFixed(2),
      errorRate: errorRate.toFixed(2),
      percentiles: {
        p50: p50?.toFixed(2) || '0',
        p90: p90?.toFixed(2) || '0',
        p95: p95?.toFixed(2) || '0',
        p99: p99?.toFixed(2) || '0'
      }
    };
  }

  /**
   * Get all performance statistics
   * @returns {Array} Array of performance statistics
   */
  static getAllStats() {
    const stats = [];
    for (const operation of this.metrics.keys()) {
      stats.push(this.getStats(operation));
    }
    return stats.sort((a, b) => parseFloat(b.avgDuration) - parseFloat(a.avgDuration));
  }

  /**
   * Get slow operations (avg duration > threshold)
   * @param {number} threshold - Threshold in milliseconds
   * @returns {Array} Array of slow operations
   */
  static getSlowOperations(threshold = this.slowQueryThreshold) {
    return this.getAllStats().filter(stat => parseFloat(stat.avgDuration) > threshold);
  }

  /**
   * Get operations with high error rates
   * @param {number} errorRateThreshold - Error rate threshold (percentage)
   * @returns {Array} Array of operations with high error rates
   */
  static getHighErrorOperations(errorRateThreshold = 5) {
    return this.getAllStats().filter(stat => parseFloat(stat.errorRate) > errorRateThreshold);
  }

  /**
   * Calculate percentile from sorted array
   * @param {Array} values - Sorted array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  static percentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return values[lower];
    }
    
    const weight = index - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  }

  /**
   * Clean up old metrics
   */
  static cleanup() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [operation, metric] of this.metrics.entries()) {
      metric.recentDurations = metric.recentDurations.filter(
        r => r.timestamp > cutoffTime
      );
      
      // Remove operations with no recent data
      if (metric.recentDurations.length === 0) {
        this.metrics.delete(operation);
      }
    }
  }

  /**
   * Reset all metrics
   */
  static reset() {
    this.metrics.clear();
  }

  /**
   * Export metrics for external monitoring systems
   * @returns {Object} Formatted metrics for export
   */
  static exportMetrics() {
    const stats = this.getAllStats();
    
    return {
      timestamp: new Date().toISOString(),
      totalOperations: stats.length,
      slowOperations: this.getSlowOperations().length,
      highErrorOperations: this.getHighErrorOperations().length,
      operations: stats
    };
  }

  /**
   * Generate performance report
   * @returns {Object} Detailed performance report
   */
  static generateReport() {
    const allStats = this.getAllStats();
    const slowOps = this.getSlowOperations();
    const highErrorOps = this.getHighErrorOperations();
    
    return {
      summary: {
        totalOperations: allStats.length,
        slowOperations: slowOps.length,
        highErrorOperations: highErrorOps.length,
        generatedAt: new Date().toISOString()
      },
      slowOperations: slowOps,
      highErrorOperations: highErrorOps,
      allOperations: allStats,
      recommendations: this.generateRecommendations(slowOps, highErrorOps)
    };
  }

  /**
   * Generate performance recommendations
   * @param {Array} slowOps - Slow operations
   * @param {Array} highErrorOps - High error operations
   * @returns {Array} List of recommendations
   */
  static generateRecommendations(slowOps, highErrorOps) {
    const recommendations = [];
    
    if (slowOps.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${slowOps.length} operations have average response times > 1s`,
        operations: slowOps.map(op => op.operation),
        suggestions: [
          'Add database indexes for frequently queried fields',
          'Implement query result caching',
          'Optimize complex queries with proper joins',
          'Consider query pagination for large result sets'
        ]
      });
    }
    
    if (highErrorOps.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        message: `${highErrorOps.length} operations have error rates > 5%`,
        operations: highErrorOps.map(op => op.operation),
        suggestions: [
          'Implement proper error handling and retry logic',
          'Add input validation to prevent invalid requests',
          'Review and fix underlying bugs causing errors',
          'Add circuit breakers for unreliable operations'
        ]
      });
    }
    
    return recommendations;
  }
}

/**
 * Middleware to automatically track request performance
 */
export function performanceMiddleware() {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const operation = `${req.method} ${req.route?.path || req.path}`;
    
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      PerformanceMonitor.recordMetric(operation, duration, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }, res.statusCode >= 400 ? new Error(`HTTP ${res.statusCode}`) : null);
    });
    
    next();
  };
}

/**
 * Decorator to automatically track method performance
 */
export function trackPerformance(operationName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const operation = operationName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function(...args) {
      const endTimer = PerformanceMonitor.startTimer(operation, {
        className: target.constructor.name,
        methodName: propertyKey,
        args: args.length
      });
      
      try {
        const result = await originalMethod.apply(this, args);
        endTimer(result);
        return result;
      } catch (error) {
        endTimer(null, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Initialize static properties
PerformanceMonitor.metrics = new Map();
PerformanceMonitor.slowQueryThreshold = 1000;
PerformanceMonitor.maxMetricsHistory = 1000;
PerformanceMonitor.cleanupInterval = setInterval(() => PerformanceMonitor.cleanup(), 300000);

export default PerformanceMonitor;
