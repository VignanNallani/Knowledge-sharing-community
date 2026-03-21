/**
 * SYSTEM STATE ENGINE
 * Monitors system health and manages recovery transitions
 * 
 * Provides comprehensive health monitoring, dependency tracking,
 * and intelligent recovery decision making for graceful failure scenarios
 */

import EventEmitter from 'events';

class SystemStateEngine extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.metricsCollector = dependencies.metricsCollector;
    this.healthChecker = dependencies.healthChecker;
    this.alertManager = dependencies.alertManager;
    
    // System state tracking
    this.currentState = 'FULL';
    this.previousState = null;
    this.stateHistory = [];
    this.lastStateChange = Date.now();
    this.stateStabilityTimer = null;
    
    // Health monitoring configuration
    this.monitoringConfig = {
      evaluationInterval: 30000,        // 30 seconds
      healthCheckTimeout: 5000,        // 5 seconds
      stabilityThreshold: 300000,      // 5 minutes
      degradationThreshold: 0.8,        // 80%
      recoveryThreshold: 0.9,          // 90%
      criticalFailureThreshold: 0.5,  // 50%
      maxConsecutiveFailures: 3
    };
    
    // Dependency health tracking
    this.dependencyHealth = new Map();
    this.dependencyHistory = new Map();
    this.dependencyFailureCounts = new Map();
    
    // System metrics
    this.systemMetrics = {
      overall: {
        healthScore: 100,
        availability: 100,
        errorRate: 0,
        responseTime: 0,
        throughput: 0
      },
      resources: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkIO: 0,
        dbConnections: 0
      },
      business: {
        activeUsers: 0,
        requestRate: 0,
        successRate: 100,
        userSatisfaction: 100
      }
    };
    
    // Health check definitions
    this.healthChecks = {
      DATABASE: {
        name: 'Database',
        critical: true,
        timeout: 3000,
        check: this.checkDatabaseHealth.bind(this),
        failureThreshold: 3,
        recoveryThreshold: 2
      },
      
      CACHE: {
        name: 'Cache',
        critical: false,
        timeout: 2000,
        check: this.checkCacheHealth.bind(this),
        failureThreshold: 5,
        recoveryThreshold: 3
      },
      
      AUTH_SERVICE: {
        name: 'Authentication Service',
        critical: true,
        timeout: 3000,
        check: this.checkAuthServiceHealth.bind(this),
        failureThreshold: 2,
        recoveryThreshold: 2
      },
      
      FILE_STORAGE: {
        name: 'File Storage',
        critical: false,
        timeout: 5000,
        check: this.checkFileStorageHealth.bind(this),
        failureThreshold: 3,
        recoveryThreshold: 2
      },
      
      NOTIFICATION_SERVICE: {
        name: 'Notification Service',
        critical: false,
        timeout: 3000,
        check: this.checkNotificationServiceHealth.bind(this),
        failureThreshold: 5,
        recoveryThreshold: 3
      },
      
      SEARCH_SERVICE: {
        name: 'Search Service',
        critical: false,
        timeout: 4000,
        check: this.checkSearchServiceHealth.bind(this),
        failureThreshold: 3,
        recoveryThreshold: 2
      }
    };
    
    // Recovery strategies
    this.recoveryStrategies = {
      DATABASE_FAILURE: {
        priority: 'CRITICAL',
        actions: ['switch_to_read_replicas', 'reduce_connection_pool', 'enable_query_caching'],
        estimatedRecoveryTime: 300000, // 5 minutes
        manualIntervention: false
      },
      
      CACHE_FAILURE: {
        priority: 'HIGH',
        actions: ['bypass_cache', 'increase_database_caching', 'reduce_request_rate'],
        estimatedRecoveryTime: 120000, // 2 minutes
        manualIntervention: false
      },
      
      HIGH_CPU_USAGE: {
        priority: 'HIGH',
        actions: ['enable_rate_limiting', 'disable_non_critical_features', 'scale_resources'],
        estimatedRecoveryTime: 600000, // 10 minutes
        manualIntervention: true
      },
      
      MEMORY_EXHAUSTION: {
        priority: 'CRITICAL',
        actions: ['clear_caches', 'garbage_collect', 'disable_memory_intensive_features'],
        estimatedRecoveryTime: 180000, // 3 minutes
        manualIntervention: false
      },
      
      NETWORK_PARTITION: {
        priority: 'CRITICAL',
        actions: ['enable_circuit_breakers', 'switch_to_local_cache', 'graceful_degradation'],
        estimatedRecoveryTime: 900000, // 15 minutes
        manualIntervention: true
      }
    };
    
    // State transition rules
    this.transitionRules = {
      degrade: {
        FULL: {
          to: 'REDUCED',
          conditions: ['moderate_load', 'minor_dependency_issues'],
          cooldown: 60000
        },
        REDUCED: {
          to: 'EMERGENCY',
          conditions: ['high_load', 'critical_dependency_degraded'],
          cooldown: 120000
        },
        EMERGENCY: {
          to: 'SURVIVAL',
          conditions: ['severe_load', 'multiple_critical_failures'],
          cooldown: 300000
        },
        SURVIVAL: {
          to: 'CORE_ONLY',
          conditions: ['critical_system_failure', 'resource_exhaustion'],
          cooldown: 600000
        }
      },
      
      recover: {
        CORE_ONLY: {
          to: 'SURVIVAL',
          conditions: ['basic_health_restored', 'critical_dependencies_stable'],
          stabilityTime: 900000 // 15 minutes
        },
        SURVIVAL: {
          to: 'EMERGENCY',
          conditions: ['improved_health', 'most_dependencies_stable'],
          stabilityTime: 600000 // 10 minutes
        },
        EMERGENCY: {
          to: 'REDUCED',
          conditions: ['good_health', 'critical_dependencies_healthy'],
          stabilityTime: 300000 // 5 minutes
        },
        REDUCED: {
          to: 'FULL',
          conditions: ['excellent_health', 'all_dependencies_healthy'],
          stabilityTime: 180000 // 3 minutes
        }
      }
    };
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the system state engine
   */
  async initialize() {
    this.logger.info('SystemStateEngine initializing...');
    
    // Initialize dependency health
    this.initializeDependencyHealth();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Perform initial health assessment
    await this.performHealthAssessment();
    
    this.logger.info(`SystemStateEngine initialized in ${this.currentState} state`);
    this.emit('initialized', { state: this.currentState });
  }

  /**
   * Initialize dependency health tracking
   */
  initializeDependencyHealth() {
    Object.keys(this.healthChecks).forEach(dep => {
      this.dependencyHealth.set(dep, {
        status: 'UNKNOWN',
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        responseTime: 0,
        error: null
      });
      
      this.dependencyHistory.set(dep, []);
      this.dependencyFailureCounts.set(dep, 0);
    });
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.monitoringTimer = setInterval(async () => {
      await this.performHealthAssessment();
    }, this.monitoringConfig.evaluationInterval);
    
    this.logger.info('Health monitoring started');
  }

  /**
   * Perform comprehensive health assessment
   */
  async performHealthAssessment() {
    try {
      const assessmentStart = Date.now();
      
      // Check all dependencies
      await this.checkAllDependencies();
      
      // Collect system metrics
      await this.collectSystemMetrics();
      
      // Calculate overall health score
      const healthScore = this.calculateOverallHealth();
      
      // Determine if state transition is needed
      const transitionDecision = this.evaluateStateTransition(healthScore);
      
      // Execute transition if needed
      if (transitionDecision.shouldTransition) {
        await this.executeStateTransition(transitionDecision);
      }
      
      // Update system metrics
      this.systemMetrics.overall.healthScore = healthScore;
      
      // Emit assessment completed
      this.emit('healthAssessmentCompleted', {
        healthScore,
        currentState: this.currentState,
        dependencyHealth: Object.fromEntries(this.dependencyHealth),
        systemMetrics: this.systemMetrics,
        processingTime: Date.now() - assessmentStart
      });
      
    } catch (error) {
      this.logger.error('Health assessment failed:', error);
      this.emit('healthAssessmentFailed', error);
    }
  }

  /**
   * Check all dependencies
   */
  async checkAllDependencies() {
    const checkPromises = Object.entries(this.healthChecks).map(async ([dep, config]) => {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          config.check(),
          this.timeout(config.timeout)
        ]);
        
        const responseTime = Date.now() - startTime;
        this.updateDependencyHealth(dep, 'HEALTHY', responseTime, null);
        
      } catch (error) {
        this.updateDependencyHealth(dep, 'FAILED', 0, error);
      }
    });
    
    await Promise.allSettled(checkPromises);
  }

  /**
   * Update dependency health status
   */
  updateDependencyHealth(dependency, status, responseTime, error) {
    const current = this.dependencyHealth.get(dependency);
    const config = this.healthChecks[dependency];
    
    // Update current status
    current.status = status;
    current.lastCheck = Date.now();
    current.responseTime = responseTime;
    current.error = error;
    
    // Track consecutive failures
    if (status === 'FAILED') {
      current.consecutiveFailures++;
      this.dependencyFailureCounts.set(dependency, 
        this.dependencyFailureCounts.get(dependency) + 1);
    } else {
      current.consecutiveFailures = 0;
    }
    
    // Update history
    const history = this.dependencyHistory.get(dependency);
    history.push({
      timestamp: Date.now(),
      status,
      responseTime,
      error: error?.message
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    // Emit dependency health change
    this.emit('dependencyHealthChanged', {
      dependency,
      status,
      previousStatus: current.status,
      consecutiveFailures: current.consecutiveFailures,
      critical: config.critical
    });
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    try {
      if (this.metricsCollector) {
        const metrics = await this.metricsCollector.getMetrics();
        this.systemMetrics = { ...this.systemMetrics, ...metrics };
      } else {
        // Fallback metrics collection
        await this.collectFallbackMetrics();
      }
    } catch (error) {
      this.logger.warn('Metrics collection failed:', error);
    }
  }

  /**
   * Fallback metrics collection
   */
  async collectFallbackMetrics() {
    // This would integrate with actual system monitoring
    // For now, use placeholder values
    this.systemMetrics.resources = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkIO: Math.random() * 1000,
      dbConnections: Math.floor(Math.random() * 100)
    };
    
    this.systemMetrics.business = {
      activeUsers: Math.floor(Math.random() * 1000),
      requestRate: Math.floor(Math.random() * 100),
      successRate: 95 + Math.random() * 5,
      userSatisfaction: 90 + Math.random() * 10
    };
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth() {
    let healthScore = 100;
    
    // Dependency health contribution (40%)
    const dependencyScore = this.calculateDependencyHealthScore();
    healthScore = healthScore * 0.6 + dependencyScore * 0.4;
    
    // Resource usage contribution (30%)
    const resourceScore = this.calculateResourceHealthScore();
    healthScore = healthScore * 0.7 + resourceScore * 0.3;
    
    // Business metrics contribution (20%)
    const businessScore = this.calculateBusinessHealthScore();
    healthScore = healthScore * 0.8 + businessScore * 0.2;
    
    // Performance metrics contribution (10%)
    const performanceScore = this.calculatePerformanceHealthScore();
    healthScore = healthScore * 0.9 + performanceScore * 0.1;
    
    return Math.round(Math.max(0, Math.min(100, healthScore)));
  }

  /**
   * Calculate dependency health score
   */
  calculateDependencyHealthScore() {
    let totalScore = 0;
    let criticalCount = 0;
    let totalCount = 0;
    
    this.dependencyHealth.forEach((health, dep) => {
      const config = this.healthChecks[dep];
      totalCount++;
      
      if (config.critical) {
        criticalCount++;
      }
      
      let score = 100;
      if (health.status === 'FAILED') {
        score = config.critical ? 0 : 50;
      } else if (health.status === 'DEGRADED') {
        score = config.critical ? 25 : 75;
      }
      
      totalScore += score;
    });
    
    // Weight critical dependencies more heavily
    const averageScore = totalScore / totalCount;
    const criticalWeight = criticalCount / totalCount;
    
    return averageScore * (1 - criticalWeight * 0.5);
  }

  /**
   * Calculate resource health score
   */
  calculateResourceHealthScore() {
    const { cpuUsage, memoryUsage, diskUsage } = this.systemMetrics.resources;
    
    let score = 100;
    
    // CPU usage impact
    if (cpuUsage > 90) score -= 30;
    else if (cpuUsage > 80) score -= 20;
    else if (cpuUsage > 70) score -= 10;
    
    // Memory usage impact
    if (memoryUsage > 90) score -= 30;
    else if (memoryUsage > 80) score -= 20;
    else if (memoryUsage > 70) score -= 10;
    
    // Disk usage impact
    if (diskUsage > 95) score -= 20;
    else if (diskUsage > 85) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Calculate business health score
   */
  calculateBusinessHealthScore() {
    const { successRate, userSatisfaction } = this.systemMetrics.business;
    
    return (successRate + userSatisfaction) / 2;
  }

  /**
   * Calculate performance health score
   */
  calculatePerformanceHealthScore() {
    const { responseTime, errorRate } = this.systemMetrics.overall;
    
    let score = 100;
    
    // Response time impact
    if (responseTime > 5000) score -= 30;
    else if (responseTime > 2000) score -= 20;
    else if (responseTime > 1000) score -= 10;
    
    // Error rate impact
    if (errorRate > 10) score -= 40;
    else if (errorRate > 5) score -= 30;
    else if (errorRate > 1) score -= 20;
    
    return Math.max(0, score);
  }

  /**
   * Evaluate if state transition is needed
   */
  evaluateStateTransition(healthScore) {
    const decision = {
      shouldTransition: false,
      targetState: null,
      reason: null,
      strategy: null
    };
    
    // Check for degradation
    if (healthScore < this.monitoringConfig.criticalFailureThreshold) {
      decision.shouldTransition = true;
      decision.targetState = 'SURVIVAL';
      decision.reason = `Critical health score: ${healthScore}%`;
      decision.strategy = 'IMMEDIATE_DEGRADATION';
    } else if (healthScore < this.monitoringConfig.degradationThreshold) {
      const targetState = this.getDegradedState(healthScore);
      if (targetState !== this.currentState) {
        decision.shouldTransition = true;
        decision.targetState = targetState;
        decision.reason = `Low health score: ${healthScore}%`;
        decision.strategy = 'GRACEFUL_DEGRADATION';
      }
    }
    
    // Check for recovery
    else if (healthScore > this.monitoringConfig.recoveryThreshold) {
      const targetState = this.getRecoveryState(healthScore);
      if (targetState !== this.currentState && this.canRecover()) {
        decision.shouldTransition = true;
        decision.targetState = targetState;
        decision.reason = `High health score: ${healthScore}%`;
        decision.strategy = 'GRACEFUL_RECOVERY';
      }
    }
    
    return decision;
  }

  /**
   * Get degraded state based on health score
   */
  getDegradedState(healthScore) {
    if (healthScore < 20) return 'CORE_ONLY';
    if (healthScore < 40) return 'SURVIVAL';
    if (healthScore < 60) return 'EMERGENCY';
    if (healthScore < 80) return 'REDUCED';
    return 'FULL';
  }

  /**
   * Get recovery state based on health score
   */
  getRecoveryState(healthScore) {
    if (healthScore > 95) return 'FULL';
    if (healthScore > 85) return 'REDUCED';
    if (healthScore > 75) return 'EMERGENCY';
    if (healthScore > 65) return 'SURVIVAL';
    return this.currentState;
  }

  /**
   * Check if system can recover
   */
  canRecover() {
    const timeInCurrentState = Date.now() - this.lastStateChange;
    const requiredStability = this.getRequiredStabilityTime();
    
    return timeInCurrentState >= requiredStability;
  }

  /**
   * Get required stability time for current state
   */
  getRequiredStabilityTime() {
    const stabilityTimes = {
      FULL: 0,
      REDUCED: 180000,      // 3 minutes
      EMERGENCY: 300000,    // 5 minutes
      SURVIVAL: 600000,     // 10 minutes
      READ_ONLY: 300000,    // 5 minutes
      CORE_ONLY: 900000     // 15 minutes
    };
    
    return stabilityTimes[this.currentState] || 300000;
  }

  /**
   * Execute state transition
   */
  async executeStateTransition(decision) {
    const { targetState, reason, strategy } = decision;
    
    try {
      this.logger.info(`Executing state transition: ${this.currentState} -> ${targetState} (${reason})`);
      
      // Execute transition strategy
      await this.executeTransitionStrategy(strategy, targetState);
      
      // Update state
      this.previousState = this.currentState;
      this.currentState = targetState;
      this.lastStateChange = Date.now();
      
      // Record in history
      this.stateHistory.push({
        from: this.previousState,
        to: this.currentState,
        timestamp: Date.now(),
        reason,
        strategy,
        healthScore: this.systemMetrics.overall.healthScore
      });
      
      // Emit transition event
      this.emit('stateTransitioned', {
        from: this.previousState,
        to: this.currentState,
        reason,
        strategy,
        healthScore: this.systemMetrics.overall.healthScore
      });
      
      this.logger.info(`State transition completed: ${this.previousState} -> ${this.currentState}`);
      
    } catch (error) {
      this.logger.error('State transition failed:', error);
      this.emit('stateTransitionFailed', {
        from: this.currentState,
        to: targetState,
        error: error.message
      });
    }
  }

  /**
   * Execute transition strategy
   */
  async executeTransitionStrategy(strategy, targetState) {
    switch (strategy) {
      case 'IMMEDIATE_DEGRADATION':
        await this.immediateDegradation(targetState);
        break;
      case 'GRACEFUL_DEGRADATION':
        await this.gracefulDegradation(targetState);
        break;
      case 'GRACEFUL_RECOVERY':
        await this.gracefulRecovery(targetState);
        break;
      default:
        this.logger.warn(`Unknown transition strategy: ${strategy}`);
    }
  }

  /**
   * Immediate degradation strategy
   */
  async immediateDegradation(targetState) {
    this.logger.warn(`Executing immediate degradation to ${targetState}`);
    
    // Disable non-critical features immediately
    // Reduce connection pools
    // Enable circuit breakers
    // Scale down resources
    
    this.emit('immediateDegradation', { targetState });
  }

  /**
   * Graceful degradation strategy
   */
  async gracefulDegradation(targetState) {
    this.logger.info(`Executing graceful degradation to ${targetState}`);
    
    // Gradually reduce features
    // Implement rate limiting
    // Enable caching
    // Notify users
    
    this.emit('gracefulDegradation', { targetState });
  }

  /**
   * Graceful recovery strategy
   */
  async gracefulRecovery(targetState) {
    this.logger.info(`Executing graceful recovery to ${targetState}`);
    
    // Gradually restore features
    // Increase rate limits
    // Scale up resources
    // Monitor stability
    
    this.emit('gracefulRecovery', { targetState });
  }

  /**
   * Health check implementations (placeholders)
   */
  async checkDatabaseHealth() {
    // Implement actual database health check
    return { status: 'healthy', latency: 50 };
  }

  async checkCacheHealth() {
    // Implement actual cache health check
    return { status: 'healthy', latency: 10 };
  }

  async checkAuthServiceHealth() {
    // Implement actual auth service health check
    return { status: 'healthy', latency: 30 };
  }

  async checkFileStorageHealth() {
    // Implement actual file storage health check
    return { status: 'healthy', latency: 100 };
  }

  async checkNotificationServiceHealth() {
    // Implement actual notification service health check
    return { status: 'healthy', latency: 50 };
  }

  async checkSearchServiceHealth() {
    // Implement actual search service health check
    return { status: 'healthy', latency: 75 };
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.on('dependencyHealthChanged', (event) => {
      if (event.critical && event.status === 'FAILED') {
        this.logger.error(`Critical dependency failed: ${event.dependency}`);
      }
    });
    
    this.on('stateTransitioned', (event) => {
      this.logger.info(`System state changed: ${event.from} -> ${event.to}`);
    });
  }

  /**
   * Get current system state
   */
  getCurrentState() {
    return {
      state: this.currentState,
      previousState: this.previousState,
      timeInCurrentState: Date.now() - this.lastStateChange,
      healthScore: this.systemMetrics.overall.healthScore,
      dependencyHealth: Object.fromEntries(this.dependencyHealth),
      systemMetrics: this.systemMetrics
    };
  }

  /**
   * Get dependency health status
   */
  getDependencyHealth() {
    return Object.fromEntries(this.dependencyHealth);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    return this.systemMetrics;
  }

  /**
   * Get state history
   */
  getStateHistory(limit = 10) {
    return this.stateHistory.slice(-limit);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    if (this.stateStabilityTimer) {
      clearTimeout(this.stateStabilityTimer);
    }
    
    this.logger.info('SystemStateEngine shutdown complete');
  }
}

export default SystemStateEngine;
