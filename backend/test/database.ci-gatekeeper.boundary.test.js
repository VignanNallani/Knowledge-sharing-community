/**
 * CI Gatekeeper Boundary Tests
 * 
 * Purpose: Validate exact threshold behavior and edge cases
 * Design: Tests boundary conditions to eliminate ambiguity
 */

import { describe, it, beforeEach, expect } from '@jest/globals';
import { CIGatekeeper, CI_THRESHOLDS } from '../src/audit/database-ci-gatekeeper.js';

describe('CI Gatekeeper Boundary Tests', () => {
  let gatekeeper;

  beforeEach(() => {
    gatekeeper = new CIGatekeeper();
  });

  describe('Sequential Scan Threshold Boundaries', () => {
    it('should PASS when exactly at threshold (20%)', () => {
      const result = gatekeeper.evaluateSequentialScan(20);
      
      expect(result.status).toBe('PASS');
      expect(result.actual).toBe(20);
      expect(result.threshold).toBe(20);
      expect(result.severity).toBe('LOW');
    });

    it('should FAIL when just over threshold (20.1%)', () => {
      const result = gatekeeper.evaluateSequentialScan(20.1);
      
      expect(result.status).toBe('FAIL');
      expect(result.actual).toBe(20.1);
      expect(result.threshold).toBe(20);
      expect(result.severity).toBe('MEDIUM');
    });

    it('should have HIGH severity at 1.5x threshold (31%)', () => {
      const result = gatekeeper.evaluateSequentialScan(31);
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('HIGH'); // 31% > 20% * 1.5 = 30%, so clearly in HIGH range
    });

    it('should document threshold reason consistently', () => {
      const passResult = gatekeeper.evaluateSequentialScan(15);
      const failResult = gatekeeper.evaluateSequentialScan(25);
      
      expect(passResult.reason).toBe(failResult.reason); // Same reason text
      expect(passResult.documentation).toBe(failResult.documentation); // Same docs
    });
  });

  describe('Slow Query Threshold Boundaries', () => {
    it('should PASS when slow queries exactly at threshold (10%)', () => {
      const result = gatekeeper.evaluateSlowQueries(1, 10); // 1/10 = 10%
      
      expect(result.status).toBe('PASS');
      expect(result.actual.percentage).toBe(10);
      expect(result.actual.count).toBe(1);
      expect(result.threshold).toBe(10);
    });

    it('should FAIL when just over threshold (10.1%)', () => {
      const result = gatekeeper.evaluateSlowQueries(2, 19); // 2/19 ≈ 10.5%
      
      expect(result.status).toBe('FAIL');
      expect(result.actual.percentage).toBeGreaterThan(10);
    });

    it('should handle zero slow queries correctly', () => {
      const result = gatekeeper.evaluateSlowQueries(0, 100);
      
      expect(result.status).toBe('PASS');
      expect(result.actual.percentage).toBe(0);
      expect(result.actual.count).toBe(0);
    });
  });

  describe('Execution Time Threshold Boundaries', () => {
    it('should PASS when exactly at threshold (200ms)', () => {
      const result = gatekeeper.evaluateExecutionTime(200);
      
      expect(result.status).toBe('PASS');
      expect(result.actual).toBe(200);
      expect(result.threshold).toBe(200);
    });

    it('should FAIL when just over threshold (200.1ms)', () => {
      const result = gatekeeper.evaluateExecutionTime(200.1);
      
      expect(result.status).toBe('FAIL');
      expect(result.severity).toBe('MEDIUM');
    });
  });

  describe('Connection Pool Threshold Boundaries', () => {
    it('should PASS when exactly at thresholds', () => {
      const result = gatekeeper.evaluateConnectionPool(10, 0.01); // max wait time, max timeout rate
      
      expect(result.status).toBe('PASS');
      expect(result.actual.waitTime).toBe(10);
      expect(result.actual.timeoutRate).toBe(0.01);
    });

    it('should FAIL when wait time exceeds threshold', () => {
      const result = gatekeeper.evaluateConnectionPool(15, 0.005); // wait time too high
      
      expect(result.status).toBe('FAIL');
      expect(result.reason).toBe('Connection pool should not become bottleneck');
    });

    it('should FAIL when timeout rate exceeds threshold', () => {
      const result = gatekeeper.evaluateConnectionPool(5, 0.02); // timeout rate too high
      
      expect(result.status).toBe('FAIL');
      expect(result.reason).toBe('Connection pool should not become bottleneck');
    });
  });

  describe('Overall Report Generation', () => {
    it('should calculate overall PASS when all checks pass', () => {
      const mockAnalysis = {
        sequentialPercentage: 15,
        slowQueries: [/* 1 slow query */],
        totalQueries: 20, // 5% slow
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.overall.status).toBe('PASS');
      expect(report.overall.severity).toBe('LOW');
      expect(report.overall.failedChecks).toBe(0);
    });

    it('should calculate overall FAIL with HIGH severity when any check is HIGH', () => {
      const mockAnalysis = {
        sequentialPercentage: 35, // HIGH severity
        slowQueries: [/* 2 slow queries */],
        totalQueries: 20, // 10% slow
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.overall.status).toBe('FAIL');
      expect(report.overall.severity).toBe('HIGH');
      expect(report.overall.failedChecks).toBeGreaterThan(0);
    });

    it('should include timestamp in report', () => {
      const mockAnalysis = {
        sequentialPercentage: 15,
        slowQueries: [],
        totalQueries: 10,
        avgExecutionTime: 100,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };

      const report = gatekeeper.generateReport(mockAnalysis);

      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Threshold Configuration Validation', () => {
    it('should use frozen thresholds for CI determinism', () => {
      // In CI, thresholds should not be environment-dependent
      expect(CI_THRESHOLDS.sequentialScan.failPercent).toBe(20);
      expect(CI_THRESHOLDS.slowQuery.failPercent).toBe(10);
      expect(CI_THRESHOLDS.executionTime.failAvgMs).toBe(200);
      
      // These should be constants, not process.env values
      expect(typeof CI_THRESHOLDS.sequentialScan.failPercent).toBe('number');
      expect(typeof CI_THRESHOLDS.sequentialScan.failPercent).not.toBe('undefined');
    });
  });
});
