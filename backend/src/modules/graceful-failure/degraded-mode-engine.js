/**
 * DEGRADED MODE ENGINE
 * Implements the 6 operational modes with intelligent state transitions
 * 
 * Manages system behavior across different degradation levels while maintaining
 * service availability and protecting core business functions
 */

import EventEmitter from 'events';
import SystemStateModel from './system-state-model.js';

class DegradedModeEngine extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.stateModel = new SystemStateModel();
    this.logger = dependencies.logger || console;
    this.metricsCollector = dependencies.metricsCollector;
    this.configManager = dependencies.configManager;
    
    // Current system state
    this.currentState = 'FULL';
    this.previousState = null;
    this.stateHistory = [];
    this.lastStateChange = Date.now();
    
    // Mode configurations
    this.modeConfigurations = {
      FULL: {
        name: 'Full Operation',
        description: 'All systems operational at 100% capacity',
        allowedOperations: ['READ', 'WRITE', 'DELETE', 'SEARCH', 'UPLOAD', 'NOTIFY'],
        rateLimits: {
          authenticated: 1000, // requests per minute
          anonymous: 100,
          premium: 2000
        },
        features: {
          contentCreation: true,
          contentEditing: true,
          comments: true,
          fileUploads: true,
          notifications: true,
          analytics: true,
          recommendations: true,
          socialFeatures: true,
          realTimeFeatures: true,
          advancedSearch: true
        },
        caching: {
          enabled: true,
          ttl: 300, // 5 minutes
          aggressive: false
        },
        database: {
          readOnly: false,
          connectionPool: 'full',
          queryTimeout: 5000
        }
      },
      
      REDUCED: {
        name: 'Reduced Operation',
        description: 'Non-critical features disabled, core functionality maintained',
        allowedOperations: ['READ', 'WRITE', 'SEARCH'],
        rateLimits: {
          authenticated: 500,
          anonymous: 50,
          premium: 1000
        },
        features: {
          contentCreation: true,
          contentEditing: true,
          comments: false,
          fileUploads: false,
          notifications: false,
          analytics: false,
          recommendations: false,
          socialFeatures: false,
          realTimeFeatures: false,
          advancedSearch: true
        },
        caching: {
          enabled: true,
          ttl: 600, // 10 minutes
          aggressive: true
        },
        database: {
          readOnly: false,
          connectionPool: 'reduced',
          queryTimeout: 8000
        }
      },
      
      EMERGENCY: {
        name: 'Emergency Mode',
        description: 'Only critical business functions available',
        allowedOperations: ['READ', 'LIMITED_WRITE'],
        rateLimits: {
          authenticated: 200,
          anonymous: 20,
          premium: 400
        },
        features: {
          contentCreation: false,
          contentEditing: false,
          comments: false,
          fileUploads: false,
          notifications: false,
          analytics: false,
          recommendations: false,
          socialFeatures: false,
          realTimeFeatures: false,
          advancedSearch: false
        },
        caching: {
          enabled: true,
          ttl: 1800, // 30 minutes
          aggressive: true
        },
        database: {
          readOnly: false,
          connectionPool: 'minimal',
          queryTimeout: 12000
        }
      },
      
      SURVIVAL: {
        name: 'Survival Mode',
        description: 'Bare minimum functionality to keep system alive',
        allowedOperations: ['READ'],
        rateLimits: {
          authenticated: 50,
          anonymous: 10,
          premium: 100
        },
        features: {
          contentCreation: false,
          contentEditing: false,
          comments: false,
          fileUploads: false,
          notifications: false,
          analytics: false,
          recommendations: false,
          socialFeatures: false,
          realTimeFeatures: false,
          advancedSearch: false
        },
        caching: {
          enabled: true,
          ttl: 3600, // 1 hour
          aggressive: true
        },
        database: {
          readOnly: true,
          connectionPool: 'survival',
          queryTimeout: 20000
        }
      },
      
      READ_ONLY: {
        name: 'Read-Only Mode',
        description: 'Read operations only, all writes disabled',
        allowedOperations: ['READ'],
        rateLimits: {
          authenticated: 300,
          anonymous: 30,
          premium: 600
        },
        features: {
          contentCreation: false,
          contentEditing: false,
          comments: false,
          fileUploads: false,
          notifications: false,
          analytics: false,
          recommendations: false,
          socialFeatures: false,
          realTimeFeatures: false,
          advancedSearch: true
        },
        caching: {
          enabled: true,
          ttl: 1800, // 30 minutes
          aggressive: true
        },
        database: {
          readOnly: true,
          connectionPool: 'read_replicas',
          queryTimeout: 10000
        }
      },
      
      CORE_ONLY: {
        name: 'Core-Only Mode',
        description: 'Only authentication and basic navigation available',
        allowedOperations: ['AUTH', 'NAVIGATION'],
        rateLimits: {
          authenticated: 20,
          anonymous: 5,
          premium: 40
        },
        features: {
          contentCreation: false,
          contentEditing: false,
          comments: false,
          fileUploads: false,
          notifications: false,
          analytics: false,
          recommendations: false,
          socialFeatures: false,
          realTimeFeatures: false,
          advancedSearch: false
        },
        caching: {
          enabled: true,
          ttl: 7200, // 2 hours
          aggressive: true
        },
        database: {
          readOnly: true,
          connectionPool: 'minimal',
          queryTimeout: 30000
        }
      }
    };

    // State transition cooldowns to prevent flapping
    this.transitionCooldowns = {
      FULL: 60000, // 1 minute
      REDUCED: 120000, // 2 minutes
      EMERGENCY: 300000, // 5 minutes
      SURVIVAL: 600000, // 10 minutes
      READ_ONLY: 180000, // 3 minutes
      CORE_ONLY: 900000 // 15 minutes
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the degraded mode engine
   */
  async initialize() {
    this.logger.info('DegradedModeEngine initializing...');
    
    // Load previous state if available
    await this.loadPersistedState();
    
    // Start monitoring
    this.startMonitoring();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    this.logger.info(`DegradedModeEngine initialized in ${this.currentState} mode`);
    this.emit('initialized', { state: this.currentState });
  }

  /**
   * Transition to a new degraded mode
   */
  async transitionTo(newState, reason = 'manual', metadata = {}) {
    // Validate transition
    if (!this.stateModel.isTransitionAllowed(this.currentState, newState)) {
      throw new Error(`Transition from ${this.currentState} to ${newState} is not allowed`);
    }

    // Check cooldown
    const timeSinceLastChange = Date.now() - this.lastStateChange;
    const cooldownPeriod = this.transitionCooldowns[this.currentState] || 60000;
    
    if (timeSinceLastChange < cooldownPeriod && reason !== 'manual') {
      this.logger.warn(`State transition blocked by cooldown: ${this.currentState} -> ${newState}`);
      return false;
    }

    const previousState = this.currentState;
    
    try {
      // Execute transition
      await this.executeStateTransition(newState, previousState);
      
      // Update state
      this.previousState = previousState;
      this.currentState = newState;
      this.lastStateChange = Date.now();
      
      // Record in history
      this.stateHistory.push({
        from: previousState,
        to: newState,
        timestamp: Date.now(),
        reason,
        metadata
      });
      
      // Persist state
      await this.persistState();
      
      // Emit events
      this.emit('stateChanged', {
        from: previousState,
        to: newState,
        reason,
        metadata
      });
      
      this.logger.info(`System transitioned: ${previousState} -> ${newState} (${reason})`);
      
      return true;
    } catch (error) {
      this.logger.error(`State transition failed: ${previousState} -> ${newState}`, error);
      this.emit('transitionFailed', {
        from: previousState,
        to: newState,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Execute the actual state transition logic
   */
  async executeStateTransition(newState, previousState) {
    const newConfig = this.modeConfigurations[newState];
    const oldConfig = this.modeConfigurations[previousState];
    
    // Pre-transition hooks
    await this.executePreTransitionHooks(newState, previousState);
    
    // Apply new configuration
    await this.applyModeConfiguration(newConfig);
    
    // Post-transition hooks
    await this.executePostTransitionHooks(newState, previousState);
  }

  /**
   * Apply mode configuration to system components
   */
  async applyModeConfiguration(config) {
    // Update rate limits
    await this.updateRateLimits(config.rateLimits);
    
    // Update feature flags
    await this.updateFeatureFlags(config.features);
    
    // Update caching configuration
    await this.updateCachingConfig(config.caching);
    
    // Update database configuration
    await this.updateDatabaseConfig(config.database);
    
    // Update allowed operations
    await this.updateAllowedOperations(config.allowedOperations);
  }

  /**
   * Check if an operation is allowed in current mode
   */
  isOperationAllowed(operation, userTier = 'authenticated') {
    const config = this.modeConfigurations[this.currentState];
    
    if (!config.allowedOperations.includes(operation)) {
      return false;
    }
    
    // Check rate limits
    return this.checkRateLimit(userTier);
  }

  /**
   * Check if a feature is enabled in current mode
   */
  isFeatureEnabled(feature) {
    const config = this.modeConfigurations[this.currentState];
    return config.features[feature] || false;
  }

  /**
   * Get current mode configuration
   */
  getCurrentModeConfig() {
    return this.modeConfigurations[this.currentState];
  }

  /**
   * Get system health assessment
   */
  getHealthAssessment() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      timeInCurrentState: Date.now() - this.lastStateChange,
      stateHistory: this.stateHistory.slice(-10), // Last 10 transitions
      availableFeatures: this.getAvailableFeatures(),
      allowedOperations: this.modeConfigurations[this.currentState].allowedOperations,
      healthScore: this.calculateHealthScore(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get available features in current mode
   */
  getAvailableFeatures() {
    const config = this.modeConfigurations[this.currentState];
    return Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
  }

  /**
   * Calculate health score based on current state and metrics
   */
  calculateHealthScore() {
    const stateScores = {
      FULL: 100,
      REDUCED: 80,
      EMERGENCY: 60,
      SURVIVAL: 40,
      READ_ONLY: 50,
      CORE_ONLY: 20
    };
    
    return stateScores[this.currentState] || 0;
  }

  /**
   * Get recommendations for system improvement
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.currentState !== 'FULL') {
      recommendations.push({
        type: 'RECOVERY',
        priority: 'HIGH',
        message: 'System is in degraded mode - investigate root cause',
        actions: ['Check system metrics', 'Verify dependency health', 'Review error logs']
      });
    }
    
    // Add specific recommendations based on current state
    switch (this.currentState) {
      case 'REDUCED':
        recommendations.push({
          type: 'OPTIMIZATION',
          priority: 'MEDIUM',
          message: 'Consider optimizing resource usage',
          actions: ['Review database queries', 'Optimize caching strategy']
        });
        break;
      case 'EMERGENCY':
        recommendations.push({
          type: 'URGENT',
          priority: 'CRITICAL',
          message: 'System in emergency mode - immediate attention required',
          actions: ['Scale resources', 'Check critical dependencies', 'Prepare rollback plan']
        });
        break;
    }
    
    return recommendations;
  }

  /**
   * Start monitoring system metrics for automatic transitions
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.evaluateSystemHealth();
    }, 30000); // Evaluate every 30 seconds
  }

  /**
   * Evaluate system health and trigger automatic transitions
   */
  async evaluateSystemHealth() {
    try {
      const metrics = await this.collectSystemMetrics();
      const dependencies = await this.checkDependencyHealth();
      
      const recommendations = this.stateModel.getDegradationRecommendations(
        this.currentState,
        metrics,
        dependencies
      );
      
      for (const recommendation of recommendations) {
        if (recommendation.severity === 'CRITICAL' || recommendation.severity === 'HIGH') {
          await this.handleDegradationRecommendation(recommendation, metrics, dependencies);
        }
      }
    } catch (error) {
      this.logger.error('Health evaluation failed:', error);
    }
  }

  /**
   * Handle degradation recommendations
   */
  async handleDegradationRecommendation(recommendation, metrics, dependencies) {
    let targetState = null;
    
    switch (recommendation.action) {
      case 'DEGRADE_STATE':
        targetState = this.getNextDegradedState();
        break;
      case 'EMERGENCY_DEGRADATION':
        targetState = 'EMERGENCY';
        break;
      case 'SURVIVAL_MODE':
        targetState = 'SURVIVAL';
        break;
    }
    
    if (targetState && targetState !== this.currentState) {
      await this.transitionTo(targetState, recommendation.action, {
        metrics,
        dependencies,
        recommendation: recommendation.reason
      });
    }
  }

  /**
   * Get next degraded state in the sequence
   */
  getNextDegradedState() {
    const degradationSequence = ['FULL', 'REDUCED', 'EMERGENCY', 'SURVIVAL', 'CORE_ONLY'];
    const currentIndex = degradationSequence.indexOf(this.currentState);
    return degradationSequence[Math.min(currentIndex + 1, degradationSequence.length - 1)];
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    if (this.metricsCollector) {
      return await this.metricsCollector.getMetrics();
    }
    
    // Fallback metrics collection
    return {
      errorRate: 0,
      avgResponseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      dbConnections: 0
    };
  }

  /**
   * Check dependency health
   */
  async checkDependencyHealth() {
    // This would integrate with actual dependency health checks
    return {
      DATABASE: 'HEALTHY',
      CACHE: 'HEALTHY',
      AUTH_SERVICE: 'HEALTHY',
      FILE_STORAGE: 'HEALTHY',
      NOTIFICATION_SERVICE: 'HEALTHY',
      SEARCH_SERVICE: 'HEALTHY'
    };
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.on('stateChanged', (event) => {
      this.logger.info('State changed:', event);
    });
    
    this.on('transitionFailed', (event) => {
      this.logger.error('Transition failed:', event);
    });
  }

  /**
   * Execute pre-transition hooks
   */
  async executePreTransitionHooks(newState, previousState) {
    // Implement specific pre-transition logic
    this.logger.debug(`Executing pre-transition hooks: ${previousState} -> ${newState}`);
  }

  /**
   * Execute post-transition hooks
   */
  async executePostTransitionHooks(newState, previousState) {
    // Implement specific post-transition logic
    this.logger.debug(`Executing post-transition hooks: ${previousState} -> ${newState}`);
  }

  /**
   * Update rate limits
   */
  async updateRateLimits(rateLimits) {
    // Integrate with rate limiting service
    this.logger.debug('Updating rate limits:', rateLimits);
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(features) {
    // Integrate with feature flag service
    this.logger.debug('Updating feature flags:', features);
  }

  /**
   * Update caching configuration
   */
  async updateCachingConfig(caching) {
    // Integrate with caching service
    this.logger.debug('Updating caching config:', caching);
  }

  /**
   * Update database configuration
   */
  async updateDatabaseConfig(database) {
    // Integrate with database service
    this.logger.debug('Updating database config:', database);
  }

  /**
   * Update allowed operations
   */
  async updateAllowedOperations(operations) {
    // Update middleware and route handlers
    this.logger.debug('Updating allowed operations:', operations);
  }

  /**
   * Check rate limit for user tier
   */
  checkRateLimit(userTier) {
    // Integrate with rate limiting service
    return true;
  }

  /**
   * Load persisted state from storage
   */
  async loadPersistedState() {
    try {
      // Load from database or file system
      // this.currentState = persistedState || 'FULL';
    } catch (error) {
      this.logger.warn('Failed to load persisted state:', error);
    }
  }

  /**
   * Persist current state
   */
  async persistState() {
    try {
      // Save to database or file system
    } catch (error) {
      this.logger.warn('Failed to persist state:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.logger.info('DegradedModeEngine shutdown complete');
  }
}

export default DegradedModeEngine;
