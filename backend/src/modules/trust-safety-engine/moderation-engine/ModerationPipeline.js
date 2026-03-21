/**
 * Moderation Pipeline
 * Week-3 Ownership Feature Build
 * Core moderation workflow with AI/Manual hybrid approach
 */

import { 
  REPORT_SEVERITY, 
  REPORT_STATUS, 
  CASE_STATE, 
  FLAG_TYPE,
  AI_CONFIDENCE_THRESHOLDS,
  ESCALATION_TRIGGERS 
} from '../shared/constants.js';
import { EventEmitter, retryWithBackoff, measureExecutionTime } from '../shared/utils.js';

export class ModerationPipeline extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableAI: true,
      enableManualReview: true,
      autoActionThreshold: AI_CONFIDENCE_THRESHOLDS.HIGH,
      escalationThreshold: AI_CONFIDENCE_THRESHOLDS.MEDIUM,
      maxRetryAttempts: 3,
      batchSize: 50,
      ...options
    };

    // Pipeline stages
    this.stages = {
      ingestion: new ReportIngestionStage(),
      validation: new ReportValidationStage(),
      deduplication: new ReportDeduplicationStage(),
      triage: new TriageStage(),
      aiAnalysis: new AIAnalysisStage(this.options.enableAI),
      humanReview: new HumanReviewStage(this.options.enableManualReview),
      escalation: new EscalationStage(),
      action: new ActionStage(),
      notification: new NotificationStage()
    };

    // Metrics tracking
    this.metrics = {
      reportsProcessed: 0,
      autoActions: 0,
      manualReviews: 0,
      escalations: 0,
      errors: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Process a single report through the pipeline
   * @param {Object} report - Report data
   * @returns {Object} Processing result
   */
  async processReport(report) {
    const startTime = Date.now();
    let currentReport = { ...report };
    let pipelineResult = {
      reportId: report.id,
      stages: [],
      finalStatus: null,
      actions: [],
      escalated: false,
      processingTime: 0
    };

    try {
      // Execute pipeline stages in sequence
      for (const [stageName, stage] of Object.entries(this.stages)) {
        const stageResult = await this.executeStage(stageName, stage, currentReport);
        pipelineResult.stages.push({
          stage: stageName,
          status: stageResult.status,
          data: stageResult.data,
          duration: stageResult.duration
        });

        // Update report with stage results
        if (stageResult.data) {
          currentReport = { ...currentReport, ...stageResult.data };
        }

        // Check if pipeline should stop early
        if (stageResult.stopPipeline) {
          break;
        }

        // Emit stage completion event
        this.emit('stageCompleted', {
          stage: stageName,
          reportId: report.id,
          result: stageResult
        });
      }

      // Set final status
      pipelineResult.finalStatus = currentReport.status || REPORT_STATUS.RESOLVED;
      pipelineResult.processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(pipelineResult);

      // Emit completion event
      this.emit('reportProcessed', pipelineResult);

      return pipelineResult;

    } catch (error) {
      pipelineResult.error = {
        message: error.message,
        stage: error.stage || 'unknown',
        timestamp: new Date().toISOString()
      };

      this.metrics.errors++;
      this.emit('processingError', pipelineResult);

      throw error;
    }
  }

  /**
   * Execute a single pipeline stage
   * @param {string} stageName - Stage name
   * @param {Object} stage - Stage instance
   * @param {Object} report - Report data
   * @returns {Object} Stage execution result
   */
  async executeStage(stageName, stage, report) {
    const { result, executionTime } = await measureExecutionTime(async () => {
      return await retryWithBackoff(
        () => stage.execute(report),
        this.options.maxRetryAttempts
      );
    });

    return {
      status: 'completed',
      data: result,
      duration: executionTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process multiple reports in batch
   * @param {Array} reports - Array of reports
   * @returns {Array} Processing results
   */
  async processBatch(reports) {
    const results = [];
    const batches = this.chunkArray(reports, this.options.batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(report => this.processReport(report));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            reportId: batch[index].id,
            error: result.reason.message,
            status: 'failed'
          });
        }
      });

      // Brief pause between batches to prevent overwhelming
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get pipeline metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      autoActionRate: this.metrics.reportsProcessed > 0 
        ? (this.metrics.autoActions / this.metrics.reportsProcessed * 100).toFixed(2) + '%'
        : '0%',
      manualReviewRate: this.metrics.reportsProcessed > 0
        ? (this.metrics.manualReviews / this.metrics.reportsProcessed * 100).toFixed(2) + '%'
        : '0%',
      escalationRate: this.metrics.reportsProcessed > 0
        ? (this.metrics.escalations / this.metrics.reportsProcessed * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Update pipeline metrics
   * @param {Object} result - Processing result
   */
  updateMetrics(result) {
    this.metrics.reportsProcessed++;

    if (result.stages.some(s => s.stage === 'aiAnalysis' && s.data?.autoAction)) {
      this.metrics.autoActions++;
    }

    if (result.stages.some(s => s.stage === 'humanReview')) {
      this.metrics.manualReviews++;
    }

    if (result.escalated) {
      this.metrics.escalations++;
    }

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.reportsProcessed - 1) + result.processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.reportsProcessed;
  }

  /**
   * Chunk array for batch processing
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ========================================
// PIPELINE STAGE IMPLEMENTATIONS
// ========================================

class ReportIngestionStage {
  async execute(report) {
    // Validate basic report structure
    if (!report.id || !report.reporterId || !report.flagType) {
      throw new Error('Invalid report structure: missing required fields');
    }

    // Add ingestion metadata
    return {
      status: REPORT_STATUS.VALIDATING,
      ingestedAt: new Date().toISOString(),
      ingestionSource: report.source || 'api',
      priority: this.calculateInitialPriority(report)
    };
  }

  calculateInitialPriority(report) {
    if (report.severity === REPORT_SEVERITY.CRITICAL) return 'urgent';
    if (report.severity === REPORT_SEVERITY.HIGH) return 'high';
    return 'normal';
  }
}

class ReportValidationStage {
  async execute(report) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate required fields
    if (!report.reason || report.reason.length < 10) {
      validationResults.errors.push('Report reason must be at least 10 characters');
      validationResults.isValid = false;
    }

    // Validate target (at least one must be specified)
    if (!report.reportedUserId && !report.reportedPostId && !report.reportedCommentId) {
      validationResults.errors.push('At least one target (user, post, or comment) must be specified');
      validationResults.isValid = false;
    }

    // Validate evidence URLs if provided
    if (report.evidenceUrls && report.evidenceUrls.length > 0) {
      const invalidUrls = report.evidenceUrls.filter(url => !this.isValidUrl(url));
      if (invalidUrls.length > 0) {
        validationResults.warnings.push(`Invalid evidence URLs: ${invalidUrls.join(', ')}`);
      }
    }

    return {
      status: validationResults.isValid ? REPORT_STATUS.TRIAGE : REPORT_STATUS.DISMISSED,
      validationResults,
      validatedAt: new Date().toISOString()
    };
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

class ReportDeduplicationStage {
  async execute(report) {
    // This would typically query the database for duplicate reports
    // For now, return a placeholder implementation
    
    const duplicateCheck = {
      isDuplicate: false,
      duplicateOf: null,
      similarityScore: 0
    };

    // Simple duplicate detection logic (placeholder)
    if (report.similarReports && report.similarReports.length > 0) {
      const highSimilarity = report.similarReports.filter(r => r.similarity > 0.8);
      if (highSimilarity.length > 0) {
        duplicateCheck.isDuplicate = true;
        duplicateCheck.duplicateOf = highSimilarity[0].id;
        duplicateCheck.similarityScore = highSimilarity[0].similarity;
      }
    }

    return {
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateOfId: duplicateCheck.duplicateOf,
      similarityScore: duplicateCheck.similarityScore,
      deduplicatedAt: new Date().toISOString()
    };
  }
}

class TriageStage {
  async execute(report) {
    const triageResult = {
      severity: report.severity || REPORT_SEVERITY.MEDIUM,
      priority: 'normal',
      requiresHumanReview: false,
      autoEscalate: false,
      estimatedComplexity: 'low'
    };

    // Determine if human review is needed
    if (report.severity === REPORT_SEVERITY.CRITICAL || 
        report.severity === REPORT_SEVERITY.HIGH ||
        report.flagType === FLAG_TYPE.HARASSMENT ||
        report.flagType === FLAG_TYPE.VIOLENCE) {
      triageResult.requiresHumanReview = true;
      triageResult.priority = 'high';
    }

    // Check for escalation triggers
    if (this.checkEscalationTriggers(report)) {
      triageResult.autoEscalate = true;
      triageResult.priority = 'urgent';
    }

    // Estimate complexity
    triageResult.estimatedComplexity = this.estimateComplexity(report);

    return {
      ...triageResult,
      triagedAt: new Date().toISOString(),
      assignedQueue: this.determineQueue(triageResult)
    };
  }

  checkEscalationTriggers(report) {
    // Check various escalation conditions
    if (report.severity === REPORT_SEVERITY.CRITICAL) return true;
    if (report.reportedUserTrustLevel === 'VIP') return true;
    if (report.legalRisk) return true;
    if (report.mediaAttention) return true;
    return false;
  }

  estimateComplexity(report) {
    let complexity = 0;
    
    if (report.evidenceUrls && report.evidenceUrls.length > 3) complexity++;
    if (report.description && report.description.length > 1000) complexity++;
    if (report.flagType === FLAG_TYPE.HARASSMENT) complexity++;
    if (report.multipleViolations) complexity++;

    return complexity > 2 ? 'high' : complexity > 0 ? 'medium' : 'low';
  }

  determineQueue(triageResult) {
    if (triageResult.autoEscalate) return 'escalation';
    if (triageResult.priority === 'urgent') return 'urgent';
    if (triageResult.priority === 'high') return 'high-priority';
    return 'standard';
  }
}

class AIAnalysisStage {
  constructor(enabled) {
    this.enabled = enabled;
  }

  async execute(report) {
    if (!this.enabled) {
      return { aiSkipped: true, reason: 'AI analysis disabled' };
    }

    const aiResult = {
      confidence: 0.5,
      recommendations: [],
      riskLevel: 'medium',
      autoAction: false,
      analysisDetails: {}
    };

    try {
      // Simulate AI analysis (placeholder implementation)
      aiResult.confidence = this.calculateConfidence(report);
      aiResult.riskLevel = this.assessRisk(report);
      aiResult.recommendations = this.generateRecommendations(report, aiResult.confidence);
      aiResult.analysisDetails = await this.performDetailedAnalysis(report);

      // Determine if auto-action should be taken
      aiResult.autoAction = aiResult.confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH;

      return {
        ...aiResult,
        analyzedAt: new Date().toISOString(),
        modelVersion: '1.0.0'
      };

    } catch (error) {
      return {
        aiError: true,
        error: error.message,
        fallbackToHuman: true
      };
    }
  }

  calculateConfidence(report) {
    // Placeholder confidence calculation
    let confidence = 0.5;

    if (report.severity === REPORT_SEVERITY.CRITICAL) confidence += 0.3;
    if (report.evidenceUrls && report.evidenceUrls.length > 0) confidence += 0.1;
    if (report.description && report.description.length > 500) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  assessRisk(report) {
    if (report.severity === REPORT_SEVERITY.CRITICAL) return 'critical';
    if (report.severity === REPORT_SEVERITY.HIGH) return 'high';
    if (report.flagType === FLAG_TYPE.HARASSMENT || report.flagType === FLAG_TYPE.VIOLENCE) return 'high';
    return 'medium';
  }

  generateRecommendations(report, confidence) {
    const recommendations = [];

    if (confidence > AI_CONFIDENCE_THRESHOLDS.HIGH) {
      recommendations.push('auto_action');
    } else if (confidence > AI_CONFIDENCE_THRESHOLDS.MEDIUM) {
      recommendations.push('human_review');
    } else {
      recommendations.push('escalate');
    }

    return recommendations;
  }

  async performDetailedAnalysis(report) {
    // Placeholder for detailed AI analysis
    return {
      sentimentAnalysis: { score: 0.2, label: 'negative' },
      toxicityScore: 0.7,
      spamProbability: 0.1,
      categoryScores: {
        harassment: 0.6,
        spam: 0.1,
        inappropriate: 0.3
      }
    };
  }
}

class HumanReviewStage {
  constructor(enabled) {
    this.enabled = enabled;
  }

  async execute(report) {
    if (!this.enabled) {
      return { humanReviewSkipped: true, reason: 'Human review disabled' };
    }

    // Check if human review is actually needed
    if (!report.requiresHumanReview && !report.aiError) {
      return { humanReviewSkipped: true, reason: 'Not required' };
    }

    return {
      requiresHumanReview: true,
      assignedTo: null, // Will be assigned by queue system
      priority: report.priority || 'normal',
      queue: report.assignedQueue || 'standard',
      estimatedReviewTime: this.estimateReviewTime(report),
      queuedAt: new Date().toISOString()
    };
  }

  estimateReviewTime(report) {
    if (report.priority === 'urgent') return 15; // minutes
    if (report.priority === 'high') return 120; // minutes
    return 1440; // 24 hours for standard
  }
}

class EscalationStage {
  async execute(report) {
    if (!report.autoEscalate && !report.escalate) {
      return { escalationNotRequired: true };
    }

    const escalation = {
      escalated: true,
      escalationLevel: this.determineEscalationLevel(report),
      escalatedTo: this.determineEscalationTarget(report),
      reason: report.escalationReason || 'Auto-escalation based on severity',
      escalatedAt: new Date().toISOString()
    };

    this.emit('escalated', escalation);

    return escalation;
  }

  determineEscalationLevel(report) {
    if (report.severity === REPORT_SEVERITY.CRITICAL) return 'level4';
    if (report.reportedUserTrustLevel === 'VIP') return 'level3';
    if (report.legalRisk) return 'level4';
    return 'level2';
  }

  determineEscalationTarget(report) {
    const level = this.determineEscalationLevel(report);
    const targets = {
      level1: 'Senior Moderator',
      level2: 'Admin',
      level3: 'Super Admin',
      level4: 'Legal Team'
    };
    return targets[level] || 'Admin';
  }
}

class ActionStage {
  async execute(report) {
    const actions = [];

    // AI-based auto actions
    if (report.autoAction) {
      actions.push({
        type: 'auto_action',
        action: this.determineAutoAction(report),
        confidence: report.confidence,
        executedAt: new Date().toISOString()
      });
    }

    // Escalation actions
    if (report.escalated) {
      actions.push({
        type: 'escalation',
        level: report.escalationLevel,
        target: report.escalatedTo,
        executedAt: new Date().toISOString()
      });
    }

    return {
      actions,
      actionTaken: actions.length > 0,
      processedAt: new Date().toISOString()
    };
  }

  determineAutoAction(report) {
    if (report.riskLevel === 'critical') return 'content_removal';
    if (report.riskLevel === 'high') return 'user_warning';
    return 'monitor';
  }
}

class NotificationStage {
  async execute(report) {
    const notifications = [];

    // Notify reporter
    notifications.push({
      type: 'reporter_notification',
      recipient: report.reporterId,
      template: 'report_received',
      data: { reportId: report.id, status: report.status }
    });

    // Notify moderators if human review required
    if (report.requiresHumanReview) {
      notifications.push({
        type: 'moderator_notification',
        recipient: 'moderation_queue',
        template: 'new_report_for_review',
        data: { reportId: report.id, priority: report.priority }
      });
    }

    // Notify admins if escalated
    if (report.escalated) {
      notifications.push({
        type: 'admin_notification',
        recipient: report.escalatedTo,
        template: 'report_escalated',
        data: { reportId: report.id, level: report.escalationLevel }
      });
    }

    return {
      notifications,
      notificationSent: notifications.length > 0,
      processedAt: new Date().toISOString()
    };
  }
}

export default ModerationPipeline;
