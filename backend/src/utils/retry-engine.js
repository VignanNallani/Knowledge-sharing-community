import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';

const logger = createLogger('RetryEngine');

/**
 * Retry Engine - Production-Grade Reliability System
 * 
 * Provides intelligent retry mechanisms with:
 * - Context-aware retry decisions
 * - Retry classification and budgeting
 * - Idempotency protection
 * - Retry observability
 * - Storm prevention
 */

// Retry policies with configurable parameters
export const RETRY_POLICIES = {
  // Conservative policy for critical operations
  CONSERVATIVE: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    multiplier: 2,
    jitter: true,
    retryableErrors: [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.EXTERNAL,
      ERROR_CATEGORIES.DATABASE
    ],
    nonRetryableErrors: [
      ERROR_CATEGORIES.AUTHENTICATION,
      ERROR_CATEGORIES.AUTHORIZATION,
      ERROR_CATEGORIES.VALIDATION,
      ERROR_CATEGORIES.SECURITY
    ]
  },

  // Aggressive policy for non-critical operations
  AGGRESSIVE: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 30000,
    multiplier: 1.5,
    jitter: true,
    retryableErrors: [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.EXTERNAL,
      ERROR_CATEGORIES.DATABASE,
      ERROR_CATEGORIES.CACHE
    ],
    nonRetryableErrors: [
      ERROR_CATEGORIES.AUTHENTICATION,
      ERROR_CATEGORIES.AUTHORIZATION,
      ERROR_CATEGORIES.SECURITY
    ]
  },

  // Fast policy for real-time operations
  FAST: {
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 1000,
    multiplier: 2,
    jitter: true,
    retryableErrors: [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.EXTERNAL
    ],
    nonRetryableErrors: [
      ERROR_CATEGORIES.DATABASE,
      ERROR_CATEGORIES.AUTHENTICATION,
      ERROR_CATEGORIES.AUTHORIZATION,
      ERROR_CATEGORIES.VALIDATION,
      ERROR_CATEGORIES.SECURITY
    ]
  },

  // Background policy for async operations
  BACKGROUND: {
    maxAttempts: 10,
    baseDelay: 5000,
    maxDelay: 300000, // 5 minutes
    multiplier: 2,
    jitter: true,
    retryableErrors: [
      ERROR_CATEGORIES.NETWORK,
      ERROR_CATEGORIES.EXTERNAL,
      ERROR_CATEGORIES.DATABASE,
      ERROR_CATEGORIES.CACHE
    ],
    nonRetryableErrors: [
      ERROR_CATEGORIES.AUTHENTICATION,
      ERROR_CATEGORIES.AUTHORIZATION,
      ERROR_CATEGORIES.SECURITY
    ]
  }
};

// Retry decision outcomes
export const RETRY_OUTCOMES = {
  SUCCESS: 'success',
  RETRY: 'retry',
  ABORT: 'abort',
  FALLBACK: 'fallback'
};

class RetryEngine {
  constructor() {
    this.retryBudgets = new Map(); // Track retry budgets per service
    this.retryAttempts = new Map(); // Track ongoing retry attempts
    this.retryStats = new Map(); // Track retry statistics
    this.idempotencyCache = new Map(); // Cache for idempotency protection
    this.circuitBreakers = new Map(); // Integration with circuit breakers
    this.initializeBudgets();
  }

  /**
   * Initialize retry budgets for different services
   */
  initializeBudgets() {
    const defaultBudgets = {
      'database': { maxRetriesPerMinute: 30, currentRetries: 0, resetTime: Date.now() + 60000 },
      'external-api': { maxRetriesPerMinute: 60, currentRetries: 0, resetTime: Date.now() + 60000 },
      'cache': { maxRetriesPerMinute: 100, currentRetries: 0, resetTime: Date.now() + 60000 },
      'internal-service': { maxRetriesPerMinute: 50, currentRetries: 0, resetTime: Date.now() + 60000 }
    };

    for (const [service, budget] of Object.entries(defaultBudgets)) {
      this.retryBudgets.set(service, budget);
    }
  }

  /**
   * Execute operation with intelligent retry logic
   */
  async executeWithRetry(operation, options = {}) {
    const {
      policy = RETRY_POLICIES.CONSERVATIVE,
      operationId = this.generateOperationId(),
      service = 'unknown',
      idempotencyKey = null,
      context = {},
      onRetry = null,
      onAbort = null,
      timeout = null,
      fallback = null
    } = options;

    // Check idempotency cache
    if (idempotencyKey) {
      const cached = this.idempotencyCache.get(idempotencyKey);
      if (cached && !cached.isExpired()) {
        logger.info('Returning cached result for idempotent operation', {
          operationId,
          idempotencyKey,
          service
        });
        return cached.result;
      }
    }

    // Check retry budget
    if (!this.checkRetryBudget(service)) {
      logger.warning('Retry budget exhausted, falling back', {
        operationId,
        service,
        budget: this.retryBudgets.get(service)
      });

      if (fallback) {
        return await this.executeFallback(fallback, context, operationId);
      }

      throw new Error(`Retry budget exhausted for service: ${service}`);
    }

    const startTime = Date.now();
    let lastError = null;
    let attempt = 0;

    // Create span for distributed tracing
    const span = distributedTracing.startSpan('retry_operation', {
      operationId,
      service,
      policy: policy.name || 'custom',
      maxAttempts: policy.maxAttempts
    });

    try {
      while (attempt < policy.maxAttempts) {
        attempt++;
        
        try {
          // Execute the operation
          const result = await this.executeOperation(operation, timeout, span);
          
          // Success - record metrics and return result
          this.recordSuccess(service, operationId, attempt, Date.now() - startTime);
          
          // Cache result if idempotent
          if (idempotencyKey) {
            this.idempotencyCache.set(idempotencyKey, {
              result,
              timestamp: Date.now(),
              isExpired: () => Date.now() - this.timestamp > 300000 // 5 minutes
            });
          }

          span.finish({
            success: true,
            attempts: attempt,
            duration: Date.now() - startTime
          });

          return result;

        } catch (error) {
          lastError = error;
          
          // Classify the error
          const classification = errorIntelligence.classifyError(error, context);
          
          // Make retry decision
          const retryDecision = this.shouldRetry(
            error,
            classification,
            attempt,
            policy,
            service,
            operationId
          );

          logger.info('Retry decision made', {
            operationId,
            attempt,
            maxAttempts: policy.maxAttempts,
            decision: retryDecision.outcome,
            reason: retryDecision.reason,
            errorCategory: classification.category,
            errorSeverity: classification.severity
          });

          if (retryDecision.outcome === RETRY_OUTCOMES.ABORT) {
            // Don't retry - abort immediately
            this.recordAbort(service, operationId, attempt, error, classification);
            
            if (onAbort) {
              await onAbort(error, attempt, context);
            }

            span.finish({
              success: false,
              attempts: attempt,
              error: error.message,
              aborted: true
            });

            throw error;
          }

          if (retryDecision.outcome === RETRY_OUTCOMES.FALLBACK && fallback) {
            // Use fallback instead of retrying
            const fallbackResult = await this.executeFallback(fallback, context, operationId);
            
            span.finish({
              success: true,
              attempts: attempt,
              fallback: true,
              duration: Date.now() - startTime
            });

            return fallbackResult;
          }

          if (attempt < policy.maxAttempts) {
            // Calculate delay and wait before retry
            const delay = this.calculateDelay(attempt, policy, classification);
            
            logger.info('Waiting before retry', {
              operationId,
              attempt,
              delay,
              nextAttempt: attempt + 1
            });

            await this.delay(delay);

            // Call retry callback if provided
            if (onRetry) {
              await onRetry(error, attempt, delay, context);
            }
          }
        }
      }

      // All retries exhausted
      this.recordExhaustion(service, operationId, policy.maxAttempts, lastError);
      
      span.finish({
        success: false,
        attempts: attempt,
        error: lastError.message,
        exhausted: true
      });

      throw lastError;

    } finally {
      // Clean up tracking
      this.retryAttempts.delete(operationId);
    }
  }

  /**
   * Execute operation with timeout protection
   */
  async executeOperation(operation, timeout, span) {
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
   * Make intelligent retry decision
   */
  shouldRetry(error, classification, attempt, policy, service, operationId) {
    // Check if error is retryable based on policy
    if (policy.nonRetryableErrors.includes(classification.category)) {
      return {
        outcome: RETRY_OUTCOMES.ABORT,
        reason: `Error category ${classification.category} is non-retryable`
      };
    }

    if (!policy.retryableErrors.includes(classification.category)) {
      return {
        outcome: RETRY_OUTCOMES.ABORT,
        reason: `Error category ${classification.category} not in retryable list`
      };
    }

    // Check if we've exceeded max attempts
    if (attempt >= policy.maxAttempts) {
      return {
        outcome: RETRY_OUTCOMES.ABORT,
        reason: 'Maximum retry attempts exceeded'
      };
    }

    // Check retry budget
    if (!this.checkRetryBudget(service)) {
      return {
        outcome: RETRY_OUTCOMES.FALLBACK,
        reason: 'Retry budget exhausted'
      };
    }

    // Check for specific error patterns that should abort
    const abortPatterns = [
      /authentication.*failed/i,
      /authorization.*denied/i,
      /validation.*failed/i,
      /invalid.*input/i,
      /permission.*denied/i
    ];

    for (const pattern of abortPatterns) {
      if (pattern.test(error.message)) {
        return {
          outcome: RETRY_OUTCOMES.ABORT,
          reason: 'Error matches abort pattern'
        };
      }
    }

    // Check for rate limiting
    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
      return {
        outcome: RETRY_OUTCOMES.RETRY,
        reason: 'Rate limited - retry with backoff'
      };
    }

    // Default to retry for retryable errors
    return {
      outcome: RETRY_OUTCOMES.RETRY,
      reason: 'Error is retryable'
    };
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt, policy, classification) {
    let delay = policy.baseDelay * Math.pow(policy.multiplier, attempt - 1);
    delay = Math.min(delay, policy.maxDelay);

    // Add jitter to prevent thundering herd
    if (policy.jitter) {
      const jitterRange = delay * 0.1;
      delay += (Math.random() - 0.5) * jitterRange;
    }

    // Adjust delay based on error severity
    if (classification.severity === ERROR_SEVERITY.HIGH) {
      delay *= 1.5; // Longer delay for high severity errors
    } else if (classification.severity === ERROR_SEVERITY.CRITICAL) {
      delay *= 2; // Even longer delay for critical errors
    }

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Check and consume retry budget
   */
  checkRetryBudget(service) {
    const budget = this.retryBudgets.get(service);
    if (!budget) {
      return true; // No budget defined, allow retry
    }

    // Reset budget if time window has passed
    if (Date.now() > budget.resetTime) {
      budget.currentRetries = 0;
      budget.resetTime = Date.now() + 60000; // Reset in 1 minute
    }

    return budget.currentRetries < budget.maxRetriesPerMinute;
  }

  /**
   * Consume retry budget
   */
  consumeRetryBudget(service) {
    const budget = this.retryBudgets.get(service);
    if (budget) {
      budget.currentRetries++;
    }
  }

  /**
   * Execute fallback function
   */
  async executeFallback(fallback, context, operationId) {
    try {
      logger.info('Executing fallback', { operationId });
      const result = await fallback(context);
      this.recordFallback(operationId, true);
      return result;
    } catch (error) {
      logger.error('Fallback execution failed', { operationId, error: error.message });
      this.recordFallback(operationId, false);
      throw error;
    }
  }

  /**
   * Record retry statistics
   */
  recordSuccess(service, operationId, attempts, duration) {
    if (!this.retryStats.has(service)) {
      this.retryStats.set(service, {
        totalOperations: 0,
        successfulOperations: 0,
        totalRetries: 0,
        totalDuration: 0,
        averageAttempts: 0
      });
    }

    const stats = this.retryStats.get(service);
    stats.totalOperations++;
    stats.successfulOperations++;
    stats.totalRetries += (attempts - 1);
    stats.totalDuration += duration;
    stats.averageAttempts = stats.totalRetries / stats.totalOperations;

    logger.info('Operation succeeded with retries', {
      operationId,
      service,
      attempts,
      duration,
      successRate: (stats.successfulOperations / stats.totalOperations * 100).toFixed(2) + '%'
    });
  }

  recordAbort(service, operationId, attempts, error, classification) {
    logger.warning('Operation aborted', {
      operationId,
      service,
      attempts,
      error: error.message,
      category: classification.category,
      severity: classification.severity
    });
  }

  recordExhaustion(service, operationId, maxAttempts, error) {
    logger.error('Retry attempts exhausted', {
      operationId,
      service,
      maxAttempts,
      error: error.message
    });
  }

  recordFallback(operationId, success) {
    logger.info('Fallback executed', {
      operationId,
      success
    });
  }

  /**
   * Generate unique operation ID
   */
  generateOperationId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStats() {
    const stats = {};
    
    for (const [service, serviceStats] of this.retryStats) {
      stats[service] = {
        ...serviceStats,
        successRate: serviceStats.totalOperations > 0 
          ? (serviceStats.successfulOperations / serviceStats.totalOperations * 100).toFixed(2) + '%'
          : '0%',
        averageDuration: serviceStats.totalOperations > 0 
          ? Math.round(serviceStats.totalDuration / serviceStats.totalOperations)
          : 0
      };
    }

    return stats;
  }

  /**
   * Get retry budget status
   */
  getRetryBudgets() {
    const budgets = {};
    
    for (const [service, budget] of this.retryBudgets) {
      budgets[service] = {
        maxRetriesPerMinute: budget.maxRetriesPerMinute,
        currentRetries: budget.currentRetries,
        remainingRetries: budget.maxRetriesPerMinute - budget.currentRetries,
        resetTime: new Date(budget.resetTime).toISOString()
      };
    }

    return budgets;
  }

  /**
   * Reset retry statistics
   */
  resetStats() {
    this.retryStats.clear();
    this.retryAttempts.clear();
    this.idempotencyCache.clear();
    logger.info('Retry engine statistics reset');
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    // Clean up expired idempotency cache entries
    const now = Date.now();
    for (const [key, entry] of this.idempotencyCache) {
      if (now - entry.timestamp > 300000) { // 5 minutes
        this.idempotencyCache.delete(key);
      }
    }

    logger.debug('Retry engine cleanup completed');
  }
}

// Create singleton instance
export const retryEngine = new RetryEngine();

// Export convenience functions
export const executeWithRetry = (operation, options) => 
  retryEngine.executeWithRetry(operation, options);

export const getRetryStats = () => retryEngine.getRetryStats();
export const getRetryBudgets = () => retryEngine.getRetryBudgets();
export const resetRetryStats = () => retryEngine.resetStats();

export default RetryEngine;
