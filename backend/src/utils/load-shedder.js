import { createLogger } from '../utils/logger.js';
import { errorIntelligence, ERROR_CATEGORIES, ERROR_SEVERITY } from '../utils/error-intelligence.js';
import { distributedTracing } from '../utils/distributed-tracing.js';
import { EventEmitter } from 'events';

const logger = createLogger('LoadShedder');

/**
 * Load Shedder - Production-Grade Load Management
 * 
 * Provides intelligent load shedding with:
 * - Priority-based request shedding
 * - Graceful degradation
 * - Non-critical path dropping
 * - Adaptive shedding based on system conditions
 * - SLA-aware load management
 */

// Request priorities
export const REQUEST_PRIORITIES = {
  CRITICAL: 1,    // Critical system operations (health checks, auth)
  HIGH: 2,        // High priority user operations
  MEDIUM: 3,      // Normal user operations
  LOW: 4,         // Background operations
  BACKGROUND: 5   // Non-essential operations
};

// Load shedding strategies
export const SHEDDING_STRATEGIES = {
  // Drop requests based on priority
  PRIORITY_BASED: 'priority_based',
  
  // Drop requests based on system load
  LOAD_BASED: 'load_based',
  
  // Drop requests based on response time
  RESPONSE_TIME_BASED: 'response_time_based',
  
  // Drop requests based on error rate
  ERROR_RATE_BASED: 'error_rate_based',
  
  // Adaptive combination of strategies
  ADAPTIVE: 'adaptive'
};

// Degradation levels
export const DEGRADATION_LEVELS = {
  NONE: 'none',           // No degradation
  MINIMAL: 'minimal',     // Drop background tasks
  MODERATE: 'moderate',   // Drop low priority
  SEVERE: 'severe',       // Drop medium priority
  CRITICAL: 'critical'    // Only critical operations
};

// Default load shedding configurations
export const LOAD_SHEDDING_CONFIGS = {
  // Conservative configuration for critical services
  CONSERVATIVE: {
    strategy: SHEDDING_STRATEGIES.ADAPTIVE,
    maxLoadThreshold: 0.8,        // 80% system load
    maxResponseTime: 2000,        // 2 seconds
    maxErrorRate: 0.05,           // 5% error rate
    monitoringInterval: 5000,     // 5 seconds
    adaptationRate: 0.1,          // 10% adaptation rate
    priorityWeights: {
      [REQUEST_PRIORITIES.CRITICAL]: 1.0,
      [REQUEST_PRIORITIES.HIGH]: 0.9,
      [REQUEST_PRIORITIES.MEDIUM]: 0.7,
      [REQUEST_PRIORITIES.LOW]: 0.4,
      [REQUEST_PRIORITIES.BACKGROUND]: 0.1
    },
    degradationThresholds: {
      [DEGRADATION_LEVELS.MINIMAL]: 0.7,
      [DEGRADATION_LEVELS.MODERATE]: 0.8,
      [DEGRADATION_LEVELS.SEVERE]: 0.9,
      [DEGRADATION_LEVELS.CRITICAL]: 0.95
    }
  },

  // Aggressive configuration for high-throughput services
  AGGRESSIVE: {
    strategy: SHEDDING_STRATEGIES.LOAD_BASED,
    maxLoadThreshold: 0.9,        // 90% system load
    maxResponseTime: 1000,        // 1 second
    maxErrorRate: 0.1,            // 10% error rate
    monitoringInterval: 2000,     // 2 seconds
    adaptationRate: 0.2,          // 20% adaptation rate
    priorityWeights: {
      [REQUEST_PRIORITIES.CRITICAL]: 1.0,
      [REQUEST_PRIORITIES.HIGH]: 0.8,
      [REQUEST_PRIORITIES.MEDIUM]: 0.6,
      [REQUEST_PRIORITIES.LOW]: 0.3,
      [REQUEST_PRIORITIES.BACKGROUND]: 0.05
    },
    degradationThresholds: {
      [DEGRADATION_LEVELS.MINIMAL]: 0.8,
      [DEGRADATION_LEVELS.MODERATE]: 0.85,
      [DEGRADATION_LEVELS.SEVERE]: 0.92,
      [DEGRADATION_LEVELS.CRITICAL]: 0.97
    }
  },

  // Fast configuration for real-time services
  FAST: {
    strategy: SHEDDING_STRATEGIES.RESPONSE_TIME_BASED,
    maxLoadThreshold: 0.7,        // 70% system load
    maxResponseTime: 500,         // 500ms
    maxErrorRate: 0.02,           // 2% error rate
    monitoringInterval: 1000,     // 1 second
    adaptationRate: 0.3,          // 30% adaptation rate
    priorityWeights: {
      [REQUEST_PRIORITIES.CRITICAL]: 1.0,
      [REQUEST_PRIORITIES.HIGH]: 0.95,
      [REQUEST_PRIORITIES.MEDIUM]: 0.8,
      [REQUEST_PRIORITIES.LOW]: 0.5,
      [REQUEST_PRIORITIES.BACKGROUND]: 0.1
    },
    degradationThresholds: {
      [DEGRADATION_LEVELS.MINIMAL]: 0.6,
      [DEGRADATION_LEVELS.MODERATE]: 0.7,
      [DEGRADATION_LEVELS.SEVERE]: 0.8,
      [DEGRADATION_LEVELS.CRITICAL]: 0.9
    }
  }
};

class LoadShedder extends EventEmitter {
  constructor(name, config = LOAD_SHEDDING_CONFIGS.CONSERVATIVE) {
    super();
    
    this.name = name;
    this.config = { ...config };
    this.currentDegradationLevel = DEGRADATION_LEVELS.NONE;
    this.systemMetrics = {
      currentLoad: 0,
      averageResponseTime: 0,
      errorRate: 0,
      requestCount: 0,
      shedCount: 0,
      acceptedCount: 0
    };
    this.metrics = {
      totalRequests: 0,
      shedRequests: 0,
      acceptedRequests: 0,
      priorityStats: {},
      degradationHistory: [],
      lastAdaptation: Date.now()
    };
    this.monitoringTimer = null;
    this.adaptiveThresholds = new Map();
    
    this.initializeMetrics();
    this.startMonitoring();
  }

  /**
   * Initialize metrics tracking
   */
  initializeMetrics() {
    // Initialize priority statistics
    for (const priority of Object.values(REQUEST_PRIORITIES)) {
      this.metrics.priorityStats[priority] = {
        total: 0,
        shed: 0,
        accepted: 0,
        averageResponseTime: 0
      };
    }
  }

  /**
   * Execute request with load shedding
   */
  async execute(request, priority = REQUEST_PRIORITIES.MEDIUM, context = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const span = distributedTracing.startSpan('load_shedding_execution', {
      loadShedderName: this.name,
      requestId,
      priority,
      degradationLevel: this.currentDegradationLevel,
      systemLoad: this.systemMetrics.currentLoad
    });

    try {
      // Check if request should be shed
      const shouldShed = this.shouldShedRequest(priority, context);
      
      if (shouldShed) {
        this.recordShed(priority, startTime);
        
        const error = new Error(`Request shed due to load - priority: ${priority}`);
        error.code = 'LOAD_SHED';
        error.priority = priority;
        error.degradationLevel = this.currentDegradationLevel;
        error.loadShedderName = this.name;
        
        span.finish({
          success: false,
          shed: true,
          priority,
          degradationLevel: this.currentDegradationLevel
        });
        
        this.emit('requestShed', {
          requestId,
          priority,
          degradationLevel: this.currentDegradationLevel,
          systemLoad: this.systemMetrics.currentLoad
        });
        
        throw error;
      }

      // Execute request
      this.metrics.totalRequests++;
      this.metrics.acceptedRequests++;
      this.systemMetrics.requestCount++;
      
      const result = await request();
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordSuccess(priority, duration);
      
      span.finish({
        success: true,
        duration,
        priority,
        degradationLevel: this.currentDegradationLevel
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure (if not shed)
      if (error.code !== 'LOAD_SHED') {
        this.recordFailure(priority, duration, error);
      }
      
      span.finish({
        success: false,
        duration,
        priority,
        error: error.message,
        shed: error.code === 'LOAD_SHED'
      });

      throw error;
    }
  }

  /**
   * Determine if request should be shed
   */
  shouldShedRequest(priority, context) {
    // Never shed critical requests
    if (priority === REQUEST_PRIORITIES.CRITICAL) {
      return false;
    }

    // Check degradation level
    if (this.currentDegradationLevel === DEGRADATION_LEVELS.NONE) {
      return false;
    }

    // Apply shedding based on strategy
    switch (this.config.strategy) {
      case SHEDDING_STRATEGIES.PRIORITY_BASED:
        return this.shouldShedByPriority(priority);
      
      case SHEDDING_STRATEGIES.LOAD_BASED:
        return this.shouldShedByLoad(priority);
      
      case SHEDDING_STRATEGIES.RESPONSE_TIME_BASED:
        return this.shouldShedByResponseTime(priority);
      
      case SHEDDING_STRATEGIES.ERROR_RATE_BASED:
        return this.shouldShedByErrorRate(priority);
      
      case SHEDDING_STRATEGIES.ADAPTIVE:
        return this.shouldShedAdaptively(priority, context);
      
      default:
        return false;
    }
  }

  /**
   * Priority-based shedding
   */
  shouldShedByPriority(priority) {
    const thresholds = {
      [DEGRADATION_LEVELS.MINIMAL]: REQUEST_PRIORITIES.BACKGROUND,
      [DEGRADATION_LEVELS.MODERATE]: REQUEST_PRIORITIES.LOW,
      [DEGRADATION_LEVELS.SEVERE]: REQUEST_PRIORITIES.MEDIUM,
      [DEGRADATION_LEVELS.CRITICAL]: REQUEST_PRIORITIES.HIGH
    };

    const minPriorityToShed = thresholds[this.currentDegradationLevel];
    return priority >= minPriorityToShed;
  }

  /**
   * Load-based shedding
   */
  shouldShedByLoad(priority) {
    const loadThreshold = this.config.maxLoadThreshold;
    const currentLoad = this.systemMetrics.currentLoad;
    
    if (currentLoad < loadThreshold) {
      return false;
    }

    // Calculate shedding probability based on load and priority
    const loadExcess = currentLoad - loadThreshold;
    const maxExcess = 1.0 - loadThreshold;
    const loadFactor = loadExcess / maxExcess;
    
    const priorityWeight = this.config.priorityWeights[priority] || 0.5;
    const shedProbability = loadFactor * (1 - priorityWeight);
    
    return Math.random() < shedProbability;
  }

  /**
   * Response time-based shedding
   */
  shouldShedByResponseTime(priority) {
    const responseTimeThreshold = this.config.maxResponseTime;
    const currentResponseTime = this.systemMetrics.averageResponseTime;
    
    if (currentResponseTime < responseTimeThreshold) {
      return false;
    }

    // Calculate shedding probability based on response time and priority
    const timeExcess = currentResponseTime - responseTimeThreshold;
    const maxExcess = responseTimeThreshold * 2; // Allow 2x threshold
    const timeFactor = Math.min(timeExcess / maxExcess, 1.0);
    
    const priorityWeight = this.config.priorityWeights[priority] || 0.5;
    const shedProbability = timeFactor * (1 - priorityWeight);
    
    return Math.random() < shedProbability;
  }

  /**
   * Error rate-based shedding
   */
  shouldShedByErrorRate(priority) {
    const errorRateThreshold = this.config.maxErrorRate;
    const currentErrorRate = this.systemMetrics.errorRate;
    
    if (currentErrorRate < errorRateThreshold) {
      return false;
    }

    // Calculate shedding probability based on error rate and priority
    const errorExcess = currentErrorRate - errorRateThreshold;
    const maxExcess = 1.0 - errorRateThreshold;
    const errorFactor = errorExcess / maxExcess;
    
    const priorityWeight = this.config.priorityWeights[priority] || 0.5;
    const shedProbability = errorFactor * (1 - priorityWeight);
    
    return Math.random() < shedProbability;
  }

  /**
   * Adaptive shedding
   */
  shouldShedAdaptively(priority, context) {
    // Combine multiple factors
    const loadDecision = this.shouldShedByLoad(priority);
    const responseTimeDecision = this.shouldShedByResponseTime(priority);
    const errorRateDecision = this.shouldShedByErrorRate(priority);
    
    // Weight the decisions
    const weights = {
      load: 0.4,
      responseTime: 0.3,
      errorRate: 0.3
    };
    
    const weightedScore = 
      (loadDecision ? weights.load : 0) +
      (responseTimeDecision ? weights.responseTime : 0) +
      (errorRateDecision ? weights.errorRate : 0);
    
    // Apply priority-based adjustment
    const priorityWeight = this.config.priorityWeights[priority] || 0.5;
    const adjustedScore = weightedScore * (1 - priorityWeight);
    
    return Math.random() < adjustedScore;
  }

  /**
   * Record successful request
   */
  recordSuccess(priority, duration) {
    const stats = this.metrics.priorityStats[priority];
    stats.total++;
    stats.accepted++;
    
    // Update average response time
    const totalResponseTime = stats.averageResponseTime * (stats.accepted - 1) + duration;
    stats.averageResponseTime = totalResponseTime / stats.accepted;
    
    // Update system metrics
    this.updateSystemMetrics();
    
    logger.debug('Load shedder request completed', {
      name: this.name,
      priority,
      duration,
      degradationLevel: this.currentDegradationLevel
    });
  }

  /**
   * Record shed request
   */
  recordShed(priority, startTime) {
    const stats = this.metrics.priorityStats[priority];
    stats.total++;
    stats.shed++;
    
    this.metrics.totalRequests++;
    this.metrics.shedRequests++;
    this.systemMetrics.shedCount++;
    
    logger.debug('Request shed', {
      name: this.name,
      priority,
      degradationLevel: this.currentDegradationLevel,
      systemLoad: this.systemMetrics.currentLoad
    });
  }

  /**
   * Record failed request
   */
  recordFailure(priority, duration, error) {
    const stats = this.metrics.priorityStats[priority];
    stats.total++;
    
    // Update system metrics
    this.updateSystemMetrics();
    
    logger.debug('Load shedder request failed', {
      name: this.name,
      priority,
      duration,
      error: error.message
    });
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics() {
    // Calculate average response time across all priorities
    let totalResponseTime = 0;
    let totalRequests = 0;
    
    for (const stats of Object.values(this.metrics.priorityStats)) {
      if (stats.accepted > 0) {
        totalResponseTime += stats.averageResponseTime * stats.accepted;
        totalRequests += stats.accepted;
      }
    }
    
    this.systemMetrics.averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    
    // Calculate error rate (simplified)
    const totalProcessed = this.metrics.acceptedRequests + this.metrics.shedRequests;
    this.systemMetrics.errorRate = totalProcessed > 0 ? this.metrics.shedRequests / totalProcessed : 0;
    
    // Update request counts
    this.systemMetrics.acceptedCount = this.metrics.acceptedRequests;
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = setInterval(() => {
      this.performMonitoring();
    }, this.config.monitoringInterval);
  }

  /**
   * Perform monitoring and adaptation
   */
  performMonitoring() {
    // Get current system load (this would be implemented with actual system metrics)
    const currentLoad = this.getCurrentSystemLoad();
    this.systemMetrics.currentLoad = currentLoad;
    
    // Determine if degradation level should change
    const newDegradationLevel = this.calculateDegradationLevel(currentLoad);
    
    if (newDegradationLevel !== this.currentDegradationLevel) {
      this.transitionDegradationLevel(newDegradationLevel);
    }
    
    // Emit monitoring event
    this.emit('monitoring', {
      name: this.name,
      currentLoad,
      degradationLevel: this.currentDegradationLevel,
      metrics: this.getMetrics()
    });
    
    logger.debug('Load shedder monitoring', {
      name: this.name,
      currentLoad,
      degradationLevel: this.currentDegradationLevel,
      averageResponseTime: this.systemMetrics.averageResponseTime,
      errorRate: this.systemMetrics.errorRate
    });
  }

  /**
   * Get current system load (placeholder implementation)
   */
  getCurrentSystemLoad() {
    // This would be implemented with actual system monitoring
    // For now, simulate based on request rate
    const requestRate = this.systemMetrics.requestCount / (this.config.monitoringInterval / 1000);
    return Math.min(requestRate / 100, 1.0); // Normalize to 0-1
  }

  /**
   * Calculate degradation level based on system conditions
   */
  calculateDegradationLevel(currentLoad) {
    const thresholds = this.config.degradationThresholds;
    
    if (currentLoad >= thresholds[DEGRADATION_LEVELS.CRITICAL]) {
      return DEGRADATION_LEVELS.CRITICAL;
    } else if (currentLoad >= thresholds[DEGRADATION_LEVELS.SEVERE]) {
      return DEGRADATION_LEVELS.SEVERE;
    } else if (currentLoad >= thresholds[DEGRADATION_LEVELS.MODERATE]) {
      return DEGRADATION_LEVELS.MODERATE;
    } else if (currentLoad >= thresholds[DEGRADATION_LEVELS.MINIMAL]) {
      return DEGRADATION_LEVELS.MINIMAL;
    } else {
      return DEGRADATION_LEVELS.NONE;
    }
  }

  /**
   * Transition to new degradation level
   */
  transitionDegradationLevel(newLevel) {
    const previousLevel = this.currentDegradationLevel;
    this.currentDegradationLevel = newLevel;
    
    // Record in history
    this.metrics.degradationHistory.push({
      timestamp: Date.now(),
      from: previousLevel,
      to: newLevel,
      systemLoad: this.systemMetrics.currentLoad,
      averageResponseTime: this.systemMetrics.averageResponseTime,
      errorRate: this.systemMetrics.errorRate
    });
    
    // Keep only last 100 transitions
    if (this.metrics.degradationHistory.length > 100) {
      this.metrics.degradationHistory = this.metrics.degradationHistory.slice(-100);
    }
    
    this.emit('degradationLevelChanged', {
      name: this.name,
      from: previousLevel,
      to: newLevel,
      systemLoad: this.systemMetrics.currentLoad
    });
    
    logger.info('Load shedder degradation level changed', {
      name: this.name,
      from: previousLevel,
      to: newLevel,
      systemLoad: this.systemMetrics.currentLoad
    });
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      name: this.name,
      currentDegradationLevel: this.currentDegradationLevel,
      systemMetrics: { ...this.systemMetrics },
      metrics: { ...this.metrics },
      config: { ...this.config }
    };
  }

  /**
   * Get shedding statistics
   */
  getSheddingStats() {
    const stats = {
      totalRequests: this.metrics.totalRequests,
      shedRequests: this.metrics.shedRequests,
      acceptedRequests: this.metrics.acceptedRequests,
      shedRate: this.metrics.totalRequests > 0 ? this.metrics.shedRequests / this.metrics.totalRequests : 0,
      priorityStats: {},
      degradationHistory: this.metrics.degradationHistory.slice(-10) // Last 10 transitions
    };
    
    for (const [priority, priorityStats] of Object.entries(this.metrics.priorityStats)) {
      stats.priorityStats[priority] = {
        ...priorityStats,
        shedRate: priorityStats.total > 0 ? priorityStats.shed / priorityStats.total : 0
      };
    }
    
    return stats;
  }

  /**
   * Force degradation level (for testing/administration)
   */
  forceDegradationLevel(level) {
    if (!Object.values(DEGRADATION_LEVELS).includes(level)) {
      throw new Error(`Invalid degradation level: ${level}`);
    }
    
    this.transitionDegradationLevel(level);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.totalRequests = 0;
    this.metrics.shedRequests = 0;
    this.metrics.acceptedRequests = 0;
    this.metrics.degradationHistory = [];
    this.systemMetrics.requestCount = 0;
    this.systemMetrics.shedCount = 0;
    this.systemMetrics.acceptedCount = 0;
    
    for (const stats of Object.values(this.metrics.priorityStats)) {
      stats.total = 0;
      stats.shed = 0;
      stats.accepted = 0;
      stats.averageResponseTime = 0;
    }
    
    logger.info('Load shedder metrics reset', {
      name: this.name
    });
  }

  /**
   * Stop load shedder
   */
  stop() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    logger.info('Load shedder stopped', {
      name: this.name
    });
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `loadshed_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class LoadShedderManager {
  constructor() {
    this.loadShedders = new Map();
    this.globalMetrics = {
      totalLoadShedders: 0,
      totalRequests: 0,
      totalShedRequests: 0,
      totalAcceptedRequests: 0,
      averageShedRate: 0,
      degradationDistribution: {}
    };
  }

  /**
   * Create or get load shedder
   */
  getLoadShedder(name, config = LOAD_SHEDDING_CONFIGS.CONSERVATIVE) {
    if (!this.loadShedders.has(name)) {
      const loadShedder = new LoadShedder(name, config);
      
      // Set up event listeners for global metrics
      loadShedder.on('requestShed', (event) => {
        this.updateGlobalMetrics();
      });

      loadShedder.on('degradationLevelChanged', (event) => {
        this.updateGlobalMetrics();
      });

      this.loadShedders.set(name, loadShedder);
      this.globalMetrics.totalLoadShedders++;
    }

    return this.loadShedders.get(name);
  }

  /**
   * Execute request through load shedder
   */
  async execute(name, request, priority, config = null) {
    const loadShedder = this.getLoadShedder(name, config);
    return await loadShedder.execute(request, priority);
  }

  /**
   * Update global metrics
   */
  updateGlobalMetrics() {
    this.globalMetrics.totalRequests = 0;
    this.globalMetrics.totalShedRequests = 0;
    this.globalMetrics.totalAcceptedRequests = 0;
    this.globalMetrics.degradationDistribution = {};
    
    let totalShedRate = 0;

    for (const loadShedder of this.loadShedders.values()) {
      const metrics = loadShedder.getMetrics();
      const stats = loadShedder.getSheddingStats();
      
      this.globalMetrics.totalRequests += stats.totalRequests;
      this.globalMetrics.totalShedRequests += stats.shedRequests;
      this.globalMetrics.totalAcceptedRequests += stats.acceptedRequests;
      
      totalShedRate += stats.shedRate;
      
      // Track degradation distribution
      const level = metrics.currentDegradationLevel;
      this.globalMetrics.degradationDistribution[level] = 
        (this.globalMetrics.degradationDistribution[level] || 0) + 1;
    }

    this.globalMetrics.averageShedRate = this.loadShedders.size > 0 
      ? totalShedRate / this.loadShedders.size 
      : 0;
  }

  /**
   * Get all load shedder metrics
   */
  getAllMetrics() {
    const metrics = {};
    for (const [name, loadShedder] of this.loadShedders) {
      metrics[name] = loadShedder.getMetrics();
    }
    return metrics;
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Get all shedding statistics
   */
  getAllSheddingStats() {
    const stats = {};
    for (const [name, loadShedder] of this.loadShedders) {
      stats[name] = loadShedder.getSheddingStats();
    }
    return stats;
  }

  /**
   * Reset all load shedders
   */
  resetAll() {
    for (const loadShedder of this.loadShedders.values()) {
      loadShedder.resetMetrics();
    }
    logger.info('All load shedders reset');
  }

  /**
   * Stop all load shedders
   */
  stopAll() {
    for (const loadShedder of this.loadShedders.values()) {
      loadShedder.stop();
    }
    logger.info('All load shedders stopped');
  }
}

// Create singleton instance
export const loadShedderManager = new LoadShedderManager();

// Export convenience functions
export const getLoadShedder = (name, config) => 
  loadShedderManager.getLoadShedder(name, config);

export const executeWithLoadShedding = (name, request, priority, config) => 
  loadShedderManager.execute(name, request, priority, config);

export const getAllLoadShedderMetrics = () => loadShedderManager.getAllMetrics();
export const getLoadShedderStats = () => loadShedderManager.getGlobalMetrics();

export default LoadShedderManager;
