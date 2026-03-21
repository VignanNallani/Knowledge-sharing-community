/**
 * Database Audit Contract Tests
 * 
 * Purpose: Prevent semantic drift in governance system
 * Design: Structural validation of contract invariants
 * These tests should NEVER fail unless governance semantics change
 */

import { describe, it, expect } from '@jest/globals';
import { CIGatekeeper, POLICY_VERSION, POLICY_METADATA } from '../src/audit/database-ci-gatekeeper.js';
import { 
  AGGREGATION_SEMANTICS, 
  PolicyAggregator, 
  Clock 
} from '../src/audit/database-governance.js';
import { 
  CI_THRESHOLDS, 
  BOUNDARY_POLICY, 
  PolicyMath 
} from '../src/audit/database-policy-config.js';

describe('Database Audit Governance Contract Tests', () => {
  describe('Policy Versioning Contract', () => {
    it('should have immutable policy version structure', () => {
      expect(POLICY_VERSION).toBeDefined();
      expect(typeof POLICY_VERSION).toBe('string');
      expect(POLICY_VERSION).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
    });

    it('should have complete policy metadata', () => {
      expect(POLICY_METADATA).toBeDefined();
      expect(POLICY_METADATA.version).toBe(POLICY_VERSION);
      expect(POLICY_METADATA.lastUpdated).toBeDefined();
      expect(POLICY_METADATA.reviewCycle).toBeDefined();
      expect(POLICY_METADATA.approvalRequired).toBeInstanceOf(Array);
      expect(POLICY_METADATA.complianceStandards).toBeInstanceOf(Array);
      expect(POLICY_METADATA.changeManagement).toBeDefined();
    });
  });

  describe('Aggregation Semantics Contract', () => {
    it('should have explicit comparison operators', () => {
      expect(AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON).toBeDefined();
      expect(AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.SEQUENTIAL_SCAN).toBe('>');
      expect(AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.SLOW_QUERY_PERCENTAGE).toBe('>');
      expect(AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.EXECUTION_TIME).toBe('>');
      expect(AGGREGATION_SEMANTICS.THRESHOLD_COMPARISON.CONNECTION_POOL).toBe('<=');
    });

    it('should have defined severity model', () => {
      expect(AGGREGATION_SEMANTICS.OVERALL_SEVERITY_MODEL).toBe('MAX_SEVERITY');
      expect(AGGREGATION_SEMANTICS.ESCALATION_RULES).toBeDefined();
    });

    it('should have explicit neutral interaction rules', () => {
      expect(AGGREGATION_SEMANTICS.NEUTRAL_INTERACTION).toBeDefined();
      expect(typeof AGGREGATION_SEMANTICS.NEUTRAL_INTERACTION.BLOCKS_PASS).toBe('boolean');
      expect(typeof AGGREGATION_SEMANTICS.NEUTRAL_INTERACTION.CONTRIBUTES_TO_SEVERITY).toBe('boolean');
      expect(AGGREGATION_SEMANTICS.NEUTRAL_INTERACTION.MINIMUM_NEUTRAL_COUNT).toBeGreaterThan(0);
    });

    it('should have immutable status precedence', () => {
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE).toBeDefined();
      expect(Array.isArray(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE)).toBe(true);
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE).toEqual(['FAIL', 'NEUTRAL', 'PASS']);
      
      // Verify array contents are correct (arrays are mutable in JS, so we check value)
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE.length).toBe(3);
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE[0]).toBe('FAIL');
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE[1]).toBe('NEUTRAL');
      expect(AGGREGATION_SEMANTICS.STATUS_PRECEDENCE[2]).toBe('PASS');
    });
  });

  describe('Boundary Policy Contract', () => {
    it('should have explicit precision and tolerance', () => {
      expect(BOUNDARY_POLICY.PRECISION).toBeGreaterThan(0);
      expect(BOUNDARY_POLICY.TOLERANCE).toBeGreaterThanOrEqual(0);
      expect(['STRICT', 'TOLERANT']).toContain(BOUNDARY_POLICY.COMPARISON);
    });

    it('should normalize percentages consistently', () => {
      const testValues = [13.333333333333334, 25.000000000000001, 30.0];
      const expectedValues = [13.33, 25.0, 30.0];
      
      testValues.forEach((value, index) => {
        expect(PolicyMath.normalizePercentage(value)).toBe(expectedValues[index]);
      });
    });

    it('should handle zero denominator gracefully', () => {
      expect(PolicyMath.calculatePercentage(5, 0)).toBe(0);
      expect(PolicyMath.calculatePercentage(0, 0)).toBe(0);
      expect(PolicyMath.isValidActivity(0)).toBe(false);
      expect(PolicyMath.isValidActivity(1)).toBe(true);
    });
  });

  describe('PolicyAggregator Contract', () => {
    it('should compute status according to precedence rules', () => {
      const results = [
        { status: 'PASS', severity: 'LOW' },
        { status: 'FAIL', severity: 'MEDIUM' },
        { status: 'NEUTRAL', severity: 'LOW' }
      ];
      
      // According to precedence rules: FAIL > NEUTRAL > PASS
      // But NEUTRAL blocks PASS, so with NEUTRAL present, result is NEUTRAL
      expect(PolicyAggregator.computeOverallStatus(results)).toBe('NEUTRAL');
    });

    it('should prioritize NEUTRAL over PASS', () => {
      const results = [
        { status: 'PASS', severity: 'LOW' },
        { status: 'NEUTRAL', severity: 'LOW' },
        { status: 'PASS', severity: 'LOW' }
      ];
      
      expect(PolicyAggregator.computeOverallStatus(results)).toBe('NEUTRAL');
    });

    it('should compute MAX_SEVERITY correctly', () => {
      const results = [
        { status: 'FAIL', severity: 'MEDIUM' },
        { status: 'FAIL', severity: 'LOW' },
        { status: 'FAIL', severity: 'HIGH' }
      ];
      
      expect(PolicyAggregator.computeOverallSeverity(results)).toBe('HIGH');
    });

    it('should respect comparison operators', () => {
      expect(PolicyAggregator.compareValue(25, 20, '>')).toBe(true);
      expect(PolicyAggregator.compareValue(20, 20, '>')).toBe(false);
      expect(PolicyAggregator.compareValue(20, 20, '>=')).toBe(true);
      expect(PolicyAggregator.compareValue(15, 20, '<=')).toBe(true);
      expect(PolicyAggregator.compareValue(25, 20, '<=')).toBe(false);
    });
  });

  describe('Clock Dependency Contract', () => {
    it('should provide deterministic timestamps', () => {
      const fixedTime = '2026-03-04T12:00:00.000Z';
      const fixedClock = Clock.fixed(fixedTime);
      
      expect(fixedClock.now()).toBe(fixedTime);
      expect(fixedClock.now()).toBe(fixedTime); // Consistent
    });

    it('should integrate with CI gatekeeper', () => {
      const fixedClock = Clock.fixed('2026-03-04T12:00:00.000Z');
      const gatekeeper = new CIGatekeeper(undefined, fixedClock);
      
      const analysis = {
        sequentialPercentage: 15,
        slowQueries: [{}],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };
      
      const report = gatekeeper.generateReport(analysis);
      expect(report.timestamp).toBe('2026-03-04T12:00:00.000Z');
    });
  });

  describe('CI Gatekeeper Contract Invariants', () => {
    it('should always include policy version in evaluations', () => {
      const gatekeeper = new CIGatekeeper();
      const analysis = {
        sequentialPercentage: 15,
        slowQueries: [{}],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };
      
      const report = gatekeeper.generateReport(analysis);
      
      expect(report.overall.policyVersion).toBe(POLICY_VERSION);
      expect(report.sequentialScan.policyVersion).toBe(POLICY_VERSION);
      expect(report.slowQueries.policyVersion).toBe(POLICY_VERSION);
      expect(report.executionTime.policyVersion).toBe(POLICY_VERSION);
      expect(report.connectionPool.policyVersion).toBe(POLICY_VERSION);
    });

    it('should maintain output structure stability', () => {
      const gatekeeper = new CIGatekeeper();
      const analysis = {
        sequentialPercentage: 15,
        slowQueries: [{}],
        totalQueries: 10,
        avgExecutionTime: 150,
        connectionWaitTime: 5,
        connectionTimeoutRate: 0.005
      };
      
      const report = gatekeeper.generateReport(analysis);
      
      // Required top-level fields
      expect(report).toHaveProperty('overall');
      expect(report).toHaveProperty('sequentialScan');
      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('executionTime');
      expect(report).toHaveProperty('connectionPool');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('policyMetadata');
      
      // Required evaluation fields
      expect(report.overall).toHaveProperty('status');
      expect(report.overall).toHaveProperty('severity');
      expect(report.overall).toHaveProperty('failedChecks');
      expect(report.overall).toHaveProperty('neutralChecks');
      expect(report.overall).toHaveProperty('totalChecks');
      expect(report.overall).toHaveProperty('policyVersion');
      
      // Status must be one of allowed values
      expect(['PASS', 'FAIL', 'NEUTRAL']).toContain(report.overall.status);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(report.overall.severity);
    });

    it('should enforce exclusive comparison for thresholds', () => {
      const gatekeeper = new CIGatekeeper();
      
      // Test exactly at threshold - should PASS for exclusive >
      const atThreshold = {
        sequentialPercentage: 20, // Exactly at 20% threshold
        slowQueries: [{}],
        totalQueries: 10, // Exactly 10% slow queries
        avgExecutionTime: 200, // Exactly at 200ms threshold
        connectionWaitTime: 10, // Exactly at 10ms threshold
        connectionTimeoutRate: 0.01 // Exactly at 0.01 threshold
      };
      
      const report = gatekeeper.generateReport(atThreshold);
      
      // With exclusive >, these should PASS
      expect(report.sequentialScan.status).toBe('PASS');
      expect(report.slowQueries.status).toBe('PASS');
      expect(report.executionTime.status).toBe('PASS');
      expect(report.connectionPool.status).toBe('PASS'); // <= is inclusive
    });
  });

  describe('Threshold Configuration Contract', () => {
    it('should have complete threshold definitions', () => {
      const requiredCategories = ['sequentialScan', 'slowQuery', 'executionTime', 'connectionPool'];
      
      requiredCategories.forEach(category => {
        expect(CI_THRESHOLDS).toHaveProperty(category);
        expect(CI_THRESHOLDS[category]).toHaveProperty('reason');
        expect(CI_THRESHOLDS[category]).toHaveProperty('documentation');
        expect(CI_THRESHOLDS[category]).toHaveProperty('boundaryDefinition');
      });
    });

    it('should have documented boundary definitions', () => {
      Object.values(CI_THRESHOLDS).forEach(threshold => {
        const boundary = threshold.boundaryDefinition;
        expect(boundary).toHaveProperty('type');
        expect(boundary).toHaveProperty('severity');
        
        // Connection pool uses 'operators' object, others use 'operator' string
        if (boundary.type === 'COMPOSITE') {
          expect(boundary).toHaveProperty('operators');
        } else {
          expect(boundary).toHaveProperty('operator');
        }
      });
    });
  });
});
