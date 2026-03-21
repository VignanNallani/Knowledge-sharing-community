/**
 * Database Performance CI Gatekeeper
 * 
 * Purpose: Prevent regressions in known query patterns before deployment
 * Design: Deterministic mocks with strict, documented thresholds
 * Use Case: Pre-deployment validation in CI/CD pipeline
 */

import { CI_THRESHOLDS, POLICY_VERSION, PolicyMath, POLICY_METADATA } from './database-policy-config.js';
import { AGGREGATION_SEMANTICS, PolicyAggregator, Clock } from './database-governance.js';

/**
 * CI Gatekeeper Result Scoring
 */
export class CIGatekeeper {
  constructor(thresholds = CI_THRESHOLDS, clock = new Clock()) {
    this.thresholds = thresholds;
    this.clock = clock;
  }
  
  evaluateSequentialScan(percentage) {
    const { failPercent, reason, documentation } = this.thresholds.sequentialScan;
    const normalizedPercentage = PolicyMath.normalizePercentage(percentage);
    const operator = AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.SEQUENTIAL_SCAN;
    
    const isViolation = PolicyAggregator.compareValue(normalizedPercentage, failPercent, operator);
    const status = isViolation ? 'FAIL' : 'PASS';
    
    return {
      status,
      severity: PolicyAggregator.compareValue(normalizedPercentage, failPercent * 1.5, operator) ? 'HIGH' : (isViolation ? 'MEDIUM' : 'LOW'),
      actual: normalizedPercentage,
      threshold: failPercent,
      reason,
      documentation,
      policyVersion: POLICY_VERSION
    };
  }
  
  evaluateSlowQueries(slowCount, totalCount) {
    const { failPercent, thresholdMs, reason, documentation } = this.thresholds.slowQuery;
    const percentage = PolicyMath.calculatePercentage(slowCount, totalCount);
    
    // If no activity, return NEUTRAL status
    if (!PolicyMath.isValidActivity(totalCount)) {
      return {
        status: 'NEUTRAL',
        severity: 'LOW',
        actual: { percentage: 0, count: 0 },
        threshold: failPercent,
        reason: 'No query activity to evaluate',
        documentation,
        policyVersion: POLICY_VERSION
      };
    }
    
    const operator = AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.SLOW_QUERY_PERCENTAGE;
    const isViolation = PolicyAggregator.compareValue(percentage, failPercent, operator);
    const status = isViolation ? 'FAIL' : 'PASS';
    
    return {
      status,
      severity: PolicyAggregator.compareValue(percentage, failPercent * 1.5, operator) ? 'HIGH' : (isViolation ? 'MEDIUM' : 'LOW'),
      actual: { percentage, count: slowCount },
      threshold: failPercent,
      reason,
      documentation,
      policyVersion: POLICY_VERSION
    };
  }
  
  evaluateExecutionTime(avgTime) {
    const { failAvgMs, reason, documentation } = this.thresholds.executionTime;
    const operator = AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.EXECUTION_TIME;
    
    const isViolation = PolicyAggregator.compareValue(avgTime, failAvgMs, operator);
    const status = isViolation ? 'FAIL' : 'PASS';
    
    return {
      status,
      severity: PolicyAggregator.compareValue(avgTime, failAvgMs * 1.5, operator) ? 'HIGH' : (isViolation ? 'MEDIUM' : 'LOW'),
      actual: avgTime,
      threshold: failAvgMs,
      reason,
      documentation,
      policyVersion: POLICY_VERSION
    };
  }
  
  evaluateConnectionPool(waitTime, timeoutRate) {
    const { maxWaitTimeMs, maxTimeoutRate, reason, documentation } = this.thresholds.connectionPool;
    const operator = AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.CONNECTION_POOL;
    
    const waitTimeStatus = PolicyAggregator.compareValue(waitTime, maxWaitTimeMs, operator) ? 'PASS' : 'FAIL';
    const timeoutStatus = PolicyAggregator.compareValue(timeoutRate, maxTimeoutRate, operator) ? 'PASS' : 'FAIL';
    const overallStatus = waitTimeStatus === 'PASS' && timeoutStatus === 'PASS' ? 'PASS' : 'FAIL';
    
    return {
      status: overallStatus,
      severity: (PolicyAggregator.compareValue(waitTime, maxWaitTimeMs * 2, '>') || PolicyAggregator.compareValue(timeoutRate, maxTimeoutRate * 2, '>')) ? 'HIGH' : (overallStatus === 'FAIL' ? 'MEDIUM' : 'LOW'),
      actual: { waitTime, timeoutRate },
      threshold: { maxWaitTimeMs, maxTimeoutRate },
      reason,
      documentation,
      policyVersion: POLICY_VERSION
    };
  }
  
  generateReport(analysis) {
    const sequentialScanResult = this.evaluateSequentialScan(analysis.sequentialPercentage);
    const slowQueryResult = this.evaluateSlowQueries(analysis.slowQueries.length, analysis.totalQueries);
    const executionTimeResult = this.evaluateExecutionTime(analysis.avgExecutionTime);
    const connectionPoolResult = this.evaluateConnectionPool(analysis.connectionWaitTime, analysis.connectionTimeoutRate);
    
    const allResults = [sequentialScanResult, slowQueryResult, executionTimeResult, connectionPoolResult];
    
    // Use PolicyAggregator for deterministic overall computation
    const overallStatus = PolicyAggregator.computeOverallStatus(allResults);
    const overallSeverity = PolicyAggregator.computeOverallSeverity(allResults);
    
    return {
      overall: {
        status: overallStatus,
        severity: overallSeverity,
        failedChecks: allResults.filter(r => r.status === 'FAIL').length,
        neutralChecks: allResults.filter(r => r.status === 'NEUTRAL').length,
        totalChecks: allResults.length,
        policyVersion: POLICY_VERSION
      },
      sequentialScan: sequentialScanResult,
      slowQueries: slowQueryResult,
      executionTime: executionTimeResult,
      connectionPool: connectionPoolResult,
      timestamp: this.clock.now(),
      policyMetadata: POLICY_METADATA
    };
  }
}

// Export policy version for tracking
export { POLICY_VERSION, POLICY_METADATA };
