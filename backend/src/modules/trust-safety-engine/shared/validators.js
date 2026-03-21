/**
 * Trust & Safety Engine Validators
 * Week-3 Ownership Feature Build
 * Input validation and sanitization for all engines
 */

import { 
  VALIDATION_RULES, 
  REPORT_SEVERITY, 
  REPORT_STATUS, 
  ACTION_TYPE, 
  TRUST_LEVELS,
  APPEAL_STATUS,
  FLAG_TYPE,
  CONTENT_TYPE
} from './constants.js';
import { sanitizeString, isValidEmail, isValidUrl } from './utils.js';

/**
 * Base validator class
 */
export class BaseValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  addError(field, message) {
    this.errors.push({ field, message });
  }

  addWarning(field, message) {
    this.warnings.push({ field, message });
  }

  isValid() {
    return this.errors.length === 0;
  }

  getResult() {
    return {
      isValid: this.isValid(),
      errors: this.errors,
      warnings: this.warnings
    };
  }

  reset() {
    this.errors = [];
    this.warnings = [];
  }
}

/**
 * Trust Score validator
 */
export class TrustScoreValidator extends BaseValidator {
  validateTrustScoreUpdate(data) {
    this.reset();

    // Validate user ID
    if (!data.userId || typeof data.userId !== 'number' || data.userId < 1) {
      this.addError('userId', 'Valid user ID is required');
    }

    // Validate score ranges
    if (data.contentQualityScore !== undefined) {
      if (typeof data.contentQualityScore !== 'number' || 
          data.contentQualityScore < 0 || 
          data.contentQualityScore > 100) {
        this.addError('contentQualityScore', 'Content quality score must be between 0 and 100');
      }
    }

    if (data.communityEngagementScore !== undefined) {
      if (typeof data.communityEngagementScore !== 'number' || 
          data.communityEngagementScore < 0 || 
          data.communityEngagementScore > 100) {
        this.addError('communityEngagementScore', 'Community engagement score must be between 0 and 100');
      }
    }

    if (data.reliabilityScore !== undefined) {
      if (typeof data.reliabilityScore !== 'number' || 
          data.reliabilityScore < 0 || 
          data.reliabilityScore > 100) {
        this.addError('reliabilityScore', 'Reliability score must be between 0 and 100');
      }
    }

    // Validate trust level
    if (data.trustLevel) {
      const validLevels = Object.keys(TRUST_LEVELS);
      if (!validLevels.includes(data.trustLevel)) {
        this.addError('trustLevel', `Trust level must be one of: ${validLevels.join(', ')}`);
      }
    }

    // Validate reason for manual updates
    if (data.reason && typeof data.reason !== 'string') {
      this.addError('reason', 'Reason must be a string');
    } else if (data.reason && data.reason.length < VALIDATION_RULES.REASON_MIN_LENGTH) {
      this.addError('reason', `Reason must be at least ${VALIDATION_RULES.REASON_MIN_LENGTH} characters`);
    } else if (data.reason && data.reason.length > VALIDATION_RULES.REASON_MAX_LENGTH) {
      this.addError('reason', `Reason must not exceed ${VALIDATION_RULES.REASON_MAX_LENGTH} characters`);
    }

    return this.getResult();
  }

  validateTrustScoreQuery(params) {
    this.reset();

    // Validate user ID
    if (params.userId && (typeof params.userId !== 'number' || params.userId < 1)) {
      this.addError('userId', 'User ID must be a positive integer');
    }

    // Validate trust level filter
    if (params.trustLevel) {
      const validLevels = Object.keys(TRUST_LEVELS);
      if (!validLevels.includes(params.trustLevel)) {
        this.addError('trustLevel', `Trust level must be one of: ${validLevels.join(', ')}`);
      }
    }

    // Validate score range
    if (params.minScore !== undefined) {
      if (typeof params.minScore !== 'number' || params.minScore < 0 || params.minScore > 100) {
        this.addError('minScore', 'Minimum score must be between 0 and 100');
      }
    }

    if (params.maxScore !== undefined) {
      if (typeof params.maxScore !== 'number' || params.maxScore < 0 || params.maxScore > 100) {
        this.addError('maxScore', 'Maximum score must be between 0 and 100');
      }
    }

    if (params.minScore !== undefined && params.maxScore !== undefined && params.minScore > params.maxScore) {
      this.addError('scoreRange', 'Minimum score cannot be greater than maximum score');
    }

    return this.getResult();
  }
}

/**
 * Report validator
 */
export class ReportValidator extends BaseValidator {
  validateReportCreation(data) {
    this.reset();

    // Validate reporter ID
    if (!data.reporterId || typeof data.reporterId !== 'number' || data.reporterId < 1) {
      this.addError('reporterId', 'Valid reporter ID is required');
    }

    // Validate at least one target
    const hasTarget = data.reportedUserId || data.reportedPostId || data.reportedCommentId;
    if (!hasTarget) {
      this.addError('target', 'At least one target (user, post, or comment) must be specified');
    }

    // Validate target IDs
    if (data.reportedUserId && (typeof data.reportedUserId !== 'number' || data.reportedUserId < 1)) {
      this.addError('reportedUserId', 'Reported user ID must be a positive integer');
    }

    if (data.reportedPostId && (typeof data.reportedPostId !== 'number' || data.reportedPostId < 1)) {
      this.addError('reportedPostId', 'Reported post ID must be a positive integer');
    }

    if (data.reportedCommentId && (typeof data.reportedCommentId !== 'number' || data.reportedCommentId < 1)) {
      this.addError('reportedCommentId', 'Reported comment ID must be a positive integer');
    }

    // Validate severity
    if (data.severity) {
      const validSeverities = Object.values(REPORT_SEVERITY);
      if (!validSeverities.includes(data.severity)) {
        this.addError('severity', `Severity must be one of: ${validSeverities.join(', ')}`);
      }
    }

    // Validate flag type
    if (!data.flagType || !Object.values(FLAG_TYPE).includes(data.flagType)) {
      this.addError('flagType', `Flag type must be one of: ${Object.values(FLAG_TYPE).join(', ')}`);
    }

    // Validate reason
    if (!data.reason || typeof data.reason !== 'string') {
      this.addError('reason', 'Reason is required and must be a string');
    } else if (data.reason.length < VALIDATION_RULES.REASON_MIN_LENGTH) {
      this.addError('reason', `Reason must be at least ${VALIDATION_RULES.REASON_MIN_LENGTH} characters`);
    } else if (data.reason.length > VALIDATION_RULES.REASON_MAX_LENGTH) {
      this.addError('reason', `Reason must not exceed ${VALIDATION_RULES.REASON_MAX_LENGTH} characters`);
    }

    // Validate description
    if (data.description && typeof data.description !== 'string') {
      this.addError('description', 'Description must be a string');
    } else if (data.description && data.description.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      this.addError('description', `Description must not exceed ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`);
    }

    // Validate evidence URLs
    if (data.evidenceUrls) {
      if (!Array.isArray(data.evidenceUrls)) {
        this.addError('evidenceUrls', 'Evidence URLs must be an array');
      } else if (data.evidenceUrls.length > VALIDATION_RULES.MAX_EVIDENCE_URLS) {
        this.addError('evidenceUrls', `Maximum ${VALIDATION_RULES.MAX_EVIDENCE_URLS} evidence URLs allowed`);
      } else {
        data.evidenceUrls.forEach((url, index) => {
          if (typeof url !== 'string' || !isValidUrl(url)) {
            this.addError(`evidenceUrls[${index}]`, 'Each evidence URL must be a valid URL');
          }
        });
      }
    }

    return this.getResult();
  }

  validateReportQuery(params) {
    this.reset();

    // Validate status
    if (params.status) {
      const validStatuses = Object.values(REPORT_STATUS);
      if (!validStatuses.includes(params.status)) {
        this.addError('status', `Status must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Validate severity
    if (params.severity) {
      const validSeverities = Object.values(REPORT_SEVERITY);
      if (!validSeverities.includes(params.severity)) {
        this.addError('severity', `Severity must be one of: ${validSeverities.join(', ')}`);
      }
    }

    // Validate flag type
    if (params.flagType) {
      const validFlags = Object.values(FLAG_TYPE);
      if (!validFlags.includes(params.flagType)) {
        this.addError('flagType', `Flag type must be one of: ${validFlags.join(', ')}`);
      }
    }

    // Validate user IDs
    if (params.reporterId && (typeof params.reporterId !== 'number' || params.reporterId < 1)) {
      this.addError('reporterId', 'Reporter ID must be a positive integer');
    }

    if (params.reportedUserId && (typeof params.reportedUserId !== 'number' || params.reportedUserId < 1)) {
      this.addError('reportedUserId', 'Reported user ID must be a positive integer');
    }

    if (params.assignedModeratorId && (typeof params.assignedModeratorId !== 'number' || params.assignedModeratorId < 1)) {
      this.addError('assignedModeratorId', 'Assigned moderator ID must be a positive integer');
    }

    // Validate pagination
    if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
      this.addError('page', 'Page must be a positive integer');
    }

    if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100)) {
      this.addError('limit', 'Limit must be between 1 and 100');
    }

    return this.getResult();
  }
}

/**
 * Enforcement Action validator
 */
export class EnforcementValidator extends BaseValidator {
  validateEnforcementAction(data) {
    this.reset();

    // Validate action type
    if (!data.actionType || !Object.values(ACTION_TYPE).includes(data.actionType)) {
      this.addError('actionType', `Action type must be one of: ${Object.values(ACTION_TYPE).join(', ')}`);
    }

    // Validate target user ID
    if (!data.targetUserId || typeof data.targetUserId !== 'number' || data.targetUserId < 1) {
      this.addError('targetUserId', 'Valid target user ID is required');
    }

    // Validate issuer
    if (!data.issuedBy || typeof data.issuedBy !== 'number' || data.issuedBy < 1) {
      this.addError('issuedBy', 'Valid issuer ID is required');
    }

    // Validate reason
    if (!data.reason || typeof data.reason !== 'string') {
      this.addError('reason', 'Reason is required and must be a string');
    } else if (data.reason.length < VALIDATION_RULES.REASON_MIN_LENGTH) {
      this.addError('reason', `Reason must be at least ${VALIDATION_RULES.REASON_MIN_LENGTH} characters`);
    }

    // Validate action-specific requirements
    this.validateActionSpecificRequirements(data);

    // Validate trust score change
    if (data.trustScoreChange !== undefined) {
      if (typeof data.trustScoreChange !== 'number' || 
          data.trustScoreChange < VALIDATION_RULES.MIN_TRUST_SCORE_CHANGE || 
          data.trustScoreChange > VALIDATION_RULES.MAX_TRUST_SCORE_CHANGE) {
        this.addError('trustScoreChange', `Trust score change must be between ${VALIDATION_RULES.MIN_TRUST_SCORE_CHANGE} and ${VALIDATION_RULES.MAX_TRUST_SCORE_CHANGE}`);
      }
    }

    return this.getResult();
  }

  validateActionSpecificRequirements(data) {
    switch (data.actionType) {
      case ACTION_TYPE.USER_SUSPENSION:
        if (!data.duration || typeof data.duration !== 'number' || data.duration < 1) {
          this.addError('duration', 'Suspension duration must be a positive number');
        }
        if (data.duration > VALIDATION_RULES.MAX_SUSPENSION_DAYS) {
          this.addError('duration', `Suspension duration cannot exceed ${VALIDATION_RULES.MAX_SUSPENSION_DAYS} days`);
        }
        break;

      case ACTION_TYPE.CONTENT_REMOVAL:
        if (!data.contentType || !Object.values(CONTENT_TYPE).includes(data.contentType)) {
          this.addError('contentType', `Content type must be one of: ${Object.values(CONTENT_TYPE).join(', ')}`);
        }
        if (!data.contentId || typeof data.contentId !== 'number' || data.contentId < 1) {
          this.addError('contentId', 'Valid content ID is required');
        }
        break;

      case ACTION_TYPE.TRUST_DEDUCTION:
        if (data.amount === undefined || typeof data.amount !== 'number' || data.amount <= 0) {
          this.addError('amount', 'Trust deduction amount must be a positive number');
        }
        if (data.previousScore === undefined || typeof data.previousScore !== 'number') {
          this.addError('previousScore', 'Previous trust score is required');
        }
        break;
    }
  }

  validateAppealSubmission(data) {
    this.reset();

    // Validate action ID
    if (!data.actionId || typeof data.actionId !== 'string') {
      this.addError('actionId', 'Valid action ID is required');
    }

    // Validate user ID
    if (!data.userId || typeof data.userId !== 'number' || data.userId < 1) {
      this.addError('userId', 'Valid user ID is required');
    }

    // Validate appeal reason
    if (!data.appealReason || typeof data.appealReason !== 'string') {
      this.addError('appealReason', 'Appeal reason is required and must be a string');
    } else if (data.appealReason.length < VALIDATION_RULES.REASON_MIN_LENGTH) {
      this.addError('appealReason', `Appeal reason must be at least ${VALIDATION_RULES.REASON_MIN_LENGTH} characters`);
    } else if (data.appealReason.length > VALIDATION_RULES.REASON_MAX_LENGTH) {
      this.addError('appealReason', `Appeal reason must not exceed ${VALIDATION_RULES.REASON_MAX_LENGTH} characters`);
    }

    // Validate appeal description
    if (data.appealDescription && typeof data.appealDescription !== 'string') {
      this.addError('appealDescription', 'Appeal description must be a string');
    } else if (data.appealDescription && data.appealDescription.length > VALIDATION_RULES.DESCRIPTION_MAX_LENGTH) {
      this.addError('appealDescription', `Appeal description must not exceed ${VALIDATION_RULES.DESCRIPTION_MAX_LENGTH} characters`);
    }

    // Validate evidence URLs
    if (data.evidenceUrls) {
      if (!Array.isArray(data.evidenceUrls)) {
        this.addError('evidenceUrls', 'Evidence URLs must be an array');
      } else if (data.evidenceUrls.length > VALIDATION_RULES.MAX_EVIDENCE_URLS) {
        this.addError('evidenceUrls', `Maximum ${VALIDATION_RULES.MAX_EVIDENCE_URLS} evidence URLs allowed`);
      } else {
        data.evidenceUrls.forEach((url, index) => {
          if (typeof url !== 'string' || !isValidUrl(url)) {
            this.addError(`evidenceUrls[${index}]`, 'Each evidence URL must be a valid URL');
          }
        });
      }
    }

    return this.getResult();
  }
}

/**
 * Audit Log validator
 */
export class AuditValidator extends BaseValidator {
  validateAuditLog(data) {
    this.reset();

    // Validate log type
    if (!data.logType || typeof data.logType !== 'string') {
      this.addError('logType', 'Log type is required and must be a string');
    }

    // Validate event type
    if (!data.actionType || typeof data.actionType !== 'string') {
      this.addError('actionType', 'Action type is required and must be a string');
    }

    // Validate user ID (optional but must be valid if provided)
    if (data.userId && (typeof data.userId !== 'number' || data.userId < 1)) {
      this.addError('userId', 'User ID must be a positive integer');
    }

    // Validate target ID (optional but must be valid if provided)
    if (data.targetId && typeof data.targetId !== 'string') {
      this.addError('targetId', 'Target ID must be a string');
    }

    // Validate risk level
    if (data.riskLevel) {
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];
      if (!validRiskLevels.includes(data.riskLevel)) {
        this.addError('riskLevel', `Risk level must be one of: ${validRiskLevels.join(', ')}`);
      }
    }

    // Validate details object
    if (data.details && typeof data.details !== 'object') {
      this.addError('details', 'Details must be an object');
    }

    return this.getResult();
  }

  validateAuditQuery(params) {
    this.reset();

    // Validate user ID
    if (params.userId && (typeof params.userId !== 'number' || params.userId < 1)) {
      this.addError('userId', 'User ID must be a positive integer');
    }

    // Validate log type
    if (params.logType && typeof params.logType !== 'string') {
      this.addError('logType', 'Log type must be a string');
    }

    // Validate action type
    if (params.actionType && typeof params.actionType !== 'string') {
      this.addError('actionType', 'Action type must be a string');
    }

    // Validate date range
    if (params.startDate && !this.isValidDate(params.startDate)) {
      this.addError('startDate', 'Start date must be a valid ISO date string');
    }

    if (params.endDate && !this.isValidDate(params.endDate)) {
      this.addError('endDate', 'End date must be a valid ISO date string');
    }

    if (params.startDate && params.endDate && new Date(params.startDate) > new Date(params.endDate)) {
      this.addError('dateRange', 'Start date cannot be after end date');
    }

    // Validate pagination
    if (params.page && (typeof params.page !== 'number' || params.page < 1)) {
      this.addError('page', 'Page must be a positive integer');
    }

    if (params.limit && (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100)) {
      this.addError('limit', 'Limit must be between 1 and 100');
    }

    return this.getResult();
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  static sanitizeReportInput(data) {
    const sanitized = { ...data };

    // Sanitize text fields
    if (sanitized.reason) {
      sanitized.reason = sanitizeString(sanitized.reason, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: VALIDATION_RULES.REASON_MAX_LENGTH
      });
    }

    if (sanitized.description) {
      sanitized.description = sanitizeString(sanitized.description, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: VALIDATION_RULES.DESCRIPTION_MAX_LENGTH
      });
    }

    // Validate and sanitize URLs
    if (sanitized.evidenceUrls) {
      sanitized.evidenceUrls = sanitized.evidenceUrls
        .filter(url => typeof url === 'string' && isValidUrl(url))
        .slice(0, VALIDATION_RULES.MAX_EVIDENCE_URLS);
    }

    return sanitized;
  }

  static sanitizeEnforcementInput(data) {
    const sanitized = { ...data };

    // Sanitize text fields
    if (sanitized.reason) {
      sanitized.reason = sanitizeString(sanitized.reason, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: 1000
      });
    }

    if (sanitized.details) {
      sanitized.details = sanitizeString(sanitized.details, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: 1000
      });
    }

    // Ensure numeric values are within bounds
    if (sanitized.duration) {
      sanitized.duration = Math.max(VALIDATION_RULES.MIN_SUSPENSION_DAYS, 
        Math.min(VALIDATION_RULES.MAX_SUSPENSION_DAYS, sanitized.duration));
    }

    if (sanitized.trustScoreChange) {
      sanitized.trustScoreChange = Math.max(VALIDATION_RULES.MIN_TRUST_SCORE_CHANGE,
        Math.min(VALIDATION_RULES.MAX_TRUST_SCORE_CHANGE, sanitized.trustScoreChange));
    }

    return sanitized;
  }

  static sanitizeAppealInput(data) {
    const sanitized = { ...data };

    // Sanitize text fields
    if (sanitized.appealReason) {
      sanitized.appealReason = sanitizeString(sanitized.appealReason, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: VALIDATION_RULES.REASON_MAX_LENGTH
      });
    }

    if (sanitized.appealDescription) {
      sanitized.appealDescription = sanitizeString(sanitized.appealDescription, {
        trim: true,
        removeHTML: true,
        escapeSQL: true,
        maxLength: VALIDATION_RULES.DESCRIPTION_MAX_LENGTH
      });
    }

    // Validate and sanitize URLs
    if (sanitized.evidenceUrls) {
      sanitized.evidenceUrls = sanitized.evidenceUrls
        .filter(url => typeof url === 'string' && isValidUrl(url))
        .slice(0, VALIDATION_RULES.MAX_EVIDENCE_URLS);
    }

    return sanitized;
  }
}

/**
 * Validation middleware factory
 */
export function createValidationMiddleware(validator, method) {
  return (req, res, next) => {
    const validationResult = validator[method](req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: validationResult.errors
        }
      });
    }

    // Add warnings to request for potential logging
    if (validationResult.warnings.length > 0) {
      req.validationWarnings = validationResult.warnings;
    }

    next();
  };
}

/**
 * Query validation middleware
 */
export function createQueryValidationMiddleware(validator, method) {
  return (req, res, next) => {
    const validationResult = validator[method](req.query);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: validationResult.errors
        }
      });
    }

    next();
  };
}

export default {
  BaseValidator,
  TrustScoreValidator,
  ReportValidator,
  EnforcementValidator,
  AuditValidator,
  InputSanitizer,
  createValidationMiddleware,
  createQueryValidationMiddleware
};
