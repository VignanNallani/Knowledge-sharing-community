/**
 * Enforcement Engine
 * Week-3 Ownership Feature Build
 * Comprehensive enforcement actions and penalty management
 */

import { 
  ACTION_TYPE, 
  WARNING_TYPE, 
  RESTRICTION_TYPE, 
  SUSPENSION_LEVEL,
  BAN_CATEGORY,
  SHADOW_BAN_TYPE,
  TRUST_LEVELS 
} from '../shared/constants.js';
import { EventEmitter, calculateTimeDifference } from '../shared/utils.js';

export class EnforcementEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableWarnings: true,
      enableRestrictions: true,
      enableSuspensions: true,
      enableBans: true,
      enableShadowBans: true,
      autoAppealWindow: 7, // days
      maxAppealsPerAction: 3,
      ...options
    };

    // Active enforcement tracking
    this.activeEnforcements = new Map(); // userId -> enforcement records
    this.enforcementHistory = new Map(); // userId -> historical records
    this.appealTracker = new Map(); // actionId -> appeal records
  }

  /**
   * Execute enforcement action
   * @param {Object} action - Action details
   * @returns {Object} Action result
   */
  async executeAction(action) {
    try {
      const validationResult = await this.validateAction(action);
      if (!validationResult.isValid) {
        throw new Error(`Invalid action: ${validationResult.errors.join(', ')}`);
      }

      let result;
      switch (action.type) {
        case ACTION_TYPE.WARNING:
          result = await this.executeWarning(action);
          break;
        case ACTION_TYPE.CONTENT_REMOVAL:
          result = await this.executeContentRemoval(action);
          break;
        case ACTION_TYPE.USER_SUSPENSION:
          result = await this.executeSuspension(action);
          break;
        case ACTION_TYPE.USER_BAN:
          result = await this.executeBan(action);
          break;
        case ACTION_TYPE.TRUST_DEDUCTION:
          result = await this.executeTrustDeduction(action);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Record action in history
      await this.recordAction(action, result);

      // Emit action executed event
      this.emit('actionExecuted', { action, result });

      return result;

    } catch (error) {
      this.emit('actionError', { action, error: error.message });
      throw error;
    }
  }

  /**
   * Execute warning action
   * @param {Object} action - Warning action details
   * @returns {Object} Warning result
   */
  async executeWarning(action) {
    const warning = {
      id: this.generateActionId(),
      type: ACTION_TYPE.WARNING,
      userId: action.targetUserId,
      warningType: action.warningType || WARNING_TYPE.FORMAL,
      reason: action.reason,
      details: action.details,
      severity: action.severity || 'medium',
      issuedBy: action.issuedBy,
      issuedAt: new Date().toISOString(),
      expiresAt: this.calculateWarningExpiry(action.warningType),
      acknowledged: false,
      acknowledgedAt: null
    };

    // Add to user's active enforcements
    this.addToActiveEnforcements(action.targetUserId, warning);

    // Check for escalation based on warning history
    const escalationCheck = await this.checkWarningEscalation(action.targetUserId);
    if (escalationCheck.shouldEscalate) {
      warning.escalationRecommended = escalationCheck.recommendation;
    }

    return {
      success: true,
      actionId: warning.id,
      warning,
      escalationRecommended: escalationCheck.shouldEscalate
    };
  }

  /**
   * Execute content removal action
   * @param {Object} action - Content removal action details
   * @returns {Object} Removal result
   */
  async executeContentRemoval(action) {
    const removal = {
      id: this.generateActionId(),
      type: ACTION_TYPE.CONTENT_REMOVAL,
      userId: action.targetUserId,
      contentType: action.contentType,
      contentId: action.contentId,
      reason: action.reason,
      details: action.details,
      issuedBy: action.issuedBy,
      issuedAt: new Date().toISOString(),
      permanent: action.permanent || false,
      restorable: !action.permanent,
      restorationWindow: action.permanent ? null : 30 // days
    };

    // Add to user's enforcement history
    this.addToEnforcementHistory(action.targetUserId, removal);

    // Check if pattern suggests escalation
    const patternAnalysis = await this.analyzeRemovalPattern(action.targetUserId);
    if (patternAnalysis.suspiciousPattern) {
      removal.patternFlag = true;
      removal.recommendation = patternAnalysis.recommendation;
    }

    return {
      success: true,
      actionId: removal.id,
      removal,
      patternAnalysis
    };
  }

  /**
   * Execute user suspension
   * @param {Object} action - Suspension action details
   * @returns {Object} Suspension result
   */
  async executeSuspension(action) {
    const suspensionLevel = this.determineSuspensionLevel(action);
    const suspension = {
      id: this.generateActionId(),
      type: ACTION_TYPE.USER_SUSPENSION,
      userId: action.targetUserId,
      level: suspensionLevel,
      duration: suspensionLevel.duration,
      durationUnit: suspensionLevel.days ? 'days' : 'hours',
      reason: action.reason,
      details: action.details,
      issuedBy: action.issuedBy,
      issuedAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: this.calculateSuspensionEndDate(suspensionLevel),
      restrictions: this.determineSuspensionRestrictions(suspensionLevel),
      appealable: true,
      appealWindow: this.options.autoAppealWindow,
      active: true
    };

    // Add to active enforcements
    this.addToActiveEnforcements(action.targetUserId, suspension);

    // Apply restrictions immediately
    await this.applyRestrictions(action.targetUserId, suspension.restrictions);

    // Schedule suspension end
    this.scheduleSuspensionEnd(suspension);

    return {
      success: true,
      actionId: suspension.id,
      suspension,
      restrictionsApplied: suspension.restrictions
    };
  }

  /**
   * Execute user ban
   * @param {Object} action - Ban action details
   * @returns {Object} Ban result
   */
  async executeBan(action) {
    const ban = {
      id: this.generateActionId(),
      type: ACTION_TYPE.USER_BAN,
      userId: action.targetUserId,
      category: action.category || BAN_CATEGORY.PLATFORM,
      reason: action.reason,
      details: action.details,
      issuedBy: action.issuedBy,
      issuedAt: new Date().toISOString(),
      permanent: action.permanent !== false, // Default to permanent
      duration: action.duration, // Only for temporary bans
      endDate: action.duration ? this.calculateBanEndDate(action.duration) : null,
      appealable: action.appealable !== false, // Default to appealable
      evidence: action.evidence || [],
      legalReference: action.legalReference || null,
      ipBan: action.ipBan || false,
      deviceBan: action.deviceBan || false
    };

    // Add to enforcement history
    this.addToEnforcementHistory(action.targetUserId, ban);

    // Apply ban immediately
    await this.applyBan(action.targetUserId, ban);

    // Remove from active enforcements (ban is permanent state)
    this.removeFromActiveEnforcements(action.targetUserId);

    return {
      success: true,
      actionId: ban.id,
      ban,
      banApplied: true
    };
  }

  /**
   * Execute trust score deduction
   * @param {Object} action - Trust deduction action details
   * @returns {Object} Deduction result
   */
  async executeTrustDeduction(action) {
    const deduction = {
      id: this.generateActionId(),
      type: ACTION_TYPE.TRUST_DEDUCTION,
      userId: action.targetUserId,
      amount: action.amount,
      reason: action.reason,
      previousScore: action.previousScore,
      newScore: action.previousScore - action.amount,
      issuedBy: action.issuedBy,
      issuedAt: new Date().toISOString(),
      recoveryPath: this.determineRecoveryPath(action.amount),
      decayRate: this.calculateDecayRate(action.amount)
    };

    // Check if deduction crosses trust level threshold
    const levelChange = this.checkTrustLevelChange(
      action.previousScore, 
      deduction.newScore
    );

    if (levelChange.changed) {
      deduction.levelChange = {
        previous: levelChange.previous,
        new: levelChange.new,
        consequences: this.getTrustLevelConsequences(levelChange.new)
      };
    }

    // Add to enforcement history
    this.addToEnforcementHistory(action.targetUserId, deduction);

    return {
      success: true,
      actionId: deduction.id,
      deduction,
      levelChange: levelChange.changed ? levelChange : null
    };
  }

  /**
   * Apply shadow ban to user
   * @param {number} userId - User ID
   * @param {Object} options - Shadow ban options
   * @returns {Object} Shadow ban result
   */
  async applyShadowBan(userId, options = {}) {
    const shadowBan = {
      id: this.generateActionId(),
      type: 'SHADOW_BAN',
      userId,
      banTypes: options.types || [SHADOW_BAN_TYPE.CONTENT],
      severity: options.severity || 'medium',
      reason: options.reason,
      issuedBy: options.issuedBy,
      issuedAt: new Date().toISOString(),
      duration: options.duration || 30, // days
      endDate: this.calculateShadowBanEndDate(options.duration),
      detectionPrevention: options.detectionPrevention !== false,
      stealthLevel: options.stealthLevel || 'medium'
    };

    // Add to active enforcements (hidden from user)
    this.addToActiveEnforcements(userId, shadowBan, true); // hidden = true

    // Apply shadow ban restrictions
    await this.applyShadowBanRestrictions(userId, shadowBan);

    return {
      success: true,
      actionId: shadowBan.id,
      shadowBan
    };
  }

  /**
   * Check and update active enforcements
   * @param {number} userId - User ID
   * @returns {Array} Updated enforcements
   */
  async updateActiveEnforcements(userId) {
    const userEnforcements = this.activeEnforcements.get(userId) || [];
    const now = new Date();
    const updated = [];

    for (const enforcement of userEnforcements) {
      if (enforcement.endDate && new Date(enforcement.endDate) <= now) {
        // Enforcement has expired
        await this.expireEnforcement(enforcement);
      } else {
        updated.push(enforcement);
      }
    }

    this.activeEnforcements.set(userId, updated);
    return updated;
  }

  /**
   * Process appeal for enforcement action
   * @param {Object} appeal - Appeal details
   * @returns {Object} Appeal result
   */
  async processAppeal(appeal) {
    const action = await this.getAction(appeal.actionId);
    if (!action) {
      throw new Error('Action not found');
    }

    if (!action.appealable) {
      throw new Error('Action is not appealable');
    }

    const appealRecord = {
      id: this.generateAppealId(),
      actionId: appeal.actionId,
      userId: appeal.userId,
      reason: appeal.reason,
      description: appeal.description,
      evidence: appeal.evidence || [],
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      decision: null,
      decisionReason: null
    };

    // Add to appeal tracker
    this.appealTracker.set(appealRecord.id, appealRecord);

    // Queue for review
    this.emit('appealSubmitted', appealRecord);

    return {
      success: true,
      appealId: appealRecord.id,
      appeal: appealRecord
    };
  }

  /**
   * Get user's current enforcement status
   * @param {number} userId - User ID
   * @returns {Object} Enforcement status
   */
  async getUserEnforcementStatus(userId) {
    const activeEnforcements = this.activeEnforcements.get(userId) || [];
    const enforcementHistory = this.enforcementHistory.get(userId) || [];

    // Update active enforcements
    await this.updateActiveEnforcements(userId);

    return {
      userId,
      activeEnforcements: this.activeEnforcements.get(userId) || [],
      totalActions: enforcementHistory.length,
      currentRestrictions: this.getCurrentRestrictions(userId),
      trustScoreImpact: this.calculateTrustScoreImpact(enforcementHistory),
      appealEligibility: this.getAppealEligibility(userId),
      nextReviewDate: this.getNextReviewDate(userId)
    };
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  validateAction(action) {
    const errors = [];

    if (!action.type) errors.push('Action type is required');
    if (!action.targetUserId) errors.push('Target user ID is required');
    if (!action.issuedBy) errors.push('Issuer is required');
    if (!action.reason) errors.push('Reason is required');

    // Type-specific validation
    switch (action.type) {
      case ACTION_TYPE.USER_SUSPENSION:
        if (!action.duration && !action.level) {
          errors.push('Suspension duration or level is required');
        }
        break;
      case ACTION_TYPE.USER_BAN:
        if (!action.category) {
          errors.push('Ban category is required');
        }
        break;
      case ACTION_TYPE.TRUST_DEDUCTION:
        if (!action.amount || action.amount <= 0) {
          errors.push('Valid deduction amount is required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  calculateWarningExpiry(warningType) {
    const expiryPeriods = {
      [WARNING_TYPE.INFORMAL]: 7, // days
      [WARNING_TYPE.FORMAL]: 30,
      [WARNING_TYPE.FINAL]: 90,
      [WARNING_TYPE.LEGAL]: 365
    };

    const days = expiryPeriods[warningType] || 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
  }

  determineSuspensionLevel(action) {
    if (action.level) {
      return SUSPENSION_LEVEL[action.level] || SUSPENSION_LEVEL.LEVEL_1;
    }

    // Auto-determine level based on history and severity
    const userHistory = this.enforcementHistory.get(action.targetUserId) || [];
    const recentSuspensions = userHistory.filter(h => 
      h.type === ACTION_TYPE.USER_SUSPENSION && 
      this.isWithinLastDays(h.issuedAt, 90)
    );

    if (recentSuspensions.length >= 3) return SUSPENSION_LEVEL.LEVEL_4;
    if (recentSuspensions.length >= 2) return SUSPENSION_LEVEL.LEVEL_3;
    if (recentSuspensions.length >= 1) return SUSPENSION_LEVEL.LEVEL_2;
    return SUSPENSION_LEVEL.LEVEL_1;
  }

  calculateSuspensionEndDate(level) {
    const endDate = new Date();
    if (level.days) {
      endDate.setDate(endDate.getDate() + level.duration);
    } else {
      endDate.setHours(endDate.getHours() + level.duration);
    }
    return endDate.toISOString();
  }

  determineSuspensionRestrictions(level) {
    const baseRestrictions = [RESTRICTION_TYPE.POSTING, RESTRICTION_TYPE.COMMENTING];
    
    if (level.duration >= 7) {
      baseRestrictions.push(RESTRICTION_TYPE.MESSAGING);
    }
    if (level.duration >= 30) {
      baseRestrictions.push(RESTRICTION_TYPE.GROUP_CREATION, RESTRICTION_TYPE.EVENT_CREATION);
    }

    return baseRestrictions;
  }

  async applyRestrictions(userId, restrictions) {
    // This would integrate with the actual user permission system
    this.emit('restrictionsApplied', { userId, restrictions });
  }

  scheduleSuspensionEnd(suspension) {
    const endTime = new Date(suspension.endDate).getTime();
    const now = Date.now();
    const delay = endTime - now;

    if (delay > 0) {
      setTimeout(async () => {
        await this.expireSuspension(suspension);
      }, delay);
    }
  }

  async expireSuspension(suspension) {
    suspension.active = false;
    suspension.endedAt = new Date().toISOString();
    
    // Remove from active enforcements
    this.removeFromActiveEnforcements(suspension.userId, suspension.id);

    // Restore user access
    await this.restoreUserAccess(suspension.userId, suspension.restrictions);

    this.emit('suspensionExpired', suspension);
  }

  async restoreUserAccess(userId, restrictions) {
    // This would integrate with the actual user permission system
    this.emit('accessRestored', { userId, restrictions });
  }

  calculateBanEndDate(duration) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);
    return endDate.toISOString();
  }

  async applyBan(userId, ban) {
    // This would integrate with the actual authentication system
    this.emit('banApplied', { userId, ban });
  }

  determineRecoveryPath(amount) {
    if (amount <= 5) return 'automatic';
    if (amount <= 15) return 'activity_based';
    if (amount <= 25) return 'manual_review';
    return 'extended_rehabilitation';
  }

  calculateDecayRate(amount) {
    // Higher deductions decay slower
    return Math.max(0.02, 0.1 - (amount * 0.002));
  }

  checkTrustLevelChange(previousScore, newScore) {
    const previousLevel = this.getTrustLevelFromScore(previousScore);
    const newLevel = this.getTrustLevelFromScore(newScore);

    return {
      changed: previousLevel !== newLevel,
      previous: previousLevel,
      new: newLevel
    };
  }

  getTrustLevelFromScore(score) {
    for (const [level, config] of Object.entries(TRUST_LEVELS)) {
      if (score >= config.min && score <= config.max) {
        return level;
      }
    }
    return 'NEW';
  }

  getTrustLevelConsequences(level) {
    const consequences = {
      [TRUST_LEVELS.SUSPENDED]: ['all_access_revoked'],
      [TRUST_LEVELS.RESTRICTED]: ['limited_posting', 'increased_monitoring'],
      [TRUST_LEVELS.NEW]: ['standard_restrictions'],
      [TRUST_LEVELS.ESTABLISHED]: ['reduced_restrictions'],
      [TRUST_LEVELS.TRUSTED]: ['enhanced_privileges'],
      [TRUST_LEVELS.VIP]: ['full_privileges']
    };

    return consequences[level] || [];
  }

  calculateShadowBanEndDate(duration) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);
    return endDate.toISOString();
  }

  async applyShadowBanRestrictions(userId, shadowBan) {
    // This would integrate with content visibility systems
    this.emit('shadowBanApplied', { userId, shadowBan });
  }

  async expireEnforcement(enforcement) {
    enforcement.active = false;
    enforcement.endedAt = new Date().toISOString();
    this.removeFromActiveEnforcements(enforcement.userId, enforcement.id);
    this.emit('enforcementExpired', enforcement);
  }

  async getAction(actionId) {
    // Search through active enforcements and history
    for (const [userId, enforcements] of this.activeEnforcements) {
      const found = enforcements.find(e => e.id === actionId);
      if (found) return found;
    }

    for (const [userId, history] of this.enforcementHistory) {
      const found = history.find(h => h.id === actionId);
      if (found) return found;
    }

    return null;
  }

  generateActionId() {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateAppealId() {
    return `apl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addToActiveEnforcements(userId, enforcement, hidden = false) {
    if (!this.activeEnforcements.has(userId)) {
      this.activeEnforcements.set(userId, []);
    }
    const enforcements = this.activeEnforcements.get(userId);
    enforcements.push({ ...enforcement, hidden });
  }

  removeFromActiveEnforcements(userId, enforcementId = null) {
    if (!this.activeEnforcements.has(userId)) return;

    if (enforcementId) {
      const enforcements = this.activeEnforcements.get(userId);
      const filtered = enforcements.filter(e => e.id !== enforcementId);
      this.activeEnforcements.set(userId, filtered);
    } else {
      this.activeEnforcements.delete(userId);
    }
  }

  addToEnforcementHistory(userId, enforcement) {
    if (!this.enforcementHistory.has(userId)) {
      this.enforcementHistory.set(userId, []);
    }
    const history = this.enforcementHistory.get(userId);
    history.push(enforcement);
  }

  isWithinLastDays(dateString, days) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }

  getCurrentRestrictions(userId) {
    const activeEnforcements = this.activeEnforcements.get(userId) || [];
    const restrictions = new Set();

    activeEnforcements.forEach(enforcement => {
      if (enforcement.restrictions) {
        enforcement.restrictions.forEach(r => restrictions.add(r));
      }
    });

    return Array.from(restrictions);
  }

  calculateTrustScoreImpact(history) {
    const trustDeductions = history.filter(h => h.type === ACTION_TYPE.TRUST_DEDUCTION);
    return {
      totalDeductions: trustDeductions.length,
      totalPointsLost: trustDeductions.reduce((sum, d) => sum + d.amount, 0),
      lastDeduction: trustDeductions.length > 0 ? 
        trustDeductions[trustDeductions.length - 1].issuedAt : null
    };
  }

  getAppealEligibility(userId) {
    const activeEnforcements = this.activeEnforcements.get(userId) || [];
    const appealableActions = activeEnforcements.filter(e => e.appealable);
    
    return {
      canAppeal: appealableActions.length > 0,
      appealableActions: appealableActions.map(a => ({
        actionId: a.id,
        type: a.type,
        appealWindow: a.appealWindow
      })),
      maxAppeals: this.options.maxAppealsPerAction
    };
  }

  getNextReviewDate(userId) {
    const activeEnforcements = this.activeEnforcements.get(userId) || [];
    const endDates = activeEnforcements
      .filter(e => e.endDate)
      .map(e => new Date(e.endDate));

    return endDates.length > 0 ? 
      new Date(Math.min(...endDates)).toISOString() : null;
  }

  async checkWarningEscalation(userId) {
    const history = this.enforcementHistory.get(userId) || [];
    const recentWarnings = history.filter(h => 
      h.type === ACTION_TYPE.WARNING && 
      this.isWithinLastDays(h.issuedAt, 90)
    );

    const shouldEscalate = recentWarnings.length >= 3;
    const recommendation = shouldEscalate ? 'consider_suspension' : null;

    return { shouldEscalate, recommendation };
  }

  async analyzeRemovalPattern(userId) {
    const history = this.enforcementHistory.get(userId) || [];
    const recentRemovals = history.filter(h => 
      h.type === ACTION_TYPE.CONTENT_REMOVAL && 
      this.isWithinLastDays(h.issuedAt, 30)
    );

    const suspiciousPattern = recentRemovals.length >= 5;
    const recommendation = suspiciousPattern ? 'consider_suspension' : null;

    return { suspiciousPattern, recommendation };
  }
}

export default EnforcementEngine;
