/**
 * SYSTEM STATE MODEL
 * Core foundation for graceful failure and degraded modes
 * 
 * Defines the complete state taxonomy for the knowledge sharing platform
 * with precise degradation triggers and recovery conditions
 */

class SystemStateModel {
  constructor() {
    // Core system states - ordered from healthiest to most degraded
    this.SYSTEM_STATES = {
      FULL: {
        id: 'FULL',
        level: 0,
        description: 'All systems operational at 100% capacity',
        color: '#10B981', // green
        thresholds: {
          errorRate: 0.01, // 1%
          responseTime: 500, // ms
          availability: 99.9, // %
          cpuUsage: 70, // %
          memoryUsage: 80, // %
          dbConnections: 80 // % of pool
        },
        features: 'ALL',
        userExperience: 'OPTIMAL',
        dataIntegrity: 'FULL'
      },
      
      REDUCED: {
        id: 'REDUCED',
        level: 1,
        description: 'Non-critical features disabled, core functionality maintained',
        color: '#F59E0B', // amber
        thresholds: {
          errorRate: 0.05, // 5%
          responseTime: 1000, // ms
          availability: 99.0, // %
          cpuUsage: 80, // %
          memoryUsage: 85, // %
          dbConnections: 85 // % of pool
        },
        features: 'CORE_ONLY',
        userExperience: 'DEGRADED_ACCEPTABLE',
        dataIntegrity: 'FULL'
      },
      
      EMERGENCY: {
        id: 'EMERGENCY',
        level: 2,
        description: 'Only critical business functions available',
        color: '#EF4444', // red
        thresholds: {
          errorRate: 0.10, // 10%
          responseTime: 2000, // ms
          availability: 95.0, // %
          cpuUsage: 90, // %
          memoryUsage: 90, // %
          dbConnections: 90 // % of pool
        },
        features: 'CRITICAL_ONLY',
        userExperience: 'MINIMAL_FUNCTIONAL',
        dataIntegrity: 'PROTECTED'
      },
      
      SURVIVAL: {
        id: 'SURVIVAL',
        level: 3,
        description: 'Bare minimum functionality to keep system alive',
        color: '#DC2626', // dark red
        thresholds: {
          errorRate: 0.20, // 20%
          responseTime: 5000, // ms
          availability: 90.0, // %
          cpuUsage: 95, // %
          memoryUsage: 95, // %
          dbConnections: 95 // % of pool
        },
        features: 'SURVIVAL_ONLY',
        userExperience: 'BASIC_ACCESS',
        dataIntegrity: 'READ_ONLY_PROTECTED'
      },
      
      READ_ONLY: {
        id: 'READ_ONLY',
        level: 4,
        description: 'Read operations only, all writes disabled',
        color: '#7C3AED', // purple
        thresholds: {
          errorRate: 0.15, // 15%
          responseTime: 3000, // ms
          availability: 85.0, // %
          cpuUsage: 85, // %
          memoryUsage: 85, // %
          dbConnections: 80 // % of pool (read replicas only)
        },
        features: 'READ_ONLY',
        userExperience: 'VIEW_ONLY',
        dataIntegrity: 'FULLY_PROTECTED'
      },
      
      CORE_ONLY: {
        id: 'CORE_ONLY',
        level: 5,
        description: 'Only authentication and basic navigation available',
        color: '#6B7280', // gray
        thresholds: {
          errorRate: 0.30, // 30%
          responseTime: 10000, // ms
          availability: 75.0, // %
          cpuUsage: 98, // %
          memoryUsage: 98, // %
          dbConnections: 99 // % of pool
        },
        features: 'AUTH_ONLY',
        userExperience: 'LIMITED_ACCESS',
        dataIntegrity: 'PRESERVED'
      }
    };

    // State transition matrix - defines allowed transitions
    this.STATE_TRANSITIONS = {
      FULL: ['REDUCED', 'READ_ONLY'],
      REDUCED: ['FULL', 'EMERGENCY', 'READ_ONLY'],
      EMERGENCY: ['REDUCED', 'SURVIVAL', 'READ_ONLY'],
      SURVIVAL: ['EMERGENCY', 'CORE_ONLY'],
      READ_ONLY: ['FULL', 'REDUCED', 'EMERGENCY'],
      CORE_ONLY: ['SURVIVAL'] // Only can recover from here
    };

    // Dependency health states
    this.DEPENDENCY_STATES = {
      HEALTHY: 'HEALTHY',
      DEGRADED: 'DEGRADED',
      FAILING: 'FAILING',
      FAILED: 'FAILED',
      UNKNOWN: 'UNKNOWN'
    };

    // Critical system dependencies
    this.CRITICAL_DEPENDENCIES = {
      DATABASE: {
        name: 'DATABASE',
        priority: 1,
        impact: 'CRITICAL',
        failureModes: ['CONNECTION_EXHAUSTION', 'QUERY_TIMEOUTS', 'DEADLOCKS']
      },
      CACHE: {
        name: 'CACHE',
        priority: 2,
        impact: 'HIGH',
        failureModes: ['CACHE_MISS_STORM', 'MEMORY_EXHAUSTION', 'NETWORK_PARTITION']
      },
      AUTH_SERVICE: {
        name: 'AUTH_SERVICE',
        priority: 1,
        impact: 'CRITICAL',
        failureModes: ['TOKEN_VALIDATION_FAILURE', 'USER_DB_UNAVAILABLE']
      },
      FILE_STORAGE: {
        name: 'FILE_STORAGE',
        priority: 3,
        impact: 'MEDIUM',
        failureModes: ['UPLOAD_FAILURES', 'STORAGE_QUOTA_EXCEEDED']
      },
      NOTIFICATION_SERVICE: {
        name: 'NOTIFICATION_SERVICE',
        priority: 4,
        impact: 'LOW',
        failureModes: ['EMAIL_DELIVERY_FAILURE', 'PUSH_NOTIFICATION_FAILURE']
      },
      SEARCH_SERVICE: {
        name: 'SEARCH_SERVICE',
        priority: 3,
        impact: 'MEDIUM',
        failureModes: ['INDEX_OUT_OF_SYNC', 'SEARCH_TIMEOUTS']
      }
    };

    // Feature priority mapping
    this.FEATURE_PRIORITIES = {
      // Critical (Level 1) - Always available
      AUTHENTICATION: { priority: 1, essential: true },
      USER_SESSIONS: { priority: 1, essential: true },
      BASIC_NAVIGATION: { priority: 1, essential: true },
      
      // High (Level 2) - Available in most degraded states
      CONTENT_READING: { priority: 2, essential: true },
      USER_PROFILES: { priority: 2, essential: true },
      BASIC_SEARCH: { priority: 2, essential: true },
      
      // Medium (Level 3) - Disabled in emergency/survival modes
      CONTENT_CREATION: { priority: 3, essential: false },
      CONTENT_EDITING: { priority: 3, essential: false },
      COMMENTS: { priority: 3, essential: false },
      FILE_UPLOADS: { priority: 3, essential: false },
      
      // Low (Level 4) - First to be disabled
      NOTIFICATIONS: { priority: 4, essential: false },
      ANALYTICS: { priority: 4, essential: false },
      RECOMMENDATIONS: { priority: 4, essential: false },
      SOCIAL_FEATURES: { priority: 4, essential: false },
      REAL_TIME_FEATURES: { priority: 4, essential: false }
    };

    // Degradation triggers
    this.DEGRADATION_TRIGGERS = {
      // Performance-based triggers
      HIGH_ERROR_RATE: {
        condition: (metrics) => metrics.errorRate > this.getCurrentStateThresholds().errorRate,
        action: 'DEGRADE_STATE',
        severity: 'HIGH'
      },
      
      SLOW_RESPONSES: {
        condition: (metrics) => metrics.avgResponseTime > this.getCurrentStateThresholds().responseTime,
        action: 'DEGRADE_STATE',
        severity: 'MEDIUM'
      },
      
      RESOURCE_EXHAUSTION: {
        condition: (metrics) => 
          metrics.cpuUsage > this.getCurrentStateThresholds().cpuUsage ||
          metrics.memoryUsage > this.getCurrentStateThresholds().memoryUsage,
        action: 'DEGRADE_STATE',
        severity: 'HIGH'
      },
      
      // Dependency failure triggers
      CRITICAL_DEPENDENCY_FAILURE: {
        condition: (dependencies) => {
          return Object.entries(dependencies)
            .filter(([name]) => this.CRITICAL_DEPENDENCIES[name]?.impact === 'CRITICAL')
            .some(([, state]) => state === this.DEPENDENCY_STATES.FAILED);
        },
        action: 'EMERGENCY_DEGRADATION',
        severity: 'CRITICAL'
      },
      
      MULTIPLE_DEPENDENCY_FAILURES: {
        condition: (dependencies) => {
          const failedCount = Object.values(dependencies)
            .filter(state => state === this.DEPENDENCY_STATES.FAILED).length;
          return failedCount >= 2;
        },
        action: 'SURVIVAL_MODE',
        severity: 'CRITICAL'
      },
      
      // Manual triggers
      MANUAL_DEGRADATION: {
        condition: (manualTrigger) => manualTrigger.active,
        action: 'APPLY_MANUAL_STATE',
        severity: 'MANUAL'
      }
    };

    // Recovery conditions
    this.RECOVERY_CONDITIONS = {
      STABLE_METRICS: {
        condition: (metrics, duration) => {
          const thresholds = this.getPreviousStateThresholds();
          return metrics.errorRate < thresholds.errorRate * 0.8 &&
                 metrics.avgResponseTime < thresholds.responseTime * 0.8 &&
                 duration > 300000; // 5 minutes stable
        },
        action: 'CONSIDER_RECOVERY',
        severity: 'LOW'
      },
      
      DEPENDENCY_RECOVERY: {
        condition: (dependencies) => {
          return Object.entries(dependencies)
            .every(([, state]) => state !== this.DEPENDENCY_STATES.FAILED);
        },
        action: 'ENABLE_RECOVERY',
        severity: 'MEDIUM'
      }
    };
  }

  /**
   * Get current state thresholds
   */
  getCurrentStateThresholds() {
    // This would be replaced with actual current state from state manager
    return this.SYSTEM_STATES.FULL.thresholds;
  }

  /**
   * Get previous state thresholds for recovery
   */
  getPreviousStateThresholds() {
    // This would be replaced with actual previous state logic
    return this.SYSTEM_STATES.REDUCED.thresholds;
  }

  /**
   * Determine if state transition is allowed
   */
  isTransitionAllowed(fromState, toState) {
    return this.STATE_TRANSITIONS[fromState]?.includes(toState) || false;
  }

  /**
   * Get features available for a given state
   */
  getAvailableFeatures(state) {
    const stateConfig = this.SYSTEM_STATES[state];
    if (!stateConfig) return [];

    switch (stateConfig.features) {
      case 'ALL':
        return Object.keys(this.FEATURE_PRIORITIES);
      case 'CORE_ONLY':
        return Object.entries(this.FEATURE_PRIORITIES)
          .filter(([, config]) => config.priority <= 2)
          .map(([name]) => name);
      case 'CRITICAL_ONLY':
        return Object.entries(this.FEATURE_PRIORITIES)
          .filter(([, config]) => config.priority <= 1)
          .map(([name]) => name);
      case 'SURVIVAL_ONLY':
        return ['AUTHENTICATION', 'USER_SESSIONS', 'BASIC_NAVIGATION'];
      case 'READ_ONLY':
        return Object.entries(this.FEATURE_PRIORITIES)
          .filter(([, config]) => config.priority <= 2)
          .map(([name]) => name)
          .filter(name => !name.includes('CREATION') && !name.includes('EDITING'));
      case 'AUTH_ONLY':
        return ['AUTHENTICATION', 'USER_SESSIONS', 'BASIC_NAVIGATION'];
      default:
        return [];
    }
  }

  /**
   * Calculate system health score
   */
  calculateHealthScore(metrics, dependencies) {
    let score = 100;
    
    // Deduct for high error rate
    if (metrics.errorRate > 0.01) {
      score -= Math.min(metrics.errorRate * 100, 30);
    }
    
    // Deduct for slow responses
    if (metrics.avgResponseTime > 500) {
      score -= Math.min((metrics.avgResponseTime - 500) / 50, 20);
    }
    
    // Deduct for resource usage
    if (metrics.cpuUsage > 70) {
      score -= Math.min((metrics.cpuUsage - 70) / 2, 15);
    }
    
    if (metrics.memoryUsage > 80) {
      score -= Math.min((metrics.memoryUsage - 80) / 2, 15);
    }
    
    // Deduct for dependency failures
    const failedDeps = Object.values(dependencies)
      .filter(state => state === this.DEPENDENCY_STATES.FAILED).length;
    score -= failedDeps * 10;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Get degradation recommendations based on current state
   */
  getDegradationRecommendations(currentState, metrics, dependencies) {
    const recommendations = [];
    const stateConfig = this.SYSTEM_STATES[currentState];
    
    if (!stateConfig) return recommendations;

    // Check if we should degrade further
    Object.entries(this.DEGRADATION_TRIGGERS).forEach(([triggerName, trigger]) => {
      let shouldTrigger = false;
      
      if (triggerName.includes('METRICS')) {
        shouldTrigger = trigger.condition(metrics);
      } else if (triggerName.includes('DEPENDENCY')) {
        shouldTrigger = trigger.condition(dependencies);
      }
      
      if (shouldTrigger) {
        recommendations.push({
          trigger: triggerName,
          action: trigger.action,
          severity: trigger.severity,
          reason: `Trigger ${triggerName} activated`
        });
      }
    });
    
    return recommendations;
  }
}

export default SystemStateModel;
