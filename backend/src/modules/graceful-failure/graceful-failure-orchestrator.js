/**
 * GRACEFUL FAILURE ORCHESTRATOR
 * Central coordinator for all graceful failure and degraded mode systems
 * 
 * Orchestrates the interaction between all graceful failure components,
* manages system-wide degradation decisions, and provides unified API
 * for the application to interact with graceful failure features
 */

import EventEmitter from 'events';
import SystemStateModel from './system-state-model.js';
import DegradedModeEngine from './degraded-mode-engine.js';
import FeatureMatrix from './feature-matrix.js';
import TrafficClassifier from './traffic-classifier.js';
import SystemStateEngine from './system-state-engine.js';
import UxFallbackEngine from './ux-fallback-engine.js';

class GracefulFailureOrchestrator extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.configManager = dependencies.configManager;
    this.metricsCollector = dependencies.metricsCollector;
    
    // Initialize all components
    this.systemStateModel = new SystemStateModel();
    this.degradedModeEngine = new DegradedModeEngine({ logger: this.logger });
    this.featureMatrix = new FeatureMatrix({ logger: this.logger });
    this.trafficClassifier = new TrafficClassifier({ 
      logger: this.logger,
      userService: dependencies.userService
    });
    this.systemStateEngine = new SystemStateEngine({ 
      logger: this.logger,
      metricsCollector: this.metricsCollector
    });
    this.uxFallbackEngine = new UxFallbackEngine({ 
      logger: this.logger,
      stateManager: this,
      featureMatrix: this.featureMatrix
    });
    
    // Orchestrator state
    this.isInitialized = false;
    this.isShuttingDown = false;
    this.currentSystemState = 'FULL';
    this.lastOrchestrationCycle = Date.now();
    
    // Configuration
    this.config = {
      orchestrationInterval: 30000,      // 30 seconds
      responseTimeout: 10000,           // 10 seconds
      maxConcurrentRequests: 1000,
      enableAutoRecovery: true,
      enableManualOverride: true,
      logLevel: 'INFO'
    };
    
    // Request processing pipeline
    this.requestPipeline = {
      classification: null,
      authorization: null,
      rateLimiting: null,
      featureCheck: null,
      responseGeneration: null
    };
    
    // Metrics tracking
    this.orchestratorMetrics = {
      totalRequests: 0,
      processedRequests: 0,
      rejectedRequests: 0,
      degradedResponses: 0,
      averageProcessingTime: 0,
      systemStateChanges: 0,
      featureStateChanges: 0,
      lastReset: Date.now()
    };
    
    // Event coordination
    this.eventHandlers = new Map();
    this.setupEventCoordination();
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    try {
      this.logger.info('GracefulFailureOrchestrator initializing...');
      
      // Initialize all components
      await this.initializeComponents();
      
      // Setup request processing pipeline
      this.setupRequestPipeline();
      
      // Start orchestration cycle
      this.startOrchestrationCycle();
      
      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
      
      this.isInitialized = true;
      this.logger.info('GracefulFailureOrchestrator initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      this.logger.error('GracefulFailureOrchestrator initialization failed:', error);
      this.emit('initializationFailed', error);
    }
  }

  /**
   * Initialize all components
   */
  async initializeComponents() {
    const initPromises = [
      this.degradedModeEngine.initialize(),
      this.systemStateEngine.initialize()
    ];
    
    await Promise.allSettled(initPromises);
    
    // Sync initial state
    this.currentSystemState = this.systemStateEngine.currentState;
  }

  /**
   * Setup request processing pipeline
   */
  setupRequestPipeline() {
    this.requestPipeline = {
      classification: this.classifyRequest.bind(this),
      authorization: this.checkAuthorization.bind(this),
      rateLimiting: this.checkRateLimits.bind(this),
      featureCheck: this.checkFeatureAvailability.bind(this),
      responseGeneration: this.generateResponse.bind(this)
    };
  }

  /**
   * Setup event coordination between components
   */
  setupEventCoordination() {
    // System state engine events
    this.systemStateEngine.on('stateTransitioned', (event) => {
      this.handleSystemStateTransition(event);
    });
    
    this.systemStateEngine.on('healthAssessmentCompleted', (event) => {
      this.handleHealthAssessment(event);
    });
    
    // Degraded mode engine events
    this.degradedModeEngine.on('stateChanged', (event) => {
      this.handleDegradedModeChange(event);
    });
    
    // Feature matrix events
    this.featureMatrix.on('featureEnabled', (event) => {
      this.handleFeatureStateChange(event, 'ENABLED');
    });
    
    this.featureMatrix.on('featureDisabled', (event) => {
      this.handleFeatureStateChange(event, 'DISABLED');
    });
    
    // Traffic classifier events
    this.trafficClassifier.on('requestClassified', (event) => {
      this.handleRequestClassification(event);
    });
  }

  /**
   * Main request processing entry point
   */
  async processRequest(req, res, next) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      this.orchestratorMetrics.totalRequests++;
      
      // Create request context
      const requestContext = {
        requestId,
        req,
        res,
        startTime,
        path: req.path,
        method: req.method,
        user: req.user,
        headers: req.headers,
        query: req.query,
        body: req.body
      };
      
      // Process through pipeline
      const result = await this.executeRequestPipeline(requestContext);
      
      // Update metrics
      this.updateRequestMetrics(result, Date.now() - startTime);
      
      // Handle response
      if (result.shouldProceed) {
        this.orchestratorMetrics.processedRequests++;
        return next();
      } else {
        this.orchestratorMetrics.rejectedRequests++;
        return this.sendErrorResponse(res, result);
      }
      
    } catch (error) {
      this.logger.error(`Request processing failed: ${requestId}`, error);
      this.orchestratorMetrics.rejectedRequests++;
      return this.sendErrorResponse(res, {
        error: 'Internal processing error',
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Execute request processing pipeline
   */
  async executeRequestPipeline(requestContext) {
    const result = {
      shouldProceed: true,
      classification: null,
      authorization: null,
      rateLimit: null,
      featureCheck: null,
      response: null
    };
    
    try {
      // Step 1: Classify request
      result.classification = await this.requestPipeline.classification(requestContext);
      
      // Step 2: Check authorization
      result.authorization = await this.requestPipeline.authorization(requestContext, result.classification);
      if (!result.authorized) {
        result.shouldProceed = false;
        return result;
      }
      
      // Step 3: Check rate limits
      result.rateLimit = await this.requestPipeline.rateLimiting(requestContext, result.classification);
      if (result.rateLimit.exceeded) {
        result.shouldProceed = false;
        return result;
      }
      
      // Step 4: Check feature availability
      result.featureCheck = await this.requestPipeline.featureCheck(requestContext, result.classification);
      if (!result.featureCheck.available) {
        result.shouldProceed = false;
        return result;
      }
      
      // Step 5: Generate response if needed
      if (!result.shouldProceed) {
        result.response = await this.requestPipeline.responseGeneration(requestContext, result);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('Pipeline execution failed:', error);
      result.shouldProceed = false;
      result.error = error;
      return result;
    }
  }

  /**
   * Classify incoming request
   */
  async classifyRequest(requestContext) {
    return await this.trafficClassifier.classifyRequest(requestContext.req);
  }

  /**
   * Check request authorization
   */
  async checkAuthorization(requestContext, classification) {
    // Check if user tier is allowed for current system state
    const userTier = classification.userTier;
    const systemState = this.currentSystemState;
    
    // Critical users always have access
    if (userTier === 'CRITICAL') {
      return { authorized: true, reason: 'Critical user access' };
    }
    
    // Check system state restrictions
    const stateConfig = this.degradedModeEngine.getCurrentModeConfig();
    if (!stateConfig.allowedOperations.includes(classification.criticality)) {
      return { 
        authorized: false, 
        reason: `Operation not allowed in ${systemState} state` 
      };
    }
    
    return { authorized: true, reason: 'Standard authorization' };
  }

  /**
   * Check rate limits
   */
  async checkRateLimits(requestContext, classification) {
    const userTier = classification.userTier;
    const rateLimits = this.degradedModeEngine.getCurrentModeConfig().rateLimits;
    
    // Get user-specific rate limit
    const limit = rateLimits[userTier.toLowerCase()] || rateLimits.anonymous;
    
    // This would integrate with actual rate limiting service
    // For now, return mock response
    return {
      exceeded: false,
      limit: limit,
      remaining: limit - 1,
      resetTime: Date.now() + 60000
    };
  }

  /**
   * Check feature availability
   */
  async checkFeatureAvailability(requestContext, classification) {
    const feature = this.extractFeatureFromRequest(requestContext);
    
    if (!feature) {
      return { available: true, reason: 'No specific feature required' };
    }
    
    const isAvailable = this.featureMatrix.isFeatureEnabled(feature);
    
    return {
      available: isAvailable,
      feature,
      reason: isAvailable ? 'Feature available' : 'Feature disabled'
    };
  }

  /**
   * Generate response for rejected/limited requests
   */
  async generateResponse(requestContext, pipelineResult) {
    const { classification, rateLimit, featureCheck, authorization } = pipelineResult;
    
    let error = null;
    let systemState = this.currentSystemState;
    
    // Determine error type
    if (!authorization.authorized) {
      error = { code: 'UNAUTHORIZED', message: authorization.reason };
    } else if (rateLimit.exceeded) {
      error = { 
        code: 'RATE_LIMIT_EXCEEDED', 
        message: 'Rate limit exceeded',
        retryAfter: rateLimit.resetTime 
      };
    } else if (!featureCheck.available) {
      error = { 
        code: 'FEATURE_DISABLED', 
        message: 'Feature temporarily unavailable',
        feature: featureCheck.feature 
      };
    }
    
    // Generate UX response
    return await this.uxFallbackEngine.generateResponse(
      {
        requestId: requestContext.requestId,
        path: requestContext.path,
        method: requestContext.method,
        classification
      },
      error,
      systemState
    );
  }

  /**
   * Handle system state transitions
   */
  async handleSystemStateTransition(event) {
    const { from, to, reason, strategy } = event;
    
    this.logger.info(`System state transition: ${from} -> ${to} (${reason})`);
    
    this.currentSystemState = to;
    this.orchestratorMetrics.systemStateChanges++;
    
    // Update degraded mode engine
    await this.degradedModeEngine.transitionTo(to, reason, { strategy });
    
    // Update feature matrix
    await this.featureMatrix.evaluateFeatureDegradation(
      to,
      this.systemStateEngine.getSystemMetrics(),
      this.systemStateEngine.getDependencyHealth()
    );
    
    // Update traffic classifier
    this.trafficClassifier.updateRateLimitsForSystemState(to);
    
    // Emit orchestrator event
    this.emit('systemStateChanged', {
      from,
      to,
      reason,
      strategy,
      timestamp: Date.now()
    });
  }

  /**
   * Handle health assessment results
   */
  async handleHealthAssessment(event) {
    const { healthScore, dependencyHealth, systemMetrics } = event;
    
    // Update feature matrix based on health
    await this.featureMatrix.evaluateFeatureDegradation(
      this.currentSystemState,
      systemMetrics,
      dependencyHealth
    );
    
    // Emit health status
    this.emit('healthStatus', {
      healthScore,
      systemState: this.currentSystemState,
      dependencyHealth,
      systemMetrics
    });
  }

  /**
   * Handle degraded mode changes
   */
  handleDegradedModeChange(event) {
    const { from, to, reason } = event;
    
    this.logger.info(`Degraded mode changed: ${from} -> ${to} (${reason})`);
    
    this.emit('degradedModeChanged', {
      from,
      to,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Handle feature state changes
   */
  handleFeatureStateChange(event, action) {
    const { featureId, reason } = event;
    
    this.logger.info(`Feature ${action.toLowerCase()}: ${featureId} (${reason})`);
    
    this.orchestratorMetrics.featureStateChanges++;
    
    this.emit('featureStateChanged', {
      featureId,
      action,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Handle request classification
   */
  handleRequestClassification(event) {
    const { requestInfo, classification, processingTime } = event;
    
    // Track classification metrics
    this.emit('requestProcessed', {
      path: requestInfo.path,
      userTier: classification.userTier,
      criticality: classification.criticality,
      processingTime
    });
  }

  /**
   * Start orchestration cycle
   */
  startOrchestrationCycle() {
    if (this.orchestrationTimer) {
      clearInterval(this.orchestrationTimer);
    }
    
    this.orchestrationTimer = setInterval(async () => {
      await this.performOrchestrationCycle();
    }, this.config.orchrationInterval);
    
    this.logger.info('Orchestration cycle started');
  }

  /**
   * Perform orchestration cycle
   */
  async performOrchestrationCycle() {
    if (this.isShuttingDown) return;
    
    try {
      const cycleStart = Date.now();
      
      // Collect system health
      const healthAssessment = this.systemStateEngine.getCurrentState();
      
      // Evaluate system-wide decisions
      await this.evaluateSystemDecisions(healthAssessment);
      
      // Update metrics
      this.lastOrchestrationCycle = Date.now();
      
      // Emit cycle completion
      this.emit('orchestrationCycleCompleted', {
        processingTime: Date.now() - cycleStart,
        systemState: this.currentSystemState,
        healthScore: healthAssessment.healthScore
      });
      
    } catch (error) {
      this.logger.error('Orchestration cycle failed:', error);
      this.emit('orchestrationCycleFailed', error);
    }
  }

  /**
   * Evaluate system-wide decisions
   */
  async evaluateSystemDecisions(healthAssessment) {
    const { healthScore, dependencyHealth, systemMetrics } = healthAssessment;
    
    // Check for manual overrides
    if (this.config.enableManualOverride) {
      await this.checkManualOverrides();
    }
    
    // Check for auto-recovery opportunities
    if (this.config.enableAutoRecovery) {
      await this.checkAutoRecovery(healthAssessment);
    }
    
    // Update component configurations
    await this.updateComponentConfigurations(healthAssessment);
  }

  /**
   * Check for manual overrides
   */
  async checkManualOverrides() {
    // This would check for manual state changes, feature toggles, etc.
    // Implementation depends on specific requirements
  }

  /**
   * Check for auto-recovery opportunities
   */
  async checkAutoRecovery(healthAssessment) {
    const { healthScore } = healthAssessment;
    
    // If health is good and we're in a degraded state, consider recovery
    if (healthScore > 90 && this.currentSystemState !== 'FULL') {
      this.logger.info('Auto-recovery conditions met, initiating recovery');
      
      // Trigger recovery through system state engine
      await this.systemStateEngine.performHealthAssessment();
    }
  }

  /**
   * Update component configurations
   */
  async updateComponentConfigurations(healthAssessment) {
    // Update traffic classifier based on current load
    this.trafficClassifier.updateRateLimitsForSystemState(this.currentSystemState);
    
    // Update feature matrix based on dependency health
    await this.featureMatrix.evaluateFeatureDegradation(
      this.currentSystemState,
      healthAssessment.systemMetrics,
      healthAssessment.dependencyHealth
    );
  }

  /**
   * Extract feature from request context
   */
  extractFeatureFromRequest(requestContext) {
    const path = requestContext.path;
    
    if (path.includes('/content/create') || path.includes('/posts/create')) {
      return 'CONTENT_CREATION';
    }
    
    if (path.includes('/upload')) {
      return 'FILE_UPLOADS';
    }
    
    if (path.includes('/search')) {
      return 'SEARCH';
    }
    
    if (path.includes('/notifications')) {
      return 'NOTIFICATIONS';
    }
    
    if (path.includes('/comments')) {
      return 'COMMENTS';
    }
    
    return null;
  }

  /**
   * Send error response
   */
  sendErrorResponse(res, result) {
    const statusCode = this.getStatusCode(result);
    const responseBody = this.formatErrorResponse(result);
    
    res.status(statusCode).json(responseBody);
  }

  /**
   * Get status code for error result
   */
  getStatusCode(result) {
    if (result.error?.code === 'UNAUTHORIZED') return 401;
    if (result.error?.code === 'RATE_LIMIT_EXCEEDED') return 429;
    if (result.error?.code === 'FEATURE_DISABLED') return 503;
    if (result.response?.type === 'system_state') return 503;
    return 500;
  }

  /**
   * Format error response
   */
  formatErrorResponse(result) {
    if (result.response) {
      return result.response;
    }
    
    return {
      error: result.error?.message || 'Request failed',
      requestId: result.requestId,
      timestamp: Date.now(),
      processingTime: result.processingTime
    };
  }

  /**
   * Update request metrics
   */
  updateRequestMetrics(result, processingTime) {
    // Update average processing time
    const total = this.orchestratorMetrics.processedRequests + this.orchestratorMetrics.rejectedRequests;
    const currentAvg = this.orchestratorMetrics.averageProcessingTime;
    this.orchestratorMetrics.averageProcessingTime = 
      (currentAvg * (total - 1) + processingTime) / total;
    
    // Track degraded responses
    if (result.response && result.response.type !== 'success') {
      this.orchestratorMetrics.degradedResponses++;
    }
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `gfo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isShuttingDown: this.isShuttingDown,
      currentSystemState: this.currentSystemState,
      lastOrchestrationCycle: this.lastOrchestrationCycle,
      metrics: this.orchestratorMetrics,
      componentStatus: {
        systemStateEngine: this.systemStateEngine.getCurrentState(),
        degradedModeEngine: this.degradedModeEngine.getHealthAssessment(),
        featureMatrix: this.featureMatrix.getFeatureStatusReport(),
        trafficClassifier: this.trafficClassifier.getMetrics()
      }
    };
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      orchestrator: this.orchestratorMetrics,
      systemState: this.systemStateEngine.getCurrentState(),
      degradedMode: this.degradedModeEngine.getHealthAssessment(),
      features: this.featureMatrix.getFeatureStatusReport(),
      traffic: this.trafficClassifier.getMetrics(),
      ux: this.uxFallbackEngine.getMetrics()
    };
  }

  /**
   * Manual state transition
   */
  async manualStateTransition(targetState, reason = 'Manual override') {
    if (!this.config.enableManualOverride) {
      throw new Error('Manual override is disabled');
    }
    
    this.logger.info(`Manual state transition requested: ${this.currentSystemState} -> ${targetState}`);
    
    return await this.systemStateEngine.executeStateTransition({
      shouldTransition: true,
      targetState,
      reason,
      strategy: 'MANUAL_OVERRIDE'
    });
  }

  /**
   * Manual feature toggle
   */
  async manualFeatureToggle(featureId, action, reason = 'Manual toggle') {
    if (!this.config.enableManualOverride) {
      throw new Error('Manual override is disabled');
    }
    
    if (action === 'ENABLE') {
      return await this.featureMatrix.enableFeature(featureId, reason);
    } else if (action === 'DISABLE') {
      return await this.featureMatrix.disableFeature(featureId, reason);
    } else {
      throw new Error('Invalid action. Use ENABLE or DISABLE');
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.logger.info('GracefulFailureOrchestrator shutting down...');
    
    try {
      // Stop orchestration cycle
      if (this.orchestrationTimer) {
        clearInterval(this.orchestrationTimer);
      }
      
      // Shutdown all components
      const shutdownPromises = [
        this.systemStateEngine.shutdown(),
        this.degradedModeEngine.shutdown(),
        this.featureMatrix.shutdown(),
        this.trafficClassifier.shutdown(),
        this.uxFallbackEngine.shutdown()
      ];
      
      await Promise.allSettled(shutdownPromises);
      
      this.logger.info('GracefulFailureOrchestrator shutdown complete');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Shutdown failed:', error);
    }
  }
}

export default GracefulFailureOrchestrator;
