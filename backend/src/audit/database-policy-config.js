/**
 * Database Audit Policy Configuration
 * 
 * Purpose: Centralized, versioned policy definitions for CI gatekeeper
 * Design: Explicit boundary definitions with documented semantics
 * Versioning: Policy changes must increment version to prevent silent drift
 */

// Policy versioning for change tracking
export const POLICY_VERSION = "1.0.0";

// Boundary definition policy
export const BOUNDARY_POLICY = {
  PRECISION: 2, // Decimal places for percentage calculations
  TOLERANCE: 0.0001, // Floating point comparison tolerance
  COMPARISON: 'STRICT' // STRICT vs TOLERANT boundary evaluation
};

// Helper functions for deterministic boundary evaluation
export class PolicyMath {
  static normalizePercentage(value) {
    // Normalize to fixed precision to eliminate float drift
    return Math.round(value * Math.pow(10, BOUNDARY_POLICY.PRECISION)) / Math.pow(10, BOUNDARY_POLICY.PRECISION);
  }

  static compare(value, threshold, tolerance = BOUNDARY_POLICY.TOLERANCE) {
    if (BOUNDARY_POLICY.COMPARISON === 'TOLERANT') {
      return Math.abs(value - threshold) <= tolerance;
    }
    return value === threshold; // STRICT comparison
  }

  static isGreaterThan(value, threshold) {
    const normalizedValue = this.normalizePercentage(value);
    const normalizedThreshold = this.normalizePercentage(threshold);
    return normalizedValue > normalizedThreshold;
  }

  static isLessThanOrEqual(value, threshold) {
    const normalizedValue = this.normalizePercentage(value);
    const normalizedThreshold = this.normalizePercentage(threshold);
    return normalizedValue <= normalizedThreshold;
  }

  static calculatePercentage(numerator, denominator) {
    // Explicit semantic decision: zero activity is NEUTRAL, not a failure
    if (denominator === 0) {
      return 0; // Zero queries = zero percentage = neutral state
    }
    return this.normalizePercentage((numerator / denominator) * 100);
  }

  static isValidActivity(totalCount) {
    // Helper to determine if we have meaningful activity to evaluate
    return totalCount > 0;
  }
}

// Versioned CI thresholds with explicit documentation
export const CI_THRESHOLDS = {
  sequentialScan: {
    failPercent: 20,
    reason: 'More than 20% sequential scans indicates missing indexes in critical paths',
    documentation: 'https://wiki.company.com/database/performance-standards#sequential-scans',
    boundaryDefinition: {
      type: 'PERCENTAGE',
      operator: '>',
      severity: {
        medium: '20.1-30.0%',
        high: '>30.0%'
      }
    }
  },
  slowQuery: {
    failPercent: 10,
    thresholdMs: 100,
    reason: 'Queries >100ms should be <10% of total workload',
    documentation: 'https://wiki.company.com/database/performance-standards#slow-queries',
    boundaryDefinition: {
      type: 'PERCENTAGE',
      operator: '>',
      severity: {
        medium: '10.1-15.0%',
        high: '>15.0%'
      }
    }
  },
  executionTime: {
    failAvgMs: 200,
    reason: 'Average query time should remain under 200ms for user experience',
    documentation: 'https://wiki.company.com/database/performance-standards#execution-time',
    boundaryDefinition: {
      type: 'ABSOLUTE',
      operator: '>',
      unit: 'milliseconds',
      severity: {
        medium: '200.1-300.0ms',
        high: '>300.0ms'
      }
    }
  },
  connectionPool: {
    maxWaitTimeMs: 10,
    maxTimeoutRate: 0.01,
    reason: 'Connection pool should not become bottleneck',
    documentation: 'https://wiki.company.com/database/performance-standards#connection-pool',
    boundaryDefinition: {
      type: 'COMPOSITE',
      operators: {
        waitTime: '<=',
        timeoutRate: '<='
      },
      severity: {
        medium: 'One metric exceeded',
        high: 'Both metrics exceeded'
      }
    }
  }
};

// Policy metadata for compliance tracking
export const POLICY_METADATA = {
  version: POLICY_VERSION,
  lastUpdated: '2026-03-04',
  reviewCycle: 'Quarterly',
  approvalRequired: ['Database-Team', 'Performance-Team', 'SRE-Team'],
  complianceStandards: ['SOC2', 'ISO27001', 'GDPR-Article32'],
  changeManagement: {
    requiresVersionBump: true,
    requiresRetrocompatibilityCheck: true,
    requiresStakeholderApproval: true
  }
};
