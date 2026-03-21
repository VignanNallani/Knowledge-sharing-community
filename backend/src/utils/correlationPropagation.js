/**
 * Correlation ID Propagation Utility
 * Ensures correlation context is propagated to downstream services
 */

class CorrelationPropagation {
  /**
   * Add correlation headers to outgoing HTTP requests
   */
  static addCorrelationHeaders(headers = {}, correlationContext = {}) {
    const correlationHeaders = {
      'X-Request-Id': correlationContext.requestId,
      'X-Trace-Id': correlationContext.traceId,
      'X-Span-Id': correlationContext.spanId,
      ...headers
    };

    // Remove undefined values
    Object.keys(correlationHeaders).forEach(key => {
      if (correlationHeaders[key] === undefined) {
        delete correlationHeaders[key];
      }
    });

    return correlationHeaders;
  }

  /**
   * Extract correlation context from incoming request headers
   */
  static extractFromHeaders(headers = {}) {
    return {
      requestId: headers['x-request-id'] || headers['X-Request-Id'],
      traceId: headers['x-trace-id'] || headers['X-Trace-Id'],
      spanId: headers['x-span-id'] || headers['X-Span-Id']
    };
  }

  /**
   * Enhanced fetch with correlation propagation
   */
  static async fetchWithCorrelation(url, options = {}, correlationContext = {}) {
    const headers = this.addCorrelationHeaders(
      options.headers || {},
      correlationContext
    );

    return fetch(url, {
      ...options,
      headers
    });
  }

  /**
   * Enhanced axios config with correlation propagation
   */
  static getAxiosConfig(baseConfig = {}, correlationContext = {}) {
    return {
      ...baseConfig,
      headers: this.addCorrelationHeaders(
        baseConfig.headers || {},
        correlationContext
      )
    };
  }

  /**
   * Add correlation context to database query options
   */
  static addDbCorrelation(queryOptions = {}, correlationContext = {}) {
    return {
      ...queryOptions,
      // Add correlation as comment for database logging
      // This varies by database type
      __correlation: correlationContext
    };
  }

  /**
   * Add correlation context to cache operations
   */
  static addCacheCorrelation(cacheOptions = {}, correlationContext = {}) {
    return {
      ...cacheOptions,
      correlationContext
    };
  }

  /**
   * Create child span for downstream operations
   */
  static createChildSpan(parentSpanId, operationName) {
    const childSpanId = `${parentSpanId}-${operationName}-${Date.now()}`;
    return childSpanId;
  }

  /**
   * Log correlation propagation for debugging
   */
  static logPropagation(operation, correlationContext, target) {
    console.debug('Correlation Propagation', {
      operation,
      target,
      requestId: correlationContext.requestId,
      traceId: correlationContext.traceId,
      spanId: correlationContext.spanId,
      timestamp: new Date().toISOString()
    });
  }
}

export default CorrelationPropagation;
