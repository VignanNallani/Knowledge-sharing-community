/**
 * Database Audit Governance Semantics
 * 
 * Purpose: Explicit definition of aggregation and evaluation rules
 * Design: Centralized policy decisions to prevent semantic drift
 * Versioning: Changes must increment POLICY_VERSION
 */

// Aggregation semantics - explicitly documented
export const AGGREGATION_SEMANTICS = {
  // Threshold comparison operators
  THRESHOLD_COMPARISON: {
    SEQUENTIAL_SCAN: '>',      // Exclusive: > threshold = FAIL
    SLOW_QUERY_PERCENTAGE: '>', // Exclusive: > threshold = FAIL  
    EXECUTION_TIME: '>',       // Exclusive: > threshold = FAIL
    CONNECTION_POOL: '<=',      // Inclusive: <= threshold = PASS
  },
  
  // Overall severity computation
  OVERALL_SEVERITY_MODEL: 'MAX_SEVERITY', // Options: MAX_SEVERITY, ESCALATION_MODEL
  
  // Multi-failure escalation rules (only used if ESCALATION_MODEL)
  ESCALATION_RULES: {
    MEDIUM_FAILURES_FOR_HIGH: 2, // 2+ MEDIUM failures → HIGH overall
    ANY_HIGH_FAILURE: true,       // Any HIGH failure → HIGH overall
  },
  
  // Neutral interaction rules
  NEUTRAL_INTERACTION: {
    BLOCKS_PASS: true,           // Any NEUTRAL → overall NEUTRAL
    CONTRIBUTES_TO_SEVERITY: false, // NEUTRAL doesn't affect severity
    MINIMUM_NEUTRAL_COUNT: 1     // 1+ NEUTRAL → overall NEUTRAL
  },
  
  // Status precedence (highest to lowest)
  STATUS_PRECEDENCE: ['FAIL', 'NEUTRAL', 'PASS']
};

// Helper class for deterministic aggregation
export class PolicyAggregator {
  static computeOverallStatus(results, semantics = AGGREGATION_SEMANTICS) {
    const statusCounts = {
      FAIL: results.filter(r => r.status === 'FAIL').length,
      NEUTRAL: results.filter(r => r.status === 'NEUTRAL').length,
      PASS: results.filter(r => r.status === 'PASS').length
    };
    
    // Apply neutral interaction rules first
    if (semantics.NEUTRAL_INTERACTION.BLOCKS_PASS && statusCounts.NEUTRAL >= semantics.NEUTRAL_INTERACTION.MINIMUM_NEUTRAL_COUNT) {
      return 'NEUTRAL';
    }
    
    // Then apply standard precedence
    for (const status of semantics.STATUS_PRECEDENCE) {
      if (statusCounts[status] > 0) {
        return status;
      }
    }
    
    return 'PASS'; // Default if all pass
  }
  
  static computeOverallSeverity(results, semantics = AGGREGATION_SEMANTICS) {
    const failingResults = results.filter(r => r.status === 'FAIL');
    
    if (failingResults.length === 0) {
      return 'LOW';
    }
    
    if (semantics.OVERALL_SEVERITY_MODEL === 'MAX_SEVERITY') {
      // Maximum severity of failing checks
      const severities = ['HIGH', 'MEDIUM', 'LOW'];
      for (const severity of severities) {
        if (failingResults.some(r => r.severity === severity)) {
          return severity;
        }
      }
      return 'LOW';
    }
    
    if (semantics.OVERALL_SEVERITY_MODEL === 'ESCALATION_MODEL') {
      // Escalation model
      const highFailures = failingResults.filter(r => r.severity === 'HIGH').length;
      const mediumFailures = failingResults.filter(r => r.severity === 'MEDIUM').length;
      
      if (highFailures > 0 || semantics.ESCALATION_RULES.ANY_HIGH_FAILURE) {
        return 'HIGH';
      }
      
      if (mediumFailures >= semantics.ESCALATION_RULES.MEDIUM_FAILURES_FOR_HIGH) {
        return 'HIGH';
      }
      
      return 'MEDIUM';
    }
    
    return 'LOW';
  }
  
  static compareValue(value, threshold, operator) {
    switch (operator) {
      case '>':
        return value > threshold;
      case '>=':
        return value >= threshold;
      case '<':
        return value < threshold;
      case '<=':
        return value <= threshold;
      default:
        throw new Error(`Unknown comparison operator: ${operator}`);
    }
  }
}

// Clock dependency for deterministic testing
export class Clock {
  constructor(timeProvider = () => new Date().toISOString()) {
    this.timeProvider = timeProvider;
  }
  
  now() {
    return this.timeProvider();
  }
  
  static fixed(timestamp) {
    return new Clock(() => timestamp);
  }
}
