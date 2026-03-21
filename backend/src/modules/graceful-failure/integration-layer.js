/**
 * GRACEFUL FAILURE INTEGRATION LAYER
 * Integrates graceful failure systems with existing reliability and monitoring infrastructure
 * 
 * Provides seamless integration with:
 * - Reliability Orchestrator
 * - Structured Logger
 * - Distributed Tracing
 * - Error Intelligence
 * - Load Shedder
 * - Fallback Manager
 */

import EventEmitter from 'events';

class GracefulFailureIntegration extends EventEmitter {
  constructor(dependencies = {}) {
    super();
    
    this.logger = dependencies.logger || console;
    this.orchestrator = dependencies.orchestrator;
    this.reliabilityOrchestrator = dependencies.reliabilityOrchestrator;
    this.structuredLogger = dependencies.structuredLogger;
    this.distributedTracing = dependencies.distributedTracing;
    this.errorIntelligence = dependencies.errorIntelligence;
    this.loadShedder = dependencies.loadShedder;
    this.fallbackManager = dependencies.fallbackManager;
    
    // Integration state
    this.isIntegrated = false;
    this.integrationHealth = {
      reliabilityOrchestrator: false,
      structuredLogger: false,
      distributedTracing: false,
      errorIntelligence: false,
      loadShedder: false,
      fallbackManager: false
    };
    
    // Event mapping between systems
    this.eventMappings = {
      // From Graceful Failure to External Systems
      systemStateChanged: [
        { target: 'reliabilityOrchestrator', event: 'systemStateChange' },
        { target: 'structuredLogger', event: 'logSystemState' },
        { target: 'distributedTracing', event: 'addSystemStateTag' }
      ],
      
      featureStateChanged: [
        { target: 'reliabilityOrchestrator', event: 'featureStateChange' },
        { target: 'structuredLogger', event: 'logFeatureState' },
        { target: 'errorIntelligence', event: 'trackFeatureAvailability' }
      ],
      
      healthAssessmentCompleted: [
        { target: 'reliabilityOrchestrator', event: 'healthUpdate' },
        { target: 'structuredLogger', event: 'logHealthMetrics' },
        { target: 'loadShedder', event: 'updateLoadSheddingThresholds' }
      ],
      
      requestClassified: [
        { target: 'distributedTracing', event: 'addRequestTags' },
        { target: 'loadShedder', event: 'classifyRequest' },
        { target: 'errorIntelligence', event: 'trackRequestPattern' }
      ],
      
      dependencyHealthChanged: [
        { target: 'reliabilityOrchestrator', event: 'dependencyHealthChange' },
        { target: 'structuredLogger', event: 'logDependencyHealth' },
        { target: 'errorIntelligence', event: 'trackDependencyErrors' }
      ],
      
      // From External Systems to Graceful Failure
      reliabilityAlert: [
        { target: 'orchestrator', event: 'handleReliabilityAlert' }
      ],
      
      errorSpike: [
        { target: 'orchestrator', event: 'handleErrorSpike' }
      ],
      
      loadThresholdExceeded: [
        { target: 'orchestrator', event: 'handleLoadThreshold' }
      ],
      
      fallbackTriggered: [
        { target: 'orchestrator', event: 'handleFallbackTrigger' }
      ]
    };
    
    // Data transformation adapters
    this.dataAdapters = {
      reliabilityOrchestrator: new ReliabilityOrchestratorAdapter(),
      structuredLogger: new StructuredLoggerAdapter(),
      distributedTracing: new DistributedTracingAdapter(),
      errorIntelligence: new ErrorIntelligenceAdapter(),
      loadShedder: new LoadShedderAdapter(),
      fallbackManager: new FallbackManagerAdapter()
    };
    
    // Integration metrics
    this.integrationMetrics = {
      totalEvents: 0,
      eventsByTarget: {},
      eventsByType: {},
      transformationErrors: 0,
      integrationErrors: 0,
      lastSync: Date.now()
    };
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize integration layer
   */
  async initialize() {
    try {
      this.logger.info('GracefulFailureIntegration initializing...');
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize external system connections
      await this.initializeExternalConnections();
      
      // Setup data synchronization
      this.setupDataSynchronization();
      
      // Setup health monitoring
      this.setupHealthMonitoring();
      
      this.isIntegrated = true;
      this.logger.info('GracefulFailureIntegration initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      this.logger.error('GracefulFailureIntegration initialization failed:', error);
      this.emit('initializationFailed', error);
    }
  }

  /**
   * Setup event listeners for orchestrator events
   */
  setupEventListeners() {
    if (!this.orchestrator) {
      this.logger.warn('Orchestrator not available for integration');
      return;
    }
    
    // Listen to all orchestrator events
    this.orchestrator.on('systemStateChanged', (event) => {
      this.handleOrchestratorEvent('systemStateChanged', event);
    });
    
    this.orchestrator.on('featureStateChanged', (event) => {
      this.handleOrchestratorEvent('featureStateChanged', event);
    });
    
    this.orchestrator.on('healthAssessmentCompleted', (event) => {
      this.handleOrchestratorEvent('healthAssessmentCompleted', event);
    });
    
    this.orchestrator.on('requestProcessed', (event) => {
      this.handleOrchestratorEvent('requestProcessed', event);
    });
    
    this.orchestrator.on('degradedModeChanged', (event) => {
      this.handleOrchestratorEvent('degradedModeChanged', event);
    });
    
    this.orchestrator.on('dependencyHealthChanged', (event) => {
      this.handleOrchestratorEvent('dependencyHealthChanged', event);
    });
  }

  /**
   * Initialize connections to external systems
   */
  async initializeExternalConnections() {
    const connectionPromises = [];
    
    // Reliability Orchestrator
    if (this.reliabilityOrchestrator) {
      connectionPromises.push(this.initializeReliabilityOrchestrator());
    }
    
    // Structured Logger
    if (this.structuredLogger) {
      connectionPromises.push(this.initializeStructuredLogger());
    }
    
    // Distributed Tracing
    if (this.distributedTracing) {
      connectionPromises.push(this.initializeDistributedTracing());
    }
    
    // Error Intelligence
    if (this.errorIntelligence) {
      connectionPromises.push(this.initializeErrorIntelligence());
    }
    
    // Load Shedder
    if (this.loadShedder) {
      connectionPromises.push(this.initializeLoadShedder());
    }
    
    // Fallback Manager
    if (this.fallbackManager) {
      connectionPromises.push(this.initializeFallbackManager());
    }
    
    await Promise.allSettled(connectionPromises);
  }

  /**
   * Initialize Reliability Orchestrator integration
   */
  async initializeReliabilityOrchestrator() {
    try {
      // Setup bidirectional communication
      this.reliabilityOrchestrator.on('systemAlert', (alert) => {
        this.handleExternalEvent('reliabilityAlert', alert);
      });
      
      this.reliabilityOrchestrator.on('circuitBreakerTripped', (event) => {
        this.handleExternalEvent('circuitBreakerTripped', event);
      });
      
      // Sync initial state
      await this.syncWithReliabilityOrchestrator();
      
      this.integrationHealth.reliabilityOrchestrator = true;
      this.logger.info('Reliability Orchestrator integration initialized');
      
    } catch (error) {
      this.logger.error('Reliability Orchestrator integration failed:', error);
    }
  }

  /**
   * Initialize Structured Logger integration
   */
  async initializeStructuredLogger() {
    try {
      // Setup structured logging for graceful failure events
      this.structuredLogger.addContext('graceful_failure', {
        component: 'graceful_failure',
        version: '1.0.0'
      });
      
      this.integrationHealth.structuredLogger = true;
      this.logger.info('Structured Logger integration initialized');
      
    } catch (error) {
      this.logger.error('Structured Logger integration failed:', error);
    }
  }

  /**
   * Initialize Distributed Tracing integration
   */
  async initializeDistributedTracing() {
    try {
      // Setup tracing for graceful failure operations
      this.distributedTracing.addTracer('graceful_failure', {
        service: 'graceful-failure',
        version: '1.0.0'
      });
      
      this.integrationHealth.distributedTracing = true;
      this.logger.info('Distributed Tracing integration initialized');
      
    } catch (error) {
      this.logger.error('Distributed Tracing integration failed:', error);
    }
  }

  /**
   * Initialize Error Intelligence integration
   */
  async initializeErrorIntelligence() {
    try {
      // Setup error tracking for graceful failure
      this.errorIntelligence.addErrorSource('graceful_failure', {
        category: 'system_degradation',
        priority: 'high'
      });
      
      this.integrationHealth.errorIntelligence = true;
      this.logger.info('Error Intelligence integration initialized');
      
    } catch (error) {
      this.logger.error('Error Intelligence integration failed:', error);
    }
  }

  /**
   * Initialize Load Shedder integration
   */
  async initializeLoadShedder() {
    try {
      // Setup load shedding coordination
      this.loadShedder.on('loadThresholdExceeded', (event) => {
        this.handleExternalEvent('loadThresholdExceeded', event);
      });
      
      this.loadShedder.on('sheddingActivated', (event) => {
        this.handleExternalEvent('sheddingActivated', event);
      });
      
      this.integrationHealth.loadShedder = true;
      this.logger.info('Load Shedder integration initialized');
      
    } catch (error) {
      this.logger.error('Load Shedder integration failed:', error);
    }
  }

  /**
   * Initialize Fallback Manager integration
   */
  async initializeFallbackManager() {
    try {
      // Setup fallback coordination
      this.fallbackManager.on('fallbackTriggered', (event) => {
        this.handleExternalEvent('fallbackTriggered', event);
      });
      
      this.fallbackManager.on('fallbackCompleted', (event) => {
        this.handleExternalEvent('fallbackCompleted', event);
      });
      
      this.integrationHealth.fallbackManager = true;
      this.logger.info('Fallback Manager integration initialized');
      
    } catch (error) {
      this.logger.error('Fallback Manager integration failed:', error);
    }
  }

  /**
   * Handle orchestrator events and route to external systems
   */
  async handleOrchestratorEvent(eventType, eventData) {
    try {
      this.integrationMetrics.totalEvents++;
      
      if (!this.integrationMetrics.eventsByType[eventType]) {
        this.integrationMetrics.eventsByType[eventType] = 0;
      }
      this.integrationMetrics.eventsByType[eventType]++;
      
      // Get event mappings
      const mappings = this.eventMappings[eventType];
      if (!mappings) {
        return;
      }
      
      // Process each mapping
      const processingPromises = mappings.map(mapping => {
        return this.processEventMapping(mapping, eventType, eventData);
      });
      
      await Promise.allSettled(processingPromises);
      
    } catch (error) {
      this.logger.error(`Event handling failed for ${eventType}:`, error);
      this.integrationMetrics.integrationErrors++;
    }
  }

  /**
   * Handle external system events
   */
  async handleExternalEvent(eventType, eventData) {
    try {
      this.logger.debug(`Received external event: ${eventType}`);
      
      // Route to orchestrator
      if (this.orchestrator && this.orchestrator.handleExternalEvent) {
        await this.orchestrator.handleExternalEvent(eventType, eventData);
      }
      
    } catch (error) {
      this.logger.error(`External event handling failed for ${eventType}:`, error);
    }
  }

  /**
   * Process individual event mapping
   */
  async processEventMapping(mapping, eventType, eventData) {
    try {
      const { target, event: targetEvent } = mapping;
      const targetSystem = this[target];
      
      if (!targetSystem) {
        this.logger.warn(`Target system ${target} not available`);
        return;
      }
      
      // Transform data for target system
      const adapter = this.dataAdapters[target];
      const transformedData = adapter ? adapter.transform(eventType, eventData) : eventData;
      
      // Send to target system
      if (typeof targetSystem[targetEvent] === 'function') {
        await targetSystem[targetEvent](transformedData);
      } else if (typeof targetSystem.emit === 'function') {
        targetSystem.emit(targetEvent, transformedData);
      } else {
        this.logger.warn(`No suitable handler found for ${target}.${targetEvent}`);
      }
      
      // Update metrics
      if (!this.integrationMetrics.eventsByTarget[target]) {
        this.integrationMetrics.eventsByTarget[target] = 0;
      }
      this.integrationMetrics.eventsByTarget[target]++;
      
    } catch (error) {
      this.logger.error(`Event mapping processing failed:`, error);
      this.integrationMetrics.transformationErrors++;
    }
  }

  /**
   * Setup data synchronization
   */
  setupDataSynchronization() {
    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      await this.performDataSynchronization();
    }, 300000);
    
    this.logger.info('Data synchronization setup complete');
  }

  /**
   * Perform data synchronization
   */
  async performDataSynchronization() {
    try {
      // Sync system state
      if (this.orchestrator && this.reliabilityOrchestrator) {
        const currentState = this.orchestrator.getStatus();
        await this.syncSystemState(currentState);
      }
      
      // Sync metrics
      await this.syncMetrics();
      
      this.integrationMetrics.lastSync = Date.now();
      
    } catch (error) {
      this.logger.error('Data synchronization failed:', error);
    }
  }

  /**
   * Sync system state with reliability orchestrator
   */
  async syncSystemState(currentState) {
    try {
      const stateData = {
        systemState: currentState.currentSystemState,
        healthScore: currentState.componentStatus.systemStateEngine.healthScore,
        timestamp: Date.now()
      };
      
      await this.reliabilityOrchestrator.updateSystemState(stateData);
      
    } catch (error) {
      this.logger.error('System state sync failed:', error);
    }
  }

  /**
   * Sync metrics across systems
   */
  async syncMetrics() {
    try {
      if (!this.orchestrator) return;
      
      const metrics = this.orchestrator.getMetrics();
      
      // Send to structured logger
      if (this.structuredLogger) {
        await this.structuredLogger.logMetrics('graceful_failure', metrics);
      }
      
      // Send to error intelligence
      if (this.errorIntelligence) {
        await this.errorIntelligence.updateMetrics('graceful_failure', metrics);
      }
      
    } catch (error) {
      this.logger.error('Metrics sync failed:', error);
    }
  }

  /**
   * Setup health monitoring for integrations
   */
  setupHealthMonitoring() {
    // Check integration health every minute
    this.healthCheckInterval = setInterval(async () => {
      await this.checkIntegrationHealth();
    }, 60000);
    
    this.logger.info('Health monitoring setup complete');
  }

  /**
   * Check health of all integrations
   */
  async checkIntegrationHealth() {
    try {
      const healthChecks = [
        { name: 'reliabilityOrchestrator', system: this.reliabilityOrchestrator },
        { name: 'structuredLogger', system: this.structuredLogger },
        { name: 'distributedTracing', system: this.distributedTracing },
        { name: 'errorIntelligence', system: this.errorIntelligence },
        { name: 'loadShedder', system: this.loadShedder },
        { name: 'fallbackManager', system: this.fallbackManager }
      ];
      
      for (const { name, system } of healthChecks) {
        try {
          if (system && typeof system.healthCheck === 'function') {
            const isHealthy = await system.healthCheck();
            this.integrationHealth[name] = isHealthy;
          } else if (system) {
            this.integrationHealth[name] = true;
          } else {
            this.integrationHealth[name] = false;
          }
        } catch (error) {
          this.integrationHealth[name] = false;
          this.logger.warn(`Health check failed for ${name}:`, error.message);
        }
      }
      
      this.emit('healthCheckCompleted', this.integrationHealth);
      
    } catch (error) {
      this.logger.error('Integration health check failed:', error);
    }
  }

  /**
   * Sync with reliability orchestrator
   */
  async syncWithReliabilityOrchestrator() {
    try {
      // Get current state from reliability orchestrator
      const reliabilityState = await this.reliabilityOrchestrator.getCurrentState();
      
      // Update orchestrator if needed
      if (this.orchestrator && reliabilityState.systemState) {
        await this.orchestrator.manualStateTransition(
          reliabilityState.systemState,
          'Sync with reliability orchestrator'
        );
      }
      
    } catch (error) {
      this.logger.error('Reliability orchestrator sync failed:', error);
    }
  }

  /**
   * Get integration status
   */
  getIntegrationStatus() {
    return {
      isIntegrated: this.isIntegrated,
      integrationHealth: this.integrationHealth,
      metrics: this.integrationMetrics,
      lastSync: this.integrationMetrics.lastSync
    };
  }

  /**
   * Get integration metrics
   */
  getMetrics() {
    return {
      ...this.integrationMetrics,
      health: this.integrationHealth,
      uptime: Date.now() - (this.integrationMetrics.startTime || Date.now())
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.logger.info('GracefulFailureIntegration shutting down...');
      
      // Clear intervals
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Close connections
      const closePromises = [];
      
      if (this.reliabilityOrchestrator && typeof this.reliabilityOrchestrator.close === 'function') {
        closePromises.push(this.reliabilityOrchestrator.close());
      }
      
      if (this.structuredLogger && typeof this.structuredLogger.close === 'function') {
        closePromises.push(this.structuredLogger.close());
      }
      
      await Promise.allSettled(closePromises);
      
      this.isIntegrated = false;
      this.logger.info('GracefulFailureIntegration shutdown complete');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Integration shutdown failed:', error);
    }
  }
}

/**
 * Data transformation adapters for different systems
 */

class ReliabilityOrchestratorAdapter {
  transform(eventType, eventData) {
    switch (eventType) {
      case 'systemStateChanged':
        return {
          type: 'SYSTEM_STATE_CHANGE',
          from: eventData.from,
          to: eventData.to,
          reason: eventData.reason,
          timestamp: eventData.timestamp,
          healthScore: eventData.healthScore
        };
        
      case 'featureStateChanged':
        return {
          type: 'FEATURE_STATE_CHANGE',
          featureId: eventData.featureId,
          action: eventData.action,
          reason: eventData.reason,
          timestamp: eventData.timestamp
        };
        
      default:
        return eventData;
    }
  }
}

class StructuredLoggerAdapter {
  transform(eventType, eventData) {
    return {
      event: eventType,
      data: eventData,
      timestamp: Date.now(),
      service: 'graceful-failure',
      version: '1.0.0'
    };
  }
}

class DistributedTracingAdapter {
  transform(eventType, eventData) {
    const tags = {};
    
    switch (eventType) {
      case 'systemStateChanged':
        tags['system.state'] = eventData.to;
        tags['system.previous_state'] = eventData.from;
        tags['system.reason'] = eventData.reason;
        break;
        
      case 'requestProcessed':
        tags['request.user_tier'] = eventData.userTier;
        tags['request.criticality'] = eventData.criticality;
        tags['request.path'] = eventData.path;
        break;
    }
    
    return {
      traceId: eventData.requestId || `trace_${Date.now()}`,
      tags,
      timestamp: Date.now()
    };
  }
}

class ErrorIntelligenceAdapter {
  transform(eventType, eventData) {
    switch (eventType) {
      case 'dependencyHealthChanged':
        return {
          type: 'DEPENDENCY_ERROR',
          dependency: eventData.dependency,
          status: eventData.status,
          consecutiveFailures: eventData.consecutiveFailures,
          critical: eventData.critical,
          timestamp: Date.now()
        };
        
      default:
        return {
          type: eventType,
          data: eventData,
          timestamp: Date.now()
        };
    }
  }
}

class LoadShedderAdapter {
  transform(eventType, eventData) {
    switch (eventType) {
      case 'healthAssessmentCompleted':
        return {
          healthScore: eventData.healthScore,
          systemState: eventData.systemState,
          load: eventData.systemMetrics?.resources?.cpuUsage || 0,
          timestamp: Date.now()
        };
        
      case 'requestProcessed':
        return {
          userTier: eventData.userTier,
          criticality: eventData.criticality,
          processingTime: eventData.processingTime,
          timestamp: Date.now()
        };
        
      default:
        return eventData;
    }
  }
}

class FallbackManagerAdapter {
  transform(eventType, eventData) {
    switch (eventType) {
      case 'systemStateChanged':
        return {
          trigger: 'SYSTEM_STATE_CHANGE',
          state: eventData.to,
          previousState: eventData.from,
          reason: eventData.reason,
          timestamp: Date.now()
        };
        
      case 'featureStateChanged':
        return {
          trigger: 'FEATURE_STATE_CHANGE',
          featureId: eventData.featureId,
          action: eventData.action,
          reason: eventData.reason,
          timestamp: Date.now()
        };
        
      default:
        return eventData;
    }
  }
}

export default GracefulFailureIntegration;
