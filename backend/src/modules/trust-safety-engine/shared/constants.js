/**
 * Trust & Safety Engine Constants
 * Week-3 Ownership Feature Build
 * Centralized constants for all engines
 */

// ========================================
// TRUST ENGINE CONSTANTS
// ========================================

export const TRUST_LEVELS = {
  SUSPENDED: { min: 0, max: 19, color: '#dc3545', label: 'Suspended' },
  RESTRICTED: { min: 20, max: 39, color: '#fd7e14', label: 'Restricted' },
  NEW: { min: 40, max: 59, color: '#6c757d', label: 'New' },
  ESTABLISHED: { min: 60, max: 74, color: '#17a2b8', label: 'Established' },
  TRUSTED: { min: 75, max: 89, color: '#28a745', label: 'Trusted' },
  VIP: { min: 90, max: 100, color: '#007bff', label: 'VIP' }
};

export const TRUST_SCORE_WEIGHTS = {
  CONTENT_QUALITY: 0.4,
  COMMUNITY_ENGAGEMENT: 0.3,
  RELIABILITY: 0.3
};

export const DECAY_FUNCTIONS = {
  EXPONENTIAL: 'exponential',
  LINEAR: 'linear',
  LOGARITHMIC: 'logarithmic'
};

export const RECOVERY_MODELS = {
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  STEP_FUNCTION: 'step_function'
};

// ========================================
// MODERATION ENGINE CONSTANTS
// ========================================

export const REPORT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

export const REPORT_STATUS = {
  SUBMITTED: 'SUBMITTED',
  VALIDATING: 'VALIDATING',
  TRIAGE: 'TRIAGE',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
  ESCALATED: 'ESCALATED'
};

export const CASE_STATE = {
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED'
};

export const FLAG_TYPE = {
  SPAM: 'SPAM',
  INAPPROPRIATE: 'INAPPROPRIATE',
  HARASSMENT: 'HARASSMENT',
  MISINFORMATION: 'MISINFORMATION',
  VIOLENCE: 'VIOLENCE',
  COPYRIGHT: 'COPYRIGHT',
  OTHER: 'OTHER'
};

export const AI_CONFIDENCE_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.7,
  HIGH: 0.9
};

export const ESCALATION_TRIGGERS = {
  CRITICAL_SEVERITY: 'critical_severity',
  HIGH_VOLUME: 'high_volume',
  VIP_USER: 'vip_user',
  LEGAL_RISK: 'legal_risk',
  COMPLEXITY: 'complexity'
};

// ========================================
// ENFORCEMENT ENGINE CONSTANTS
// ========================================

export const ACTION_TYPE = {
  WARNING: 'WARNING',
  CONTENT_REMOVAL: 'CONTENT_REMOVAL',
  USER_SUSPENSION: 'USER_SUSPENSION',
  USER_BAN: 'USER_BAN',
  TRUST_DEDUCTION: 'TRUST_DEDUCTION',
  ESCALATE: 'ESCALATE',
  NOTES_ONLY: 'NOTES_ONLY'
};

export const WARNING_TYPE = {
  INFORMAL: 'INFORMAL',
  FORMAL: 'FORMAL',
  FINAL: 'FINAL',
  LEGAL: 'LEGAL'
};

export const RESTRICTION_TYPE = {
  POSTING: 'POSTING',
  COMMENTING: 'COMMENTING',
  MESSAGING: 'MESSAGING',
  GROUP_CREATION: 'GROUP_CREATION',
  EVENT_CREATION: 'EVENT_CREATION',
  PROFILE_EDITING: 'PROFILE_EDITING'
};

export const SUSPENSION_LEVEL = {
  LEVEL_1: { duration: 24, hours: true, label: '24 Hours' },
  LEVEL_2: { duration: 7, days: true, label: '7 Days' },
  LEVEL_3: { duration: 30, days: true, label: '30 Days' },
  LEVEL_4: { duration: 90, days: true, label: '90 Days' }
};

export const BAN_CATEGORY = {
  LEGAL: 'LEGAL',
  SAFETY: 'SAFETY',
  FRAUD: 'FRAUD',
  SPAM: 'SPAM',
  HARASSMENT: 'HARASSMENT',
  PLATFORM: 'PLATFORM'
};

export const SHADOW_BAN_TYPE = {
  CONTENT: 'CONTENT',
  ENGAGEMENT: 'ENGAGEMENT',
  SEARCH: 'SEARCH',
  RECOMMENDATIONS: 'RECOMMENDATIONS',
  TRENDING: 'TRENDING'
};

// ========================================
// APPEAL SYSTEM CONSTANTS
// ========================================

export const APPEAL_STATUS = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED',
  ESCALATED: 'ESCALATED'
};

export const APPEAL_OUTCOME = {
  UPHOLD: 'uphold',
  REVERSE: 'reverse',
  MODIFY: 'modify',
  REMAND: 'remand',
  COMPENSATE: 'compensate'
};

// ========================================
// AUDIT ENGINE CONSTANTS
// ========================================

export const LOG_TYPE = {
  USER_ACTION: 'user_action',
  MODERATOR_ACTION: 'moderator_action',
  SYSTEM_ACTION: 'system_action',
  ADMIN_ACTION: 'admin_action',
  API_ACTION: 'api_action'
};

export const AUDIT_CATEGORY = {
  GDPR: 'gdpr',
  CCPA: 'ccpa',
  COPPA: 'coppa',
  ACCESSIBILITY: 'accessibility',
  LOCAL: 'local'
};

// ========================================
// RATE LIMITING CONSTANTS
// ========================================

export const RATE_LIMITS = {
  POSTING: {
    NEW_USER: { limit: 1, window: '1h' },
    ESTABLISHED_USER: { limit: 5, window: '1h' },
    TRUSTED_USER: { limit: 10, window: '1h' },
    VIP_USER: { limit: 999, window: '1h' }
  },
  COMMENTING: {
    NEW_USER: { limit: 5, window: '1h' },
    ESTABLISHED_USER: { limit: 20, window: '1h' },
    TRUSTED_USER: { limit: 50, window: '1h' },
    VIP_USER: { limit: 999, window: '1h' }
  },
  REPORTING: {
    ALL_USERS: { limit: 10, window: '1d' },
    TRUSTED_USERS: { limit: 20, window: '1d' },
    MODERATORS: { limit: 999, window: '1d' }
  }
};

// ========================================
// CONTENT QUALITY CONSTANTS
// ========================================

export const CONTENT_QUALITY_METRICS = {
  TEXT_LENGTH: { min: 50, optimal: 500, max: 5000 },
  READABILITY: { min: 6, max: 12 }, // Flesch-Kincaid grade level
  ORIGINALITY: { threshold: 0.8 }, // Similarity score
  SENTIMENT: { min: -0.3, max: 0.8 } // Sentiment analysis range
};

export const ENGAGEMENT_WEIGHTS = {
  VIEW_TIME: 0.3,
  INTERACTIONS: 0.4,
  SHARES: 0.2,
  SAVES: 0.1
};

// ========================================
// BEHAVIOR SCORING CONSTANTS
// ========================================

export const POSITIVE_BEHAVIORS = {
  CONSISTENT_POSTING: { weight: 0.2, decay: 0.95 },
  HELPFUL_REPORTS: { weight: 0.15, decay: 0.98 },
  CONSTRUCTIVE_COMMENTS: { weight: 0.25, decay: 0.96 },
  COMMUNITY_BUILDING: { weight: 0.2, decay: 0.97 },
  MENTORSHIP_ACTIVITIES: { weight: 0.2, decay: 0.99 }
};

export const NEGATIVE_BEHAVIORS = {
  SPAM_INDICATORS: { weight: -0.3, decay: 0.9 },
  HARASSMENT_PATTERNS: { weight: -0.4, decay: 0.85 },
  MISINFORMATION_SPREAD: { weight: -0.35, decay: 0.8 },
  POLICY_VIOLATIONS: { weight: -0.25, decay: 0.9 },
  TOXIC_INTERACTIONS: { weight: -0.3, decay: 0.85 }
};

// ========================================
// DECAY CONSTANTS
// ========================================

export const DECAY_RATES = {
  POSTING: { halfLife: 60, minScore: 20 },
  ENGAGEMENT: { halfLife: 45, minScore: 15 },
  REPORTING: { halfLife: 90, minScore: 10 },
  MODERATION: { halfLife: 120, minScore: 25 }
};

export const RECOVERY_RATES = {
  SLOW: 0.05,
  NORMAL: 0.1,
  FAST: 0.2,
  IMMEDIATE: 1.0
};

// ========================================
// QUEUE MANAGEMENT CONSTANTS
// ========================================

export const QUEUE_PRIORITIES = {
  URGENT: { sla: 15, unit: 'minutes' },
  HIGH: { sla: 2, unit: 'hours' },
  NORMAL: { sla: 24, unit: 'hours' },
  LOW: { sla: 72, unit: 'hours' }
};

export const WORKLOAD_DISTRIBUTION = {
  SKILLS_BASED: 'skills_based',
  CAPACITY_BASED: 'capacity_based',
  GEOGRAPHY_BASED: 'geography_based',
  LANGUAGE_BASED: 'language_based'
};

// ========================================
// SYSTEM CONFIGURATION
// ========================================

export const SYSTEM_CONFIG = {
  BATCH_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
  CACHE_TTL: 300, // seconds
  LOG_RETENTION_DAYS: 365,
  AUDIT_RETENTION_YEARS: 7
};

// ========================================
// ERROR CODES
// ========================================

export const ERROR_CODES = {
  // Trust Engine Errors
  TRUST_SCORE_CALCULATION_FAILED: 'TSE_001',
  INVALID_TRUST_LEVEL: 'TSE_002',
  DECAY_CALCULATION_FAILED: 'TSE_003',
  
  // Moderation Engine Errors
  REPORT_VALIDATION_FAILED: 'TSE_101',
  CASE_ASSIGNMENT_FAILED: 'TSE_102',
  AI_MODERATION_FAILED: 'TSE_103',
  
  // Enforcement Engine Errors
  ENFORCEMENT_ACTION_FAILED: 'TSE_201',
  INVALID_SUSPENSION_DURATION: 'TSE_202',
  BAN_EXECUTION_FAILED: 'TSE_203',
  
  // Appeal System Errors
  APPEAL_SUBMISSION_FAILED: 'TSE_301',
  APPEAL_REVIEW_FAILED: 'TSE_302',
  
  // Audit Engine Errors
  AUDIT_LOG_FAILED: 'TSE_401',
  DECISION_TRAIL_CORRUPTED: 'TSE_402',
  
  // System Errors
  DATABASE_CONNECTION_FAILED: 'TSE_501',
  CACHE_CONNECTION_FAILED: 'TSE_502',
  EXTERNAL_SERVICE_UNAVAILABLE: 'TSE_503'
};

// ========================================
// EVENT TYPES
// ========================================

export const EVENT_TYPES = {
  // Trust Events
  TRUST_SCORE_UPDATED: 'trust_score_updated',
  TRUST_LEVEL_CHANGED: 'trust_level_changed',
  BEHAVIOR_DETECTED: 'behavior_detected',
  
  // Moderation Events
  REPORT_CREATED: 'report_created',
  REPORT_UPDATED: 'report_updated',
  CASE_CREATED: 'case_created',
  CASE_ASSIGNED: 'case_assigned',
  CASE_RESOLVED: 'case_resolved',
  
  // Enforcement Events
  WARNING_ISSUED: 'warning_issued',
  RESTRICTION_APPLIED: 'restriction_applied',
  SUSPENSION_STARTED: 'suspension_started',
  SUSPENSION_ENDED: 'suspension_ended',
  BAN_EXECUTED: 'ban_executed',
  
  // Appeal Events
  APPEAL_SUBMITTED: 'appeal_submitted',
  APPEAL_REVIEWED: 'appeal_reviewed',
  APPEAL_RESOLVED: 'appeal_resolved',
  
  // Audit Events
  ACTION_LOGGED: 'action_logged',
  DECISION_RECORDED: 'decision_recorded',
  COMPLIANCE_CHECK: 'compliance_check'
};

// ========================================
// USER ROLES
// ========================================

export const USER_ROLES = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  SENIOR_MODERATOR: 'SENIOR_MODERATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

// ========================================
// PERMISSIONS
// ========================================

export const PERMISSIONS = {
  // Report Permissions
  VIEW_OWN_REPORTS: 'view_own_reports',
  VIEW_ALL_REPORTS: 'view_all_reports',
  CREATE_REPORTS: 'create_reports',
  
  // Case Permissions
  CREATE_CASES: 'create_cases',
  ASSIGN_CASES: 'assign_cases',
  TAKE_ACTIONS: 'take_actions',
  SUSPEND_USERS: 'suspend_users',
  BAN_USERS: 'ban_users',
  
  // Trust Permissions
  VIEW_TRUST_SCORES: 'view_trust_scores',
  MODIFY_TRUST_SCORES: 'modify_trust_scores',
  
  // Appeal Permissions
  CREATE_APPEALS: 'create_appeals',
  REVIEW_APPEALS: 'review_appeals',
  
  // Analytics Permissions
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_LOGS: 'view_logs',
  EXPORT_DATA: 'export_data'
};

// ========================================
// CONTENT TYPES
// ========================================

export const CONTENT_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
  MESSAGE: 'message',
  PROFILE: 'profile',
  GROUP: 'group',
  EVENT: 'event'
};

// ========================================
// VALIDATION RULES
// ========================================

export const VALIDATION_RULES = {
  TEXT_MIN_LENGTH: 10,
  TEXT_MAX_LENGTH: 5000,
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  REASON_MIN_LENGTH: 10,
  REASON_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 2000,
  MAX_EVIDENCE_URLS: 5,
  MAX_SUSPENSION_DAYS: 365,
  MIN_SUSPENSION_DAYS: 1,
  MAX_TRUST_SCORE_CHANGE: 50,
  MIN_TRUST_SCORE_CHANGE: -50
};
