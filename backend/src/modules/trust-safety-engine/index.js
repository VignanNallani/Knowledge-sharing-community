/**
 * Trust & Safety Engine - Main Entry Point
 * Week-3 Ownership Feature Build
 * Production-grade trust, safety, and moderation system
 */

import TrustScoreCalculator from './trust-engine/TrustScoreCalculator.js';
import ModerationPipeline from './moderation-engine/ModerationPipeline.js';
import EnforcementEngine from './enforcement-engine/EnforcementEngine.js';
import AuditEngine from './audit-engine/AuditEngine.js';
import { EventEmitter } from './shared/utils.js';
import { EVENT_TYPES, SYSTEM_CONFIG } from './shared/constants.js';

/**
 * Main Trust & Safety Engine class
 * Orchestrates all sub-engines and provides unified interface
 */
export class TrustSafetyEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableTrustEngine: true,
      enableModerationEngine: true,
      enableEnforcementEngine: true,
      enableAuditEngine: true,
      ...options
    };

    // Initialize engines
    this.engines = {};
    
    if (this.options.enableTrustEngine) {
      this.engines.trust = new TrustScoreCalculator(options.trustEngine);
    }
    
    if (this.options.enableModerationEngine) {
      this.engines.moderation = new ModerationPipeline(options.moderationEngine);
    }
    
    if (this.options.enableEnforcementEngine) {
      this.engines.enforcement = new EnforcementEngine(options.enforcementEngine);
    }
    
    if (this.options.enableAuditEngine) {
      this.engines.audit = new AuditEngine(options.auditEngine);
    }

    // Initialize engine coordination
    this.initializeEngineCoordination();
    
    // System state
    this.isInitialized = false;
    this.isShuttingDown = false;
    this.metrics = {
      startTime: new Date().toISOString(),
      totalOperations: 0,
      errors: 0,
      lastActivity: null
    };
  }

  /**
   * Initialize the Trust & Safety Engine
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.emit('initializationStarted');

      // Initialize each engine
      for (const [name, engine] of Object.entries(this.engines)) {
        if (engine.initialize && typeof engine.initialize === 'function') {
          await engine.initialize();
          this.emit('engineInitialized', { name });
        }
      }

      // Setup inter-engine communication
      this.setupInterEngineCommunication();

      // Start background processes
      this.startBackgroundProcesses();

      this.isInitialized = true;
      this.emit('initialized', { timestamp: new Date().toISOString() });

    } catch (error) {
      this.emit('initializationError', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a user report through the complete pipeline
   * @param {Object} report - Report data
   * @returns {Object} Processing result
   */
  async processReport(report) {
    this.updateActivity();
    
    try {
      // Log the report submission
      await this.engines.audit?.logEvent({
        logType: 'USER_ACTION',
        actionType: 'report_submitted',
        target: 'report',
        targetId: report.id,
        details: report,
        userId: report.reporterId
      });

      // Process through moderation pipeline
      const moderationResult = await this.engines.moderation.processReport(report);

      // Update trust scores if needed
      if (moderationResult.finalStatus === 'RESOLVED' && report.reportedUserId) {
        await this.updateUserTrustScore(report.reportedUserId, 'report_received', moderationResult);
      }

      // Execute enforcement actions if required
      if (moderationResult.actions && moderationResult.actions.length > 0) {
        const enforcementResults = await Promise.all(
          moderationResult.actions.map(action => 
            this.engines.enforcement.executeAction(action)
          )
        );
        moderationResult.enforcementResults = enforcementResults;
      }

      // Log completion
      await this.engines.audit?.logEvent({
        logType: 'SYSTEM_ACTION',
        actionType: 'report_processed',
        target: 'report',
        targetId: report.id,
        details: moderationResult
      });

      this.metrics.totalOperations++;
      return moderationResult;

    } catch (error) {
      this.metrics.errors++;
      await this.engines.audit?.logEvent({
        logType: 'SYSTEM_ACTION',
        actionType: 'report_processing_error',
        target: 'report',
        targetId: report.id,
        details: { error: error.message }
      });
      throw error;
    }
  }

  /**
   * Get comprehensive user trust profile
   * @param {number} userId - User ID
   * @returns {Object} User trust profile
   */
  async getUserTrustProfile(userId) {
    this.updateActivity();

    try {
      // Calculate trust score
      const trustScore = await this.engines.trust.calculateTrustScore({ id: userId });

      // Get enforcement status
      const enforcementStatus = await this.engines.enforcement.getUserEnforcementStatus(userId);

      // Get recent activity
      const recentActivity = await this.getUserRecentActivity(userId);

      // Combine into comprehensive profile
      const profile = {
        userId,
        trustScore,
        enforcementStatus,
        recentActivity,
        riskAssessment: await this.assessUserRisk(userId, trustScore, enforcementStatus),
        recommendations: await this.generateUserRecommendations(userId, trustScore, enforcementStatus),
        lastUpdated: new Date().toISOString()
      };

      return profile;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Execute enforcement action with full audit trail
   * @param {Object} action - Action details
   * @returns {Object} Action result
   */
  async executeEnforcementAction(action) {
    this.updateActivity();

    try {
      // Log action initiation
      await this.engines.audit?.logEvent({
        logType: 'MODERATOR_ACTION',
        actionType: 'enforcement_initiated',
        target: 'user',
        targetId: action.targetUserId,
        details: action,
        userId: action.issuedBy
      });

      // Execute the action
      const result = await this.engines.enforcement.executeAction(action);

      // Update trust scores if affected
      if (action.type === 'TRUST_DEDUCTION' || action.type === 'USER_SUSPENSION') {
        await this.updateUserTrustScore(action.targetUserId, 'enforcement_action', result);
      }

      // Log action completion
      await this.engines.audit?.logEvent({
        logType: 'MODERATOR_ACTION',
        actionType: 'enforcement_completed',
        target: 'user',
        targetId: action.targetUserId,
        details: result,
        userId: action.issuedBy
      });

      this.metrics.totalOperations++;
      return result;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Process appeal with full workflow
   * @param {Object} appeal - Appeal details
   * @returns {Object} Appeal result
   */
  async processAppeal(appeal) {
    this.updateActivity();

    try {
      // Log appeal submission
      await this.engines.audit?.logEvent({
        logType: 'USER_ACTION',
        actionType: 'appeal_submitted',
        target: 'appeal',
        targetId: appeal.id,
        details: appeal,
        userId: appeal.userId
      });

      // Process appeal through enforcement engine
      const appealResult = await this.engines.enforcement.processAppeal(appeal);

      // If appeal is successful, update trust scores
      if (appealResult.decision === 'reverse' || appealResult.decision === 'modify') {
        await this.updateUserTrustScore(appeal.userId, 'successful_appeal', appealResult);
      }

      // Log appeal processing
      await this.engines.audit?.logEvent({
        logType: 'MODERATOR_ACTION',
        actionType: 'appeal_processed',
        target: 'appeal',
        targetId: appealResult.appealId,
        details: appealResult
      });

      this.metrics.totalOperations++;
      return appealResult;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   * @param {Object} reportParams - Report parameters
   * @returns {Object} Compliance report
   */
  async generateComplianceReport(reportParams) {
    this.updateActivity();

    try {
      // Generate report through audit engine
      const report = await this.engines.audit.generateComplianceReport(reportParams);

      // Add system metrics
      report.systemMetrics = this.getSystemMetrics();

      // Add engine-specific metrics
      report.engineMetrics = {};
      for (const [name, engine] of Object.entries(this.engines)) {
        if (engine.getMetrics) {
          report.engineMetrics[name] = engine.getMetrics();
        }
      }

      return report;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Get system health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.calculateUptime(),
      engines: {},
      metrics: this.metrics,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        version: '1.0.0'
      }
    };

    // Check each engine's health
    for (const [name, engine] of Object.entries(this.engines)) {
      try {
        if (engine.getMetrics) {
          health.engines[name] = {
            status: 'healthy',
            metrics: engine.getMetrics()
          };
        }
      } catch (error) {
        health.engines[name] = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Graceful shutdown of the Trust & Safety Engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.emit('shutdownStarted');

    try {
      // Shutdown each engine
      for (const [name, engine] of Object.entries(this.engines)) {
        if (engine.shutdown && typeof engine.shutdown === 'function') {
          await engine.shutdown();
          this.emit('engineShutdown', { name });
        }
      }

      // Stop background processes
      this.stopBackgroundProcesses();

      this.emit('shutdown', { timestamp: new Date().toISOString() });

    } catch (error) {
      this.emit('shutdownError', { error: error.message });
      throw error;
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  initializeEngineCoordination() {
    // Set up event listeners for inter-engine communication
    
    // Trust score changes affect enforcement
    this.engines.trust?.on('trustScoreUpdated', async (data) => {
      if (data.levelChange?.changed) {
        await this.engines.enforcement?.applyTrustLevelChange(data);
      }
    });

    // Moderation decisions trigger enforcement
    this.engines.moderation?.on('reportProcessed', async (data) => {
      if (data.enforcementRequired) {
        await this.engines.enforcement?.processEnforcementQueue(data);
      }
    });

    // Enforcement actions update trust scores
    this.engines.enforcement?.on('actionExecuted', async (data) => {
      if (data.affectsTrust) {
        await this.engines.trust?.recalculateTrustScore(data.userId);
      }
    });

    // All actions are logged for audit
    this.onAny('actionExecuted', async (data) => {
      await this.engines.audit?.logEvent({
        logType: 'SYSTEM_ACTION',
        actionType: 'engine_action',
        details: data
      });
    });
  }

  setupInterEngineCommunication() {
    // Set up shared event bus for engine communication
    this.eventBus = new EventEmitter();
    
    // Forward events between engines
    for (const [name, engine] of Object.entries(this.engines)) {
      engine.onAny?.((event, data) => {
        this.eventBus.emit(`${name}:${event}`, data);
      });
    }
  }

  startBackgroundProcesses() {
    // Start periodic trust score recalculation
    this.trustRecalculationInterval = setInterval(async () => {
      try {
        await this.performPeriodicTrustRecalculation();
      } catch (error) {
        this.emit('backgroundProcessError', { 
          process: 'trustRecalculation', 
          error: error.message 
        });
      }
    }, SYSTEM_CONFIG.TRUST_RECALCULATION_INTERVAL || 3600000); // 1 hour

    // Start periodic cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performPeriodicCleanup();
      } catch (error) {
        this.emit('backgroundProcessError', { 
          process: 'cleanup', 
          error: error.message 
        });
      }
    }, SYSTEM_CONFIG.CLEANUP_INTERVAL || 86400000); // 24 hours
  }

  stopBackgroundProcesses() {
    if (this.trustRecalculationInterval) {
      clearInterval(this.trustRecalculationInterval);
      this.trustRecalculationInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async updateUserTrustScore(userId, trigger, context) {
    if (!this.engines.trust) return;

    try {
      const newScore = await this.engines.trust.recalculateTrustScore(userId);
      
      await this.engines.audit?.logEvent({
        logType: 'SYSTEM_ACTION',
        actionType: 'trust_score_updated',
        target: 'user',
        targetId: userId,
        details: {
          trigger,
          context,
          newScore
        }
      });

      this.emit('trustScoreUpdated', { userId, newScore, trigger, context });

    } catch (error) {
      this.emit('trustScoreUpdateError', { userId, error: error.message });
    }
  }

  async assessUserRisk(userId, trustScore, enforcementStatus) {
    // Simple risk assessment logic
    let riskLevel = 'low';
    const riskFactors = [];

    if (trustScore.overall < 30) {
      riskLevel = 'high';
      riskFactors.push('low_trust_score');
    }

    if (enforcementStatus.activeEnforcements.length > 0) {
      riskLevel = 'medium';
      riskFactors.push('active_enforcements');
    }

    if (enforcementStatus.totalActions > 5) {
      riskLevel = 'high';
      riskFactors.push('high_enforcement_history');
    }

    return {
      level: riskLevel,
      factors: riskFactors,
      score: this.calculateRiskScore(trustScore, enforcementStatus)
    };
  }

  async generateUserRecommendations(userId, trustScore, enforcementStatus) {
    const recommendations = [];

    if (trustScore.overall < 40) {
      recommendations.push({
        type: 'improve_content_quality',
        priority: 'high',
        description: 'Focus on creating higher quality content to improve trust score'
      });
    }

    if (enforcementStatus.activeEnforcements.length > 0) {
      recommendations.push({
        type: 'compliance_review',
        priority: 'medium',
        description: 'Review and comply with community guidelines'
      });
    }

    return recommendations;
  }

  async getUserRecentActivity(userId) {
    // Placeholder for user activity retrieval
    // In production, this would query user activity logs
    return {
      lastLogin: new Date().toISOString(),
      postsCount: 0,
      commentsCount: 0,
      reportsMade: 0,
      reportsReceived: 0
    };
  }

  calculateRiskScore(trustScore, enforcementStatus) {
    let riskScore = 100 - trustScore.overall;
    riskScore += enforcementStatus.activeEnforcements.length * 10;
    riskScore += enforcementStatus.totalActions * 2;
    return Math.min(100, Math.max(0, riskScore));
  }

  calculateUptime() {
    const startTime = new Date(this.metrics.startTime);
    const now = new Date();
    return now - startTime;
  }

  getSystemMetrics() {
    return {
      ...this.metrics,
      uptime: this.calculateUptime(),
      errorRate: this.metrics.totalOperations > 0 
        ? (this.metrics.errors / this.metrics.totalOperations * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  updateActivity() {
    this.metrics.lastActivity = new Date().toISOString();
  }

  async performPeriodicTrustRecalculation() {
    // Placeholder for periodic trust score recalculation
    // In production, this would identify users needing recalculation
    this.emit('periodicTrustRecalculation', {
      timestamp: new Date().toISOString()
    });
  }

  async performPeriodicCleanup() {
    // Cleanup expired data, optimize performance
    await this.engines.audit?.cleanup();
    
    this.emit('periodicCleanup', {
      timestamp: new Date().toISOString()
    });
  }

  // Helper to listen to any event from engines
  onAny(callback) {
    for (const engine of Object.values(this.engines)) {
      if (engine.on) {
        engine.onAny?.(callback);
      }
    }
  }
}

export default TrustSafetyEngine;
