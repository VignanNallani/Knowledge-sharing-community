/**
 * Database Audit Policy Engine Tests
 * 
 * Purpose: Validate CI gatekeeper policy enforcement logic only
 * Design: Unit-level validation of rule behavior, not system state
 * These tests should ALWAYS PASS in CI - they validate policy correctness
 */

import { describe, it, beforeEach, expect } from '@jest/globals';
import { CIGatekeeper } from '../src/audit/database-ci-gatekeeper.js';
import { CI_THRESHOLDS, POLICY_VERSION } from '../src/audit/database-policy-config.js';

describe('Database Audit Policy Engine', () => {
  let gatekeeper;

  beforeEach(() => {
    gatekeeper = new CIGatekeeper();
  });

  describe('Sequential Scan Policy Validation', () => {
    it('should PASS when sequential scans are within threshold', () => {
      const result = gatekeeper.evaluateSequentialScan(15); // Well below 20% threshold
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
      expect(result.actual).toBe(15);
      expect(result.threshold).toBe(20);
      expect(result.reason).toBeDefined();
      expect(result.documentation).toBeDefined();
    });

    it('should FAIL with MEDIUM severity when slightly over threshold', () => {
      const result = gatekeeper.evaluateSequentialScan(25); // 25% > 20%
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM');
      expect(result.actual).toBe(25);
      expect(result.threshold).toBe(20);
    });

    it('should FAIL with HIGH severity when significantly over threshold', () => {
      const result = gatekeeper.evaluateSequentialScan(35); // 35% > 30% (1.5x)
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('HIGH');
      expect(result.actual).toBe(35);
      expect(result.threshold).toBe(20);
    });

    it('should have exact threshold behavior at boundary', () => {
      const result = gatekeeper.evaluateSequentialScan(20); // Exactly at threshold
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW'); // PASS = LOW severity
    });
  });

  describe('Slow Query Policy Validation', () => {
    it('should PASS when slow query percentage is within threshold', () => {
      const result = gatekeeper.evaluateSlowQueries(1, 20); // 5% slow queries
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
      expect(result.actual.percentage).toBe(5);
      expect(result.actual.count).toBe(1);
      expect(result.threshold).toBe(10);
    });

    it('should FAIL with MEDIUM severity when moderately over threshold', () => {
      const result = gatekeeper.evaluateSlowQueries(2, 15); // 13.33% slow queries
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM'); // 13.33% > 10% but < 15%, so MEDIUM severity
      expect(result.actual.percentage).toBeCloseTo(13.33, 2);
      expect(result.actual.count).toBe(2);
      expect(result.threshold).toBe(10);
    });

    it('should FAIL with HIGH severity when significantly over threshold', () => {
      const result = gatekeeper.evaluateSlowQueries(5, 20); // 25% slow queries - well into HIGH territory
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('HIGH'); // 25% > 10% * 1.5 = 15%, so HIGH severity
      expect(result.actual.percentage).toBe(25);
      expect(result.actual.count).toBe(5);
      expect(result.threshold).toBe(10);
    });

    it('should handle zero slow queries correctly', () => {
      const result = gatekeeper.evaluateSlowQueries(0, 50); // No slow queries
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
      expect(result.actual.percentage).toBe(0);
      expect(result.actual.count).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const result = gatekeeper.evaluateSlowQueries(2, 8); // 25% slow queries
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('HIGH'); // 25% > 10% * 1.5 = 15%, so HIGH severity
      expect(result.actual.percentage).toBe(25); // 2/8 * 100 = 25
    });
  });

  describe('Execution Time Policy Validation', () => {
    it('should PASS when execution time is within threshold', () => {
      const result = gatekeeper.evaluateExecutionTime(150); // Well below 200ms
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
      expect(result.actual).toBe(150);
      expect(result.threshold).toBe(200);
    });

    it('should FAIL when execution time exceeds threshold', () => {
      const result = gatekeeper.evaluateExecutionTime(250); // Over 200ms
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM');
      expect(result.actual).toBe(250);
      expect(result.threshold).toBe(200);
    });

    it('should have exact boundary behavior', () => {
      const result = gatekeeper.evaluateExecutionTime(200); // Exactly at threshold
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
    });
  });

  describe('Connection Pool Policy Validation', () => {
    it('should PASS when all metrics are within thresholds', () => {
      const result = gatekeeper.evaluateConnectionPool(5, 0.005); // Both within limits
      
      expect(result.status).toBe('PASS');
      expect(result.severity).toBe('LOW');
      expect(result.actual.waitTime).toBe(5);
      expect(result.actual.timeoutRate).toBe(0.005);
    });

    it('should FAIL when wait time exceeds threshold', () => {
      const result = gatekeeper.evaluateConnectionPool(15, 0.005); // Wait time too high
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM');
      expect(result.reason).toBe('Connection pool should not become bottleneck');
    });

    it('should FAIL when timeout rate exceeds threshold', () => {
      const result = gatekeeper.evaluateConnectionPool(5, 0.02); // Timeout rate too high
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM');
      expect(result.reason).toBe('Connection pool should not become bottleneck');
    });

    it('should FAIL with HIGH severity when both metrics exceed thresholds', () => {
      const result = gatekeeper.evaluateConnectionPool(25, 0.03); // Both way over limits
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('HIGH');
    });
  });

  describe('Overall Report Generation Policy', () => {
    it('should calculate PASS when all individual checks pass', () => {
      const mockAnalysis = {
        sequentialPercentage: 15,
        slowQueries: [],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.overall.status).toBe('PASS');
      expect(report.overall.severity).toBe('LOW');
      expect(report.overall.failedChecks).toBe(0);
      expect(report.overall.totalChecks).toBe(4);
    });

    it('should calculate FAIL with MEDIUM severity when some checks fail', () => {
      const mockAnalysis = {
        sequentialPercentage: 25, // FAIL
        slowQueries: [/* slow */],
        totalQueries: 10, // 10% slow - PASS
        avgExecutionTime: 150, // PASS
        connectionWaitTime: 5, // PASS
        connectionTimeoutRate: 0.005 // PASS
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('MEDIUM');
      expect(report.overall.failedChecks).toBe(1);
    });

    it('should calculate FAIL with HIGH severity when any check is HIGH', () => {
      const mockAnalysis = {
        sequentialPercentage: 35, // HIGH
        slowQueries: [/* slow */],
        totalQueries: 10, // 10% slow - PASS
        avgExecutionTime: 150, // PASS
        connectionWaitTime: 5, // PASS
        connectionTimeoutRate: 0.005 // PASS
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('HIGH');
    });

    it('should include timestamp in all reports', () => {
      const mockAnalysis = {
        sequentialPercentage: 15,
        slowQueries: [],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Policy Configuration Validation', () => {
    it('should use deterministic thresholds for CI', () => {
      // CI thresholds should be constants, not environment variables
      expect(CI_THRESHOLDS.sequentialScan.failPercent).toBe(20);
      expect(CI_THRESHOLDS.slowQuery.failPercent).toBe(10);
      expect(CI_THRESHOLDS.executionTime.failAvgMs).toBe(200);
      expect(CI_THRESHOLDS.connectionPool.maxWaitTimeMs).toBe(10);
      expect(CI_THRESHOLDS.connectionPool.maxTimeoutRate).toBe(0.01);
    });

    it('should have documented reasons for all thresholds', () => {
      const thresholdCategories = Object.keys(CI_THRESHOLDS);
      
      thresholdCategories.forEach(category => {
        const threshold = CI_THRESHOLDS[category];
        
        expect(threshold.reason).toBeDefined();
        expect(threshold.reason.length).toBeGreaterThan(10);
        expect(threshold.documentation).toBeDefined();
        expect(threshold.documentation).toContain('http');
      });
    });

    it('should have consistent threshold structure', () => {
      const thresholdCategories = Object.keys(CI_THRESHOLDS);
      
      thresholdCategories.forEach(category => {
        const threshold = CI_THRESHOLDS[category];
        
        // All thresholds should have reason and documentation
        expect(threshold).toHaveProperty('reason');
        expect(threshold).toHaveProperty('documentation');
        
        // Category-specific properties
        if (category === 'sequentialScan' || category === 'slowQuery') {
          expect(threshold).toHaveProperty('failPercent');
        }
        if (category === 'executionTime') {
          expect(threshold).toHaveProperty('failAvgMs');
        }
        if (category === 'connectionPool') {
          expect(threshold).toHaveProperty('maxWaitTimeMs');
          expect(threshold).toHaveProperty('maxTimeoutRate');
        }
        
        // All thresholds should have boundary definition
        expect(threshold).toHaveProperty('boundaryDefinition');
      });
    });
  });
});
