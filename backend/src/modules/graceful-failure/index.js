/**
 * GRACEFUL FAILURE SYSTEM - MAIN ENTRY POINT
 * 
 * This is the main entry point for the complete graceful failure and degraded mode system.
 * It exports all components and provides a unified interface for integration.
 */

import GracefulFailureOrchestrator from './graceful-failure-orchestrator.js';
import GracefulFailureIntegration from './integration-layer.js';

// Individual components (for advanced usage)
import SystemStateModel from './system-state-model.js';
import DegradedModeEngine from './degraded-mode-engine.js';
import FeatureMatrix from './feature-matrix.js';
import TrafficClassifier from './traffic-classifier.js';
import SystemStateEngine from './system-state-engine.js';
import UxFallbackEngine from './ux-fallback-engine.js';

/**
 * Main Graceful Failure System class
 * Provides a simple interface to initialize and use the complete system
 */
class GracefulFailureSystem {
  constructor(config = {}) {
    this.config = {
      // System configuration
      enableIntegration: config.enableIntegration !== false,
      enableAutoRecovery: config.enableAutoRecovery !== false,
      enableManualOverride: config.enableManualOverride !== false,
      
      // Component configuration
      orchestrationInterval: config.orchestrationInterval || 30000,
      healthCheckInterval: config.healthCheckInterval || 30000,
      
      // Logging
      logger: config.logger || console,
      logLevel: config.logLevel || 'INFO',
      
      // External dependencies
      reliabilityOrchestrator: config.reliabilityOrchestrator,
      structuredLogger: config.structuredLogger,
      distributedTracing: config.distributedTracing,
      errorIntelligence: config.errorIntelligence,
      loadShedder: config.loadShedder,
      fallbackManager: config.fallbackManager,
      userService: config.userService,
      metricsCollector: config.metricsCollector
    };
    
    this.orchestrator = null;
    this.integration = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the complete graceful failure system
   */
  async initialize() {
    try {
      this.config.logger.info('Initializing Graceful Failure System...');
      
      // Initialize the orchestrator
      this.orchestrator = new GracefulFailureOrchestrator({
        logger: this.config.logger,
        configManager: { config: this.config },
        metricsCollector: this.config.metricsCollector,
        userService: this.config.userService
      });
      
      await this.orchestrator.initialize();
      
      // Initialize integration layer if enabled
      if (this.config.enableIntegration) {
        this.integration = new GracefulFailureIntegration({
          logger: this.config.logger,
          orchestrator: this.orchestrator,
          reliabilityOrchestrator: this.config.reliabilityOrchestrator,
          structuredLogger: this.config.structuredLogger,
          distributedTracing: this.config.distributedTracing,
          errorIntelligence: this.config.errorIntelligence,
          loadShedder: this.config.loadShedder,
          fallbackManager: this.config.fallbackManager
        });
        
        await this.integration.initialize();
      }
      
      this.isInitialized = true;
      this.config.logger.info('Graceful Failure System initialized successfully');
      
      return {
        success: true,
        systemState: this.orchestrator.getCurrentState(),
        integrationStatus: this.integration?.getIntegrationStatus()
      };
      
    } catch (error) {
      this.config.logger.error('Graceful Failure System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get the main middleware for Express.js integration
   */
  getMiddleware() {
    if (!this.isInitialized) {
      throw new Error('Graceful Failure System not initialized. Call initialize() first.');
    }
    
    return this.orchestrator.processRequest.bind(this.orchestrator);
  }

  /**
   * Get current system status
   */
  getStatus() {
    if (!this.isInitialized) {
      return { isInitialized: false };
    }
    
    const status = {
      isInitialized: true,
      orchestrator: this.orchestrator.getStatus()
    };
    
    if (this.integration) {
      status.integration = this.integration.getIntegrationStatus();
    }
    
    return status;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    if (!this.isInitialized) {
      return { error: 'System not initialized' };
    }
    
    return this.orchestrator.getMetrics();
  }

  /**
   * Manual state transition
   */
  async transitionToState(targetState, reason = 'Manual override') {
    if (!this.isInitialized) {
      throw new Error('Graceful Failure System not initialized');
    }
    
    return await this.orchestrator.manualStateTransition(targetState, reason);
  }

  /**
   * Manual feature toggle
   */
  async toggleFeature(featureId, action, reason = 'Manual toggle') {
    if (!this.isInitialized) {
      throw new Error('Graceful Failure System not initialized');
    }
    
    return await this.orchestrator.manualFeatureToggle(featureId, action, reason);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      this.config.logger.info('Shutting down Graceful Failure System...');
      
      if (this.integration) {
        await this.integration.shutdown();
      }
      
      if (this.orchestrator) {
        await this.orchestrator.shutdown();
      }
      
      this.isInitialized = false;
      this.config.logger.info('Graceful Failure System shutdown complete');
      
    } catch (error) {
      this.config.logger.error('Graceful Failure System shutdown failed:', error);
      throw error;
    }
  }
}

/**
 * Factory function for easy initialization
 */
function createGracefulFailureSystem(config = {}) {
  return new GracefulFailureSystem(config);
}

/**
 * Express.js middleware factory
 */
function createGracefulFailureMiddleware(config = {}) {
  const system = new GracefulFailureSystem(config);
  
  // Initialize asynchronously
  system.initialize().catch(error => {
    console.error('Failed to initialize Graceful Failure System:', error);
  });
  
  return system.getMiddleware.bind(system);
}

export {
  // Main system
  GracefulFailureSystem,
  createGracefulFailureSystem,
  createGracefulFailureMiddleware,
  
  // Individual components
  GracefulFailureOrchestrator,
  GracefulFailureIntegration,
  SystemStateModel,
  DegradedModeEngine,
  FeatureMatrix,
  TrafficClassifier,
  SystemStateEngine,
  UxFallbackEngine
};
