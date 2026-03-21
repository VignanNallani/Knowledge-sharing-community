/**
 * Database Audit Scenario Tests
 * 
 * Purpose: Validate CI gatekeeper against realistic database states
 * Design: System-level simulation of healthy and regression scenarios
 * These tests validate that the gatekeeper correctly identifies system states
 */

import { describe, it, beforeEach, expect } from '@jest/globals';
import { CIGatekeeper } from '../src/audit/database-ci-gatekeeper.js';
import { Clock } from '../src/audit/database-governance.js';

describe('Database Audit Scenario Tests', () => {
  let gatekeeper;

  beforeEach(() => {
    gatekeeper = new CIGatekeeper();
  });

  describe('Healthy Database Scenario', () => {
    it('should PASS CI gate for well-optimized database', () => {
      // Simulate a healthy database state
      const healthyAnalysis = {
        sequentialPercentage: 12, // Well under 20% threshold
        slowQueries: [/* 1 slow query out of 20 */],
        totalQueries: 20, // 5% slow queries - under 10% threshold
        avgExecutionTime: 120, // Well under 200ms threshold
        connectionWaitTime: 3, // Well under 10ms threshold
        connectionTimeoutRate: 0.002 // Well under 1% threshold
      };

      const report = gatekeeper.generateReport(healthyAnalysis);

      expect(report.overall.status).toBe('PASS');
      expect(report.overall.severity).toBe('LOW');
      expect(report.overall.failedChecks).toBe(0);
      
      // Individual checks should pass
      expect(report.sequentialScan.status).toBe('PASS');
      expect(report.slowQueries.status).toBe('PASS');
      expect(report.executionTime.status).toBe('PASS');
      expect(report.connectionPool.status).toBe('PASS');
    });

    it('should PASS with minimal sequential scans', () => {
      const minimalScanAnalysis = {
        sequentialPercentage: 5, // Very low sequential scan percentage
        slowQueries: [],
        totalQueries: 15,
        avgExecutionTime: 80,
        connectionWaitTime: 2,
        connectionTimeoutRate: 0
      };

      const report = gatekeeper.generateReport(minimalScanAnalysis);

      expect(report.overall.status).toBe('PASS');
      expect(report.sequentialScan.status).toBe('PASS');
      expect(report.sequentialScan.severity).toBe('LOW');
    });
  });

  describe('Regression Scenarios', () => {
    it('should FAIL CI gate for high sequential scan percentage', () => {
      // Simulate regression: missing indexes causing many sequential scans
      const regressionAnalysis = {
        sequentialPercentage: 45, // Well over 20% threshold
        slowQueries: [/* 3 slow queries */],
        totalQueries: 10, // 30% slow queries - over 10% threshold
        avgExecutionTime: 180, // Still reasonable
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(regressionAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('HIGH'); // Sequential scan is HIGH severity
      
      // Specific failing checks
      expect(report.sequentialScan.status).toBe('FAIL');
      expect(report.sequentialScan.severity).toBe('HIGH');
      expect(report.slowQueries.status).toBe('FAIL');
    });

    it('should FAIL CI gate for slow query performance degradation', () => {
      // Simulate regression: query performance degradation
      const performanceRegressionAnalysis = {
        sequentialPercentage: 15, // Acceptable
        slowQueries: [/* 4 slow queries */],
        totalQueries: 20, // 20% slow queries - over 10% threshold
        avgExecutionTime: 250, // Over 200ms threshold
        connectionWaitTime: 8, // Over 10ms threshold
        connectionTimeoutRate: 0.02 // Over 1% threshold
      };

      const report = gatekeeper.generateReport(performanceRegressionAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('HIGH'); // Multiple failures including HIGH
      
      // Specific failing checks
      expect(report.slowQueries.status).toBe('FAIL');
      expect(report.executionTime.status).toBe('FAIL');
      expect(report.connectionPool.status).toBe('FAIL');
    });

    it('should FAIL with MEDIUM severity for moderate regression', () => {
      // Simulate moderate regression: some metrics slightly over thresholds
      const moderateRegressionAnalysis = {
        sequentialPercentage: 25, // Over 20% threshold
        slowQueries: [/* 2 slow queries */],
        totalQueries: 25, // 8% slow queries - under 10% threshold
        avgExecutionTime: 220, // Over 200ms threshold
        connectionWaitTime: 12, // Over 10ms threshold
        connectionTimeoutRate: 0.008 // Under 1% threshold
      };

      const report = gatekeeper.generateReport(moderateRegressionAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('MEDIUM'); // No HIGH severity failures
      
      // Specific failing checks
      expect(report.sequentialScan.status).toBe('FAIL');
      expect(report.executionTime.status).toBe('FAIL');
      expect(report.connectionPool.status).toBe('FAIL');
      
      // Passing check
      expect(report.slowQueries.status).toBe('PASS');
    });
  });

  describe('Edge Case Scenarios', () => {
    it('should handle worst-case sequential scan scenario', () => {
      const worstCaseAnalysis = {
        sequentialPercentage: 80, // Almost all queries are sequential scans
        slowQueries: [/* 10 slow queries */],
        totalQueries: 12, // 83% slow queries
        avgExecutionTime: 500, // Very slow
        connectionWaitTime: 25, // Very high wait time
        connectionTimeoutRate: 0.05 // 5% timeout rate
      };

      const report = gatekeeper.generateReport(worstCaseAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('HIGH');
      
      // All checks should fail with HIGH severity
      expect(report.sequentialScan.status).toBe('FAIL');
      expect(report.sequentialScan.severity).toBe('HIGH');
      expect(report.slowQueries.status).toBe('FAIL');
      expect(report.slowQueries.severity).toBe('HIGH');
      expect(report.executionTime.status).toBe('FAIL');
      expect(report.executionTime.severity).toBe('HIGH');
      expect(report.connectionPool.status).toBe('FAIL');
      expect(report.connectionPool.severity).toBe('HIGH');
    });

    it('should handle zero query scenario gracefully', () => {
      const zeroQueryAnalysis = {
        sequentialPercentage: 0, // No sequential scans (undefined, but handle as 0)
        slowQueries: [], // No queries at all
        totalQueries: 0, // No queries at all
        avgExecutionTime: 0, // No execution time
        connectionWaitTime: 0, // No wait time
        connectionTimeoutRate: 0 // No timeouts
      };

      const report = gatekeeper.generateReport(zeroQueryAnalysis);

      expect(report.overall.status).toBe('NEUTRAL');
      expect(report.overall.severity).toBe('LOW');
      expect(report.overall.neutralChecks).toBe(1);
    });

    it('should handle boundary conditions correctly', () => {
      const boundaryAnalysis = {
        sequentialPercentage: 20, // Exactly at threshold
        slowQueries: [/* 1 slow query */],
        totalQueries: 10, // Exactly 10% slow queries
        avgExecutionTime: 200, // Exactly at threshold
        connectionWaitTime: 10, // Exactly at threshold
        connectionTimeoutRate: 0.01 // Exactly at threshold
      };

      const report = gatekeeper.generateReport(boundaryAnalysis);

      expect(report.overall.status).toBe('PASS');
      expect(report.overall.severity).toBe('LOW');
      
      // All should be exactly at boundaries but PASS
      expect(report.sequentialScan.status).toBe('PASS');
      expect(report.sequentialScan.severity).toBe('LOW');
      expect(report.slowQueries.status).toBe('PASS');
      expect(report.slowQueries.severity).toBe('LOW');
      expect(report.executionTime.status).toBe('PASS');
      expect(report.executionTime.severity).toBe('LOW');
      expect(report.connectionPool.status).toBe('PASS');
      expect(report.connectionPool.severity).toBe('LOW');
    });
  });

  describe('Report Structure Validation', () => {
    it('should include all required fields in report', () => {
      const analysis = {
        sequentialPercentage: 15,
        slowQueries: [],
        totalQueries: 10,
        avgExecutionTime: 120,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(analysis);

      // Validate report structure
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('sequentialScan');
      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('executionTime');
      expect(report).toHaveProperty('connectionPool');
      expect(report).toHaveProperty('timestamp');

      // Validate overall structure
      expect(report.overall).toHaveProperty('status');
      expect(report.overall).toHaveProperty('severity');
      expect(report.overall).toHaveProperty('failedChecks');
      expect(report.overall).toHaveProperty('totalChecks');

      // Validate individual check structures
      expect(report.sequentialScan).toHaveProperty('status');
      expect(report.sequentialScan).toHaveProperty('severity');
      expect(report.sequentialScan).toHaveProperty('actual');
      expect(report.sequentialScan).toHaveProperty('threshold');
      expect(report.sequentialScan).toHaveProperty('reason');
      expect(report.sequentialScan).toHaveProperty('documentation');
    });

    it('should generate consistent timestamps', () => {
      const analysis = {
        sequentialPercentage: 15,
        slowQueries: [{}],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      // Use fixed clock for deterministic testing
      const fixedClock = Clock.fixed('2026-03-04T12:00:00.000Z');
      const deterministicGatekeeper = new CIGatekeeper(undefined, fixedClock);

      const report1 = deterministicGatekeeper.generateReport(analysis);
      const report2 = deterministicGatekeeper.generateReport(analysis);

      expect(report1.timestamp).toBeDefined();
      expect(report2.timestamp).toBeDefined();
      expect(report1.timestamp).toBe(report2.timestamp); // Same with fixed clock
      expect(report1.timestamp).toBe('2026-03-04T12:00:00.000Z');

      // Should be valid ISO string
      expect(new Date(report1.timestamp)).toBeInstanceOf(Date);
    });
  });
});
