/**
 * FEATURE DEGRADATION MATRIX
 * Manages feature priority mapping, dependencies, and kill-switches
 * 
 * Provides intelligent feature degradation based on system state,
 * business impact, and user experience considerations
 */

import EventEmitter from 'events';

class FeatureMatrix extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.configManager = dependencies.configManager;
    this.metricsCollector = dependencies.metricsCollector;
    
    // Feature registry with complete metadata
    this.featureRegistry = new Map();
    this.featureStates = new Map();
    this.killSwitches = new Map();
    this.dependencyGraph = new Map();
    this.usageMetrics = new Map();
    
    // Initialize the feature matrix
    this.initializeFeatureRegistry();
    this.initializeDependencyGraph();
    this.initializeKillSwitches();
    
    // Runtime state
    this.lastEvaluation = Date.now();
    this.evaluationInterval = 60000; // 1 minute
    this.isEvaluating = false;
  }

  /**
   * Initialize the complete feature registry
   */
  initializeFeatureRegistry() {
    const features = {
      // CRITICAL FEATURES (Priority 1) - Always available
      AUTHENTICATION: {
        id: 'AUTHENTICATION',
        name: 'User Authentication',
        priority: 1,
        essential: true,
        businessImpact: 'CRITICAL',
        userExperienceImpact: 'CRITICAL',
        resourceCost: 'LOW',
        dependencies: ['DATABASE', 'AUTH_SERVICE'],
        endpoints: ['/api/auth/login', '/api/auth/register', '/api/auth/logout'],
        gracefulFallback: 'basic_auth_only',
        killSwitchEnabled: false,
        metrics: {
          usage: 'HIGH',
          errorRate: 'LOW',
          responseTime: 'FAST'
        }
      },
      
      USER_SESSIONS: {
        id: 'USER_SESSIONS',
        name: 'User Session Management',
        priority: 1,
        essential: true,
        businessImpact: 'CRITICAL',
        userExperienceImpact: 'CRITICAL',
        resourceCost: 'LOW',
        dependencies: ['DATABASE', 'CACHE'],
        endpoints: ['/api/session/*'],
        gracefulFallback: 'stateless_sessions',
        killSwitchEnabled: false,
        metrics: {
          usage: 'HIGH',
          errorRate: 'LOW',
          responseTime: 'FAST'
        }
      },
      
      BASIC_NAVIGATION: {
        id: 'BASIC_NAVIGATION',
        name: 'Basic Navigation',
        priority: 1,
        essential: true,
        businessImpact: 'CRITICAL',
        userExperienceImpact: 'CRITICAL',
        resourceCost: 'MINIMAL',
        dependencies: [],
        endpoints: ['/api/navigation/*'],
        gracefulFallback: 'static_navigation',
        killSwitchEnabled: false,
        metrics: {
          usage: 'HIGH',
          errorRate: 'MINIMAL',
          responseTime: 'INSTANT'
        }
      },
      
      // HIGH PRIORITY FEATURES (Priority 2) - Available in most degraded states
      CONTENT_READING: {
        id: 'CONTENT_READING',
        name: 'Content Reading',
        priority: 2,
        essential: true,
        businessImpact: 'HIGH',
        userExperienceImpact: 'HIGH',
        resourceCost: 'MEDIUM',
        dependencies: ['DATABASE', 'CACHE'],
        endpoints: ['/api/content/*', '/api/posts/*'],
        gracefulFallback: 'cached_content_only',
        killSwitchEnabled: false,
        metrics: {
          usage: 'VERY_HIGH',
          errorRate: 'LOW',
          responseTime: 'MEDIUM'
        }
      },
      
      USER_PROFILES: {
        id: 'USER_PROFILES',
        name: 'User Profiles',
        priority: 2,
        essential: true,
        businessImpact: 'HIGH',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'MEDIUM',
        dependencies: ['DATABASE', 'CACHE'],
        endpoints: ['/api/users/*', '/api/profile/*'],
        gracefulFallback: 'basic_profiles_only',
        killSwitchEnabled: false,
        metrics: {
          usage: 'HIGH',
          errorRate: 'LOW',
          responseTime: 'MEDIUM'
        }
      },
      
      BASIC_SEARCH: {
        id: 'BASIC_SEARCH',
        name: 'Basic Search',
        priority: 2,
        essential: true,
        businessImpact: 'HIGH',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'HIGH',
        dependencies: ['SEARCH_SERVICE', 'DATABASE'],
        endpoints: ['/api/search'],
        gracefulFallback: 'database_search_only',
        killSwitchEnabled: true,
        metrics: {
          usage: 'HIGH',
          errorRate: 'MEDIUM',
          responseTime: 'SLOW'
        }
      },
      
      // MEDIUM PRIORITY FEATURES (Priority 3) - Disabled in emergency/survival modes
      CONTENT_CREATION: {
        id: 'CONTENT_CREATION',
        name: 'Content Creation',
        priority: 3,
        essential: false,
        businessImpact: 'MEDIUM',
        userExperienceImpact: 'HIGH',
        resourceCost: 'HIGH',
        dependencies: ['DATABASE', 'FILE_STORAGE', 'NOTIFICATION_SERVICE'],
        endpoints: ['/api/content/create', '/api/posts/create'],
        gracefulFallback: 'queue_for_later',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'MEDIUM',
          responseTime: 'SLOW'
        }
      },
      
      CONTENT_EDITING: {
        id: 'CONTENT_EDITING',
        name: 'Content Editing',
        priority: 3,
        essential: false,
        businessImpact: 'MEDIUM',
        userExperienceImpact: 'HIGH',
        resourceCost: 'HIGH',
        dependencies: ['DATABASE', 'FILE_STORAGE'],
        endpoints: ['/api/content/edit', '/api/posts/edit'],
        gracefulFallback: 'edit_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'MEDIUM',
          responseTime: 'SLOW'
        }
      },
      
      COMMENTS: {
        id: 'COMMENTS',
        name: 'Comments System',
        priority: 3,
        essential: false,
        businessImpact: 'MEDIUM',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'MEDIUM',
        dependencies: ['DATABASE', 'NOTIFICATION_SERVICE'],
        endpoints: ['/api/comments/*'],
        gracefulFallback: 'comments_readonly',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'MEDIUM',
          responseTime: 'MEDIUM'
        }
      },
      
      FILE_UPLOADS: {
        id: 'FILE_UPLOADS',
        name: 'File Uploads',
        priority: 3,
        essential: false,
        businessImpact: 'MEDIUM',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'VERY_HIGH',
        dependencies: ['FILE_STORAGE', 'DATABASE'],
        endpoints: ['/api/upload/*'],
        gracefulFallback: 'upload_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'HIGH',
          responseTime: 'VERY_SLOW'
        }
      },
      
      // LOW PRIORITY FEATURES (Priority 4) - First to be disabled
      NOTIFICATIONS: {
        id: 'NOTIFICATIONS',
        name: 'Notification System',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'MEDIUM',
        dependencies: ['NOTIFICATION_SERVICE', 'DATABASE'],
        endpoints: ['/api/notifications/*'],
        gracefulFallback: 'notifications_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'MEDIUM',
          responseTime: 'MEDIUM'
        }
      },
      
      ANALYTICS: {
        id: 'ANALYTICS',
        name: 'Analytics System',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'LOW',
        resourceCost: 'HIGH',
        dependencies: ['DATABASE'],
        endpoints: ['/api/analytics/*'],
        gracefulFallback: 'analytics_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'LOW',
          errorRate: 'LOW',
          responseTime: 'SLOW'
        }
      },
      
      RECOMMENDATIONS: {
        id: 'RECOMMENDATIONS',
        name: 'Content Recommendations',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'VERY_HIGH',
        dependencies: ['DATABASE', 'SEARCH_SERVICE', 'ML_SERVICE'],
        endpoints: ['/api/recommendations/*'],
        gracefulFallback: 'trending_only',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'HIGH',
          responseTime: 'VERY_SLOW'
        }
      },
      
      SOCIAL_FEATURES: {
        id: 'SOCIAL_FEATURES',
        name: 'Social Features',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'HIGH',
        dependencies: ['DATABASE', 'NOTIFICATION_SERVICE'],
        endpoints: ['/api/social/*', '/api/follow/*', '/api/like/*'],
        gracefulFallback: 'social_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'MEDIUM',
          errorRate: 'MEDIUM',
          responseTime: 'MEDIUM'
        }
      },
      
      REAL_TIME_FEATURES: {
        id: 'REAL_TIME_FEATURES',
        name: 'Real-time Features',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'HIGH',
        resourceCost: 'VERY_HIGH',
        dependencies: ['WEBSOCKET_SERVICE', 'DATABASE', 'CACHE'],
        endpoints: ['/api/realtime/*', '/socket.io/*'],
        gracefulFallback: 'realtime_disabled',
        killSwitchEnabled: true,
        metrics: {
          usage: 'LOW',
          errorRate: 'HIGH',
          responseTime: 'FAST'
        }
      },
      
      ADVANCED_SEARCH: {
        id: 'ADVANCED_SEARCH',
        name: 'Advanced Search',
        priority: 4,
        essential: false,
        businessImpact: 'LOW',
        userExperienceImpact: 'MEDIUM',
        resourceCost: 'VERY_HIGH',
        dependencies: ['SEARCH_SERVICE', 'DATABASE', 'ML_SERVICE'],
        endpoints: ['/api/search/advanced'],
        gracefulFallback: 'basic_search_only',
        killSwitchEnabled: true,
        metrics: {
          usage: 'LOW',
          errorRate: 'HIGH',
          responseTime: 'VERY_SLOW'
        }
      }
    };

    // Register all features
    Object.entries(features).forEach(([id, config]) => {
      this.featureRegistry.set(id, config);
      this.featureStates.set(id, 'ENABLED');
    });
  }

  /**
   * Initialize dependency graph
   */
  initializeDependencyGraph() {
    // Build dependency relationships
    this.featureRegistry.forEach((feature, featureId) => {
      this.dependencyGraph.set(featureId, feature.dependencies || []);
    });
  }

  /**
   * Initialize kill switches
   */
  initializeKillSwitches() {
    this.featureRegistry.forEach((feature, featureId) => {
      if (feature.killSwitchEnabled) {
        this.killSwitches.set(featureId, {
          active: false,
          reason: null,
          activatedAt: null,
          activatedBy: null,
          autoDeactivate: true,
          cooldownPeriod: 300000 // 5 minutes
        });
      }
    });
  }

  /**
   * Evaluate feature degradation based on system state
   */
  async evaluateFeatureDegradation(systemState, systemMetrics, dependencyHealth) {
    if (this.isEvaluating) {
      return;
    }

    this.isEvaluating = true;
    
    try {
      const evaluation = await this.performFeatureEvaluation(systemState, systemMetrics, dependencyHealth);
      await this.applyFeatureChanges(evaluation.changes);
      
      this.lastEvaluation = Date.now();
      this.emit('evaluationCompleted', evaluation);
      
      return evaluation;
    } catch (error) {
      this.logger.error('Feature evaluation failed:', error);
      this.emit('evaluationFailed', error);
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Perform detailed feature evaluation
   */
  async performFeatureEvaluation(systemState, systemMetrics, dependencyHealth) {
    const changes = [];
    const maxPriority = this.getMaxPriorityForState(systemState);
    
    // Evaluate each feature
    for (const [featureId, feature] of this.featureRegistry) {
      const currentState = this.featureStates.get(featureId);
      const shouldEnable = this.shouldFeatureBeEnabled(feature, systemState, maxPriority, systemMetrics, dependencyHealth);
      
      if (shouldEnable && currentState === 'DISABLED') {
        changes.push({
          featureId,
          action: 'ENABLE',
          reason: 'System conditions improved',
          priority: feature.priority
        });
      } else if (!shouldEnable && currentState === 'ENABLED') {
        changes.push({
          featureId,
          action: 'DISABLE',
          reason: this.getDisableReason(feature, systemState, systemMetrics, dependencyHealth),
          priority: feature.priority
        });
      }
    }
    
    // Sort changes by priority (higher priority features first)
    changes.sort((a, b) => b.priority - a.priority);
    
    return {
      timestamp: Date.now(),
      systemState,
      maxPriority,
      totalFeatures: this.featureRegistry.size,
      enabledFeatures: Array.from(this.featureStates.entries()).filter(([, state]) => state === 'ENABLED').length,
      changes,
      dependencyHealth
    };
  }

  /**
   * Determine if a feature should be enabled
   */
  shouldFeatureBeEnabled(feature, systemState, maxPriority, systemMetrics, dependencyHealth) {
    // Check priority
    if (feature.priority > maxPriority) {
      return false;
    }
    
    // Check kill switch
    const killSwitch = this.killSwitches.get(feature.id);
    if (killSwitch && killSwitch.active) {
      return false;
    }
    
    // Check dependencies
    if (!this.areDependenciesHealthy(feature.dependencies, dependencyHealth)) {
      return false;
    }
    
    // Check resource constraints
    if (!this.checkResourceConstraints(feature, systemMetrics)) {
      return false;
    }
    
    // Check error rates
    if (!this.checkErrorRates(feature, systemMetrics)) {
      return false;
    }
    
    return true;
  }

  /**
   * Get maximum priority allowed for a system state
   */
  getMaxPriorityForState(systemState) {
    const statePriorities = {
      FULL: 4,      // All features
      REDUCED: 3,   // Up to medium priority
      EMERGENCY: 2, // Up to high priority
      SURVIVAL: 1,  // Only critical
      READ_ONLY: 2, // Up to high priority (read-only)
      CORE_ONLY: 1  // Only critical
    };
    
    return statePriorities[systemState] || 1;
  }

  /**
   * Check if dependencies are healthy
   */
  areDependenciesHealthy(dependencies, dependencyHealth) {
    if (!dependencies || dependencies.length === 0) {
      return true;
    }
    
    return dependencies.every(dep => {
      const health = dependencyHealth[dep];
      return health && health !== 'FAILED';
    });
  }

  /**
   * Check resource constraints for a feature
   */
  checkResourceConstraints(feature, systemMetrics) {
    const resourceLimits = {
      MINIMAL: { cpu: 95, memory: 95 },
      LOW: { cpu: 90, memory: 90 },
      MEDIUM: { cpu: 85, memory: 85 },
      HIGH: { cpu: 80, memory: 80 },
      VERY_HIGH: { cpu: 70, memory: 75 }
    };
    
    const limits = resourceLimits[feature.resourceCost] || resourceLimits.MEDIUM;
    
    return systemMetrics.cpuUsage < limits.cpu && 
           systemMetrics.memoryUsage < limits.memory;
  }

  /**
   * Check error rates for a feature
   */
  checkErrorRates(feature, systemMetrics) {
    // This would check feature-specific error rates
    // For now, use global error rate as a proxy
    const errorRateThresholds = {
      MINIMAL: 0.50, // 50%
      LOW: 0.30,     // 30%
      MEDIUM: 0.20,  // 20%
      HIGH: 0.15,    // 15%
      VERY_HIGH: 0.10 // 10%
    };
    
    const threshold = errorRateThresholds[feature.metrics.errorRate] || 0.20;
    return systemMetrics.errorRate < threshold;
  }

  /**
   * Get reason for disabling a feature
   */
  getDisableReason(feature, systemState, systemMetrics, dependencyHealth) {
    const maxPriority = this.getMaxPriorityForState(systemState);
    
    if (feature.priority > maxPriority) {
      return `Priority ${feature.priority} exceeds maximum ${maxPriority} for ${systemState} state`;
    }
    
    const killSwitch = this.killSwitches.get(feature.id);
    if (killSwitch && killSwitch.active) {
      return `Kill switch activated: ${killSwitch.reason}`;
    }
    
    if (!this.areDependenciesHealthy(feature.dependencies, dependencyHealth)) {
      const failedDeps = feature.dependencies.filter(dep => 
        dependencyHealth[dep] === 'FAILED'
      );
      return `Dependencies failed: ${failedDeps.join(', ')}`;
    }
    
    if (!this.checkResourceConstraints(feature, systemMetrics)) {
      return 'Resource constraints exceeded';
    }
    
    if (!this.checkErrorRates(feature, systemMetrics)) {
      return 'Error rate threshold exceeded';
    }
    
    return 'Unknown reason';
  }

  /**
   * Apply feature changes
   */
  async applyFeatureChanges(changes) {
    for (const change of changes) {
      try {
        if (change.action === 'ENABLE') {
          await this.enableFeature(change.featureId, change.reason);
        } else if (change.action === 'DISABLE') {
          await this.disableFeature(change.featureId, change.reason);
        }
      } catch (error) {
        this.logger.error(`Failed to ${change.action.toLowerCase()} feature ${change.featureId}:`, error);
      }
    }
  }

  /**
   * Enable a feature
   */
  async enableFeature(featureId, reason = 'Manual enable') {
    const feature = this.featureRegistry.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    this.featureStates.set(featureId, 'ENABLED');
    this.emit('featureEnabled', { featureId, reason, feature });
    this.logger.info(`Feature enabled: ${featureId} - ${reason}`);
  }

  /**
   * Disable a feature
   */
  async disableFeature(featureId, reason = 'Manual disable') {
    const feature = this.featureRegistry.get(featureId);
    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }
    
    // Check for dependent features
    const dependentFeatures = this.findDependentFeatures(featureId);
    if (dependentFeatures.length > 0) {
      this.logger.warn(`Disabling ${featureId} will affect dependent features: ${dependentFeatures.join(', ')}`);
    }
    
    this.featureStates.set(featureId, 'DISABLED');
    this.emit('featureDisabled', { featureId, reason, feature, dependentFeatures });
    this.logger.info(`Feature disabled: ${featureId} - ${reason}`);
  }

  /**
   * Activate kill switch for a feature
   */
  async activateKillSwitch(featureId, reason = 'Manual kill switch', activatedBy = 'system') {
    const killSwitch = this.killSwitches.get(featureId);
    if (!killSwitch) {
      throw new Error(`Kill switch not available for feature ${featureId}`);
    }
    
    killSwitch.active = true;
    killSwitch.reason = reason;
    killSwitch.activatedAt = Date.now();
    killSwitch.activatedBy = activatedBy;
    
    await this.disableFeature(featureId, `Kill switch: ${reason}`);
    
    this.emit('killSwitchActivated', { featureId, reason, activatedBy });
    this.logger.warn(`Kill switch activated: ${featureId} - ${reason}`);
  }

  /**
   * Deactivate kill switch for a feature
   */
  async deactivateKillSwitch(featureId, deactivatedBy = 'system') {
    const killSwitch = this.killSwitches.get(featureId);
    if (!killSwitch || !killSwitch.active) {
      return;
    }
    
    // Check cooldown period
    const timeSinceActivation = Date.now() - killSwitch.activatedAt;
    if (timeSinceActivation < killSwitch.cooldownPeriod && killSwitch.autoDeactivate) {
      this.logger.warn(`Kill switch cooldown active for ${featureId}`);
      return;
    }
    
    killSwitch.active = false;
    killSwitch.reason = null;
    killSwitch.activatedAt = null;
    killSwitch.activatedBy = null;
    
    await this.enableFeature(featureId, 'Kill switch deactivated');
    
    this.emit('killSwitchDeactivated', { featureId, deactivatedBy });
    this.logger.info(`Kill switch deactivated: ${featureId}`);
  }

  /**
   * Find features that depend on a given feature
   */
  findDependentFeatures(featureId) {
    const dependents = [];
    
    this.dependencyGraph.forEach((deps, id) => {
      if (deps.includes(featureId) && this.featureStates.get(id) === 'ENABLED') {
        dependents.push(id);
      }
    });
    
    return dependents;
  }

  /**
   * Get feature status report
   */
  getFeatureStatusReport() {
    const report = {
      timestamp: Date.now(),
      totalFeatures: this.featureRegistry.size,
      enabledFeatures: 0,
      disabledFeatures: 0,
      featuresByPriority: { 1: 0, 2: 0, 3: 0, 4: 0 },
      activeKillSwitches: 0,
      features: []
    };
    
    this.featureRegistry.forEach((feature, id) => {
      const state = this.featureStates.get(id);
      const killSwitch = this.killSwitches.get(id);
      
      if (state === 'ENABLED') {
        report.enabledFeatures++;
      } else {
        report.disabledFeatures++;
      }
      
      report.featuresByPriority[feature.priority]++;
      
      if (killSwitch && killSwitch.active) {
        report.activeKillSwitches++;
      }
      
      report.features.push({
        id,
        name: feature.name,
        priority: feature.priority,
        state,
        essential: feature.essential,
        killSwitchActive: killSwitch?.active || false,
        dependencies: feature.dependencies
      });
    });
    
    return report;
  }

  /**
   * Get feature by ID
   */
  getFeature(featureId) {
    return this.featureRegistry.get(featureId);
  }

  /**
   * Get feature state
   */
  getFeatureState(featureId) {
    return this.featureStates.get(featureId);
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureId) {
    return this.featureStates.get(featureId) === 'ENABLED';
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures() {
    return Array.from(this.featureStates.entries())
      .filter(([, state]) => state === 'ENABLED')
      .map(([id]) => this.featureRegistry.get(id));
  }

  /**
   * Start continuous evaluation
   */
  startEvaluation() {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    
    this.evaluationTimer = setInterval(() => {
      // This would be called by the system state manager
      // with current system state and metrics
    }, this.evaluationInterval);
  }

  /**
   * Stop continuous evaluation
   */
  stopEvaluation() {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = null;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.stopEvaluation();
    this.logger.info('FeatureMatrix shutdown complete');
  }
}

export default FeatureMatrix;
