/**
 * Reliability Integration
 * Week-3 Ownership Feature Build
 * Integration with existing reliability systems
 */

import { EventEmitter } from '../shared/utils.js';

export class ReliabilityIntegration extends EventEmitter {
  constructor(trustSafetyEngine, reliabilityOrchestrator) {
    super();
    this.engine = trustSafetyEngine;
    this.orchestrator = reliabilityOrchestrator;
    this.healthStatus = 'healthy';
    this.setupIntegration();
  }

  setupIntegration() {
    // Health monitoring
    this.orchestrator.on('healthCheck', () => this.performHealthCheck());
    
    // Graceful degradation
    this.orchestrator.on('degradedMode', () => this.enterDegradedMode());
    this.orchestrator.on('recoveryMode', () => this.enterRecoveryMode());
    
    // Error handling
    this.engine.on('error', (error) => this.handleEngineError(error));
  }

  async performHealthCheck() {
    try {
      const health = await this.engine.getHealthStatus();
      this.healthStatus = health.status;
      return health;
    } catch (error) {
      this.healthStatus = 'unhealthy';
      throw error;
    }
  }

  enterDegradedMode() {
    // Disable non-critical features
    this.engine.options.enableBatchProcessing = false;
    this.engine.options.enableRealTimeScoring = false;
    this.emit('degradedModeActivated');
  }

  enterRecoveryMode() {
    // Restore full functionality
    this.engine.options.enableBatchProcessing = true;
    this.engine.options.enableRealTimeScoring = true;
    this.emit('recoveryModeActivated');
  }

  handleEngineError(error) {
    this.orchestrator.reportError('trust-safety-engine', error);
  }
}

export default ReliabilityIntegration;
