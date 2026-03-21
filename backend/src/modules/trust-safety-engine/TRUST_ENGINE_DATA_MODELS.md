# TRUST & SAFETY ENGINE - Data Models & Schemas

## Overview

This document defines the comprehensive data models and schemas for the Trust & Safety Engine. These models are designed for production-grade scalability, performance, and compliance with regulatory requirements.

---

## CORE DATA MODELS

### 1. TrustScore Model

```javascript
const TrustScoreModel = {
  id: 'UUID PRIMARY KEY',
  userId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  
  // Core trust metrics (0-100 scale)
  overallScore: 'INTEGER NOT NULL DEFAULT 50',
  contentQualityScore: 'INTEGER DEFAULT 50',
  communityEngagementScore: 'INTEGER DEFAULT 50',
  reliabilityScore: 'INTEGER DEFAULT 50',
  
  // Trust classification
  trustLevel: 'ENUM(NEW, ESTABLISHED, TRUSTED, VIP, RESTRICTED, SUSPENDED) DEFAULT NEW',
  
  // Metadata
  lastCalculatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  calculationVersion: 'VARCHAR(20) DEFAULT "1.0"',
  dataFreshness: 'INTEGER DEFAULT 100', // Percentage of data considered fresh
  
  // Change tracking
  previousScore: 'INTEGER',
  scoreChange: 'INTEGER DEFAULT 0',
  changeReason: 'TEXT',
  changeTrigger: 'VARCHAR(50)', // 'automatic', 'manual', 'appeal', 'enforcement'
  
  // Decay and recovery
  decayRate: 'DECIMAL(5,4) DEFAULT 0.01', // Daily decay rate
  recoveryRate: 'DECIMAL(5,4) DEFAULT 0.1', // Recovery rate
  lastDecayAt: 'TIMESTAMPTZ',
  nextRecalculationAt: 'TIMESTAMPTZ',
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  
  // Constraints
  CHECK: '(overallScore >= 0 AND overallScore <= 100)',
  CHECK: '(contentQualityScore >= 0 AND contentQualityScore <= 100)',
  CHECK: '(communityEngagementScore >= 0 AND communityEngagementScore <= 100)',
  CHECK: '(reliabilityScore >= 0 AND reliabilityScore <= 100)',
  CHECK: '(decayRate >= 0 AND decayRate <= 1)',
  CHECK: '(recoveryRate >= 0 AND recoveryRate <= 1)'
};
```

### 2. Reputation Model

```javascript
const ReputationModel = {
  id: 'UUID PRIMARY KEY',
  userId: 'INTEGER FOREIGN KEY REFERENCES users(id) UNIQUE',
  
  // Reputation components
  contentReputation: {
    postQuality: 'DECIMAL(5,2) DEFAULT 0.0',
    commentQuality: 'DECIMAL(5,2) DEFAULT 0.0',
    originalityScore: 'DECIMAL(5,2) DEFAULT 0.0',
    engagementQuality: 'DECIMAL(5,2) DEFAULT 0.0',
    consistencyScore: 'DECIMAL(5,2) DEFAULT 0.0'
  },
  
  // Community reputation
  communityReputation: {
    helpfulReports: 'INTEGER DEFAULT 0',
    positiveInteractions: 'INTEGER DEFAULT 0',
    mentorshipScore: 'DECIMAL(5,2) DEFAULT 0.0',
    collaborationScore: 'DECIMAL(5,2) DEFAULT 0.0',
    peerRecognition: 'INTEGER DEFAULT 0'
  },
  
  // Behavioral reputation
  behavioralReputation: {
    complianceScore: 'DECIMAL(5,2) DEFAULT 0.0',
    policyAdherence: 'DECIMAL(5,2) DEFAULT 0.0',
    responseTimeliness: 'DECIMAL(5,2) DEFAULT 0.0',
    constructiveFeedback: 'DECIMAL(5,2) DEFAULT 0.0'
  },
  
  // Reputation history
  reputationHistory: 'JSONB', // Array of historical reputation snapshots
  reputationTrend: 'VARCHAR(20)', // 'increasing', 'decreasing', 'stable'
  volatilityScore: 'DECIMAL(5,2) DEFAULT 0.0', // Reputation stability
  
  // Badges and achievements
  badges: 'JSONB', // Array of earned badges
  achievements: 'JSONB', // Array of achievements
  milestoneProgress: 'JSONB', // Progress toward reputation milestones
  
  // Timestamps
  lastUpdated: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
};
```

### 3. Report Model

```javascript
const ReportModel = {
  id: 'UUID PRIMARY KEY',
  
  // Reporter information
  reporterId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  reporterTrustLevel: 'VARCHAR(20)',
  reporterHistory: 'JSONB', // Reporter's reporting history
  
  // Target information
  reportedUserId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  reportedPostId: 'INTEGER FOREIGN KEY REFERENCES posts(id)',
  reportedCommentId: 'INTEGER FOREIGN KEY REFERENCES comments(id)',
  targetType: 'ENUM(USER, POST, COMMENT, MESSAGE, PROFILE)',
  
  // Report classification
  severity: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL) NOT NULL',
  flagType: 'ENUM(SPAM, INAPPROPRIATE, HARASSMENT, MISINFORMATION, VIOLENCE, COPYRIGHT, OTHER) NOT NULL',
  urgency: 'ENUM(ROUTINE, URGENT, EMERGENCY) DEFAULT ROUTINE',
  
  // Report content
  reason: 'TEXT NOT NULL',
  description: 'TEXT',
  evidenceUrls: 'TEXT[]',
  attachments: 'JSONB', // Array of file attachments
  
  // Automated analysis
  aiAnalysis: {
    confidence: 'DECIMAL(5,4)',
    riskAssessment: 'JSONB',
    categoryScores: 'JSONB',
    recommendations: 'JSONB',
    processingTime: 'INTEGER' // milliseconds
  },
  
  // Duplicate detection
  isDuplicate: 'BOOLEAN DEFAULT FALSE',
  duplicateOfId: 'UUID FOREIGN KEY REFERENCES reports(id)',
  similarityScore: 'DECIMAL(5,4)',
  
  // Processing status
  status: 'ENUM(SUBMITTED, VALIDATING, TRIAGE, ASSIGNED, IN_PROGRESS, PENDING_REVIEW, RESOLVED, DISMISSED, ESCALATED) DEFAULT SUBMITTED',
  priority: 'ENUM(LOW, NORMAL, HIGH, URGENT) DEFAULT NORMAL',
  
  // Assignment
  assignedModeratorId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  assignedQueue: 'VARCHAR(50)',
  assignedAt: 'TIMESTAMPTZ',
  
  // Case linkage
  moderationCaseId: 'UUID FOREIGN KEY REFERENCES moderation_cases(id)',
  
  // Resolution
  resolution: {
    outcome: 'ENUM(VALID, INVALID, PARTIAL)',
    actionTaken: 'JSONB',
    resolutionNotes: 'TEXT',
    resolvedBy: 'INTEGER FOREIGN KEY REFERENCES users(id)',
    resolvedAt: 'TIMESTAMPTZ'
  },
  
  // Metadata
  source: 'VARCHAR(50)', // 'api', 'web', 'mobile', 'auto_detection'
  ipAddress: 'INET',
  userAgent: 'TEXT',
  sessionId: 'VARCHAR(100)',
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
};
```

### 4. ModerationCase Model

```javascript
const ModerationCaseModel = {
  id: 'UUID PRIMARY KEY',
  caseNumber: 'VARCHAR(20) UNIQUE NOT NULL', // Auto-generated: CASE-YYYY-XXXXX
  
  // Case details
  title: 'VARCHAR(200) NOT NULL',
  description: 'TEXT',
  category: 'VARCHAR(50)',
  tags: 'TEXT[]',
  
  // Priority and severity
  priority: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL) NOT NULL',
  severity: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL) NOT NULL',
  impact: 'ENUM(INDIVIDUAL, COMMUNITY, PLATFORM) DEFAULT INDIVIDUAL',
  
  // Case state
  state: 'ENUM(OPEN, ASSIGNED, IN_PROGRESS, PENDING_REVIEW, RESOLVED, CLOSED) DEFAULT OPEN',
  status: 'ENUM(ACTIVE, ON_HOLD, ESCALATED, COMPLETED) DEFAULT ACTIVE',
  
  // Assignment
  assignedModeratorId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  assignedTeam: 'VARCHAR(50)',
  assignedAt: 'TIMESTAMPTZ',
  
  // Escalation
  escalatedToAdmin: 'BOOLEAN DEFAULT FALSE',
  escalatedAdminId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  escalationLevel: 'INTEGER DEFAULT 0', // 0=no escalation, 1-4=escalation levels
  escalationReason: 'TEXT',
  escalatedAt: 'TIMESTAMPTZ',
  
  // Linked reports
  reportIds: 'UUID[]', // Array of linked report IDs
  reportCount: 'INTEGER DEFAULT 0',
  
  // Case timeline
  timeline: 'JSONB', // Array of case events and actions
  
  // Resolution
  resolution: {
    outcome: 'ENUM(RESOLVED, DISMISSED, ESCALATED)',
    summary: 'TEXT',
    actions: 'JSONB',
    lessonsLearned: 'TEXT',
    preventedRecurrence: 'BOOLEAN DEFAULT FALSE'
  },
  
  // Performance metrics
  metrics: {
    timeToResolution: 'INTEGER', // minutes
    moderatorActions: 'INTEGER DEFAULT 0',
    appeals: 'INTEGER DEFAULT 0',
    satisfactionScore: 'DECIMAL(3,2)'
  },
  
  // Auto-generation
  autoGenerated: 'BOOLEAN DEFAULT FALSE',
  generationTrigger: 'VARCHAR(50)', // 'threshold', 'pattern', 'ai_detection'
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  resolvedAt: 'TIMESTAMPTZ',
  closedAt: 'TIMESTAMPTZ'
};
```

### 5. Appeal Model

```javascript
const AppealModel = {
  id: 'UUID PRIMARY KEY',
  
  // Appeal details
  moderationCaseId: 'UUID FOREIGN KEY REFERENCES moderation_cases(id) NOT NULL',
  originalActionId: 'UUID FOREIGN KEY REFERENCES moderator_actions(id)',
  appellantUserId: 'INTEGER FOREIGN KEY REFERENCES users(id) NOT NULL',
  
  // Appeal content
  appealReason: 'VARCHAR(500) NOT NULL',
  appealDescription: 'TEXT',
  evidenceUrls: 'TEXT[]',
  supportingDocuments: 'JSONB',
  
  // Appeal classification
  appealType: 'ENUM(DECISION_REVIEW, PROCESS_COMPLAINT, NEW_EVIDENCE, PROCEDURAL_ERROR)',
  urgency: 'ENUM(ROUTINE, URGENT, EMERGENCY) DEFAULT ROUTINE',
  
  // Processing status
  status: 'ENUM(SUBMITTED, UNDER_REVIEW, PENDING_DECISION, APPROVED, DENIED, ESCALATED) DEFAULT SUBMITTED',
  priority: 'ENUM(LOW, NORMAL, HIGH, URGENT) DEFAULT NORMAL',
  
  // Review assignment
  reviewedByModeratorId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  reviewedByAdminId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  assignedAt: 'TIMESTAMPTZ',
  
  // Review process
  reviewNotes: 'TEXT',
  reviewEvidence: 'JSONB',
  consultationNotes: 'TEXT', // Notes from senior staff consultation
  
  // Decision
  finalDecision: 'ENUM(UPHOLD, REVERSE, MODIFY, REMAND, COMPENSATE)',
  decisionReason: 'TEXT NOT NULL',
  decisionDetails: 'JSONB',
  modifiedAction: 'JSONB', // If decision is MODIFY
  
  // Impact assessment
  impactAssessment: {
    userImpact: 'VARCHAR(100)',
    platformImpact: 'VARCHAR(100)',
    precedentSet: 'BOOLEAN DEFAULT FALSE',
    policyChange: 'BOOLEAN DEFAULT FALSE'
  },
  
  // Appeal metrics
  processingTime: 'INTEGER', // minutes from submission to decision
  reviewerWorkload: 'INTEGER', // Number of cases reviewer is handling
  
  // Timestamps
  submittedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  reviewedAt: 'TIMESTAMPTZ',
  decidedAt: 'TIMESTAMPTZ',
  implementedAt: 'TIMESTAMPTZ',
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
};
```

### 6. EnforcementAction Model

```javascript
const EnforcementActionModel = {
  id: 'UUID PRIMARY KEY',
  
  // Action details
  actionType: 'ENUM(WARNING, CONTENT_REMOVAL, USER_SUSPENSION, USER_BAN, TRUST_DEDUCTION, ESCALATE, NOTES_ONLY) NOT NULL',
  severity: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL)',
  
  // Target information
  targetUserId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  targetContentType: 'ENUM(POST, COMMENT, MESSAGE, PROFILE, USER)',
  targetContentId: 'INTEGER',
  
  // Case linkage
  moderationCaseId: 'UUID FOREIGN KEY REFERENCES moderation_cases(id)',
  reportIds: 'UUID[]', // Linked reports
  
  // Action specifics
  actionDetails: 'JSONB', // Action-specific details
  duration: 'INTEGER', // Duration in days/hours for temporary actions
  permanent: 'BOOLEAN DEFAULT FALSE',
  
  // Trust impact
  trustScoreChange: 'INTEGER DEFAULT 0',
  trustLevelImpact: 'VARCHAR(20)', // New trust level if changed
  
  // Issuer information
  issuedBy: 'INTEGER FOREIGN KEY REFERENCES users(id) NOT NULL',
  issuerRole: 'VARCHAR(50)',
  issuerAuthority: 'VARCHAR(100)',
  
  // Automation
  isAutomatic: 'BOOLEAN DEFAULT FALSE',
  aiConfidence: 'DECIMAL(5,4)',
  systemReason: 'TEXT',
  automationVersion: 'VARCHAR(20)',
  
  // Appeals
  appealable: 'BOOLEAN DEFAULT TRUE',
  appealWindow: 'INTEGER DEFAULT 7', // days
  appealDeadline: 'TIMESTAMPTZ',
  appealsFiled: 'INTEGER DEFAULT 0',
  maxAppeals: 'INTEGER DEFAULT 3',
  
  // Execution status
  status: 'ENUM(PENDING, ACTIVE, EXPIRED, APPEALED, OVERTURNED, CANCELLED)',
  executedAt: 'TIMESTAMPTZ',
  expiresAt: 'TIMESTAMPTZ',
  endedAt: 'TIMESTAMPTZ',
  
  // Effectiveness tracking
  effectiveness: {
    complianceRate: 'DECIMAL(5,4)',
    repeatOffense: 'BOOLEAN DEFAULT FALSE',
    userResponse: 'VARCHAR(100)',
    communityImpact: 'DECIMAL(5,4)'
  },
  
  // Restrictions applied
  restrictions: 'JSONB', // Array of applied restrictions
  
  // Evidence and justification
  evidence: 'JSONB',
  justification: 'TEXT NOT NULL',
  policyReferences: 'TEXT[]',
  legalReferences: 'TEXT[]',
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
};
```

### 7. AuditLog Model

```javascript
const AuditLogModel = {
  id: 'UUID PRIMARY KEY',
  
  // Log classification
  logType: 'ENUM(USER_ACTION, MODERATOR_ACTION, SYSTEM_ACTION, ADMIN_ACTION, API_ACTION) NOT NULL',
  category: 'VARCHAR(50)', // Compliance category
  subcategory: 'VARCHAR(50)',
  
  // Event details
  eventType: 'VARCHAR(100) NOT NULL',
  eventName: 'VARCHAR(200)',
  eventDescription: 'TEXT',
  
  // Actor information
  actorUserId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  actorRole: 'VARCHAR(50)',
  actorSessionId: 'VARCHAR(100)',
  actorIpAddress: 'INET',
  actorUserAgent: 'TEXT',
  
  // Action target
  targetUserId: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  targetResourceType: 'VARCHAR(50)',
  targetResourceId: 'VARCHAR(100)',
  targetDetails: 'JSONB',
  
  // Action details
  action: {
    type: 'VARCHAR(100) NOT NULL',
    method: 'VARCHAR(20)', // GET, POST, PUT, DELETE
    endpoint: 'VARCHAR(500)',
    parameters: 'JSONB',
    result: 'VARCHAR(50)', // success, failure, error
    duration: 'INTEGER' // milliseconds
  },
  
  // Context information
  context: {
    requestId: 'VARCHAR(100)',
    correlationId: 'VARCHAR(100)',
    source: 'VARCHAR(50)',
    version: 'VARCHAR(20)',
    environment: 'VARCHAR(20)',
    hostname: 'VARCHAR(100)',
    processId: 'INTEGER',
    threadId: 'INTEGER'
  },
  
  // Security and compliance
  security: {
    riskLevel: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL)',
    complianceCategories: 'TEXT[]',
    dataClassification: 'VARCHAR(50)',
    retentionPeriod: 'VARCHAR(50)',
    encryptionRequired: 'BOOLEAN DEFAULT FALSE'
  },
  
  // Data changes
  dataChanges: {
    before: 'JSONB',
    after: 'JSONB',
    changedFields: 'TEXT[]',
    changeType: 'VARCHAR(50)' // CREATE, UPDATE, DELETE
  },
  
  // System metrics
  systemMetrics: {
    memoryUsage: 'INTEGER',
    cpuUsage: 'DECIMAL(5,2)',
    diskUsage: 'INTEGER',
    networkLatency: 'INTEGER'
  },
  
  // Integrity and verification
  hash: 'VARCHAR(128)', // SHA-512 hash of log entry
  signature: 'TEXT', // Digital signature for integrity
  previousLogHash: 'VARCHAR(128)', // Chain of custody
  verified: 'BOOLEAN DEFAULT FALSE',
  
  // Processing information
  processedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  batchId: 'VARCHAR(100)',
  sequenceNumber: 'BIGINT',
  
  // Retention
  retentionExpiresAt: 'TIMESTAMPTZ',
  archived: 'BOOLEAN DEFAULT FALSE',
  archivedAt: 'TIMESTAMPTZ',
  
  // Timestamps
  eventTimestamp: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
};
```

---

## RELATIONSHIP MODELS

### 1. UserFlag Model

```javascript
const UserFlagModel = {
  id: 'UUID PRIMARY KEY',
  userId: 'INTEGER FOREIGN KEY REFERENCES users(id) NOT NULL',
  
  // Flag details
  flagType: 'VARCHAR(50) NOT NULL', // 'spam_risk', 'harassment', 'fake_account', etc.
  severity: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL) NOT NULL',
  category: 'VARCHAR(50)', // 'behavioral', 'content', 'security', 'legal'
  
  // Flag status
  isActive: 'BOOLEAN DEFAULT TRUE',
  status: 'ENUM(ACTIVE, INACTIVE, RESOLVED, EXPIRED)',
  
  // Auto-generation
  autoGenerated: 'BOOLEAN DEFAULT FALSE',
  detectionMethod: 'VARCHAR(50)', // 'ai_detection', 'pattern_match', 'user_report'
  confidence: 'DECIMAL(5,4)',
  
  // Expiration
  expiresAt: 'TIMESTAMPTZ',
  autoRenew: 'BOOLEAN DEFAULT FALSE',
  
  // Context
  reason: 'TEXT',
  evidence: 'JSONB',
  relatedReports: 'UUID[]',
  
  // Resolution
  resolvedBy: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  resolutionNotes: 'TEXT',
  resolvedAt: 'TIMESTAMPTZ',
  
  // Impact
  trustImpact: 'INTEGER DEFAULT 0',
  restrictionsApplied: 'JSONB',
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  
  // Constraints
  CHECK: '(confidence >= 0 AND confidence <= 1)'
};
```

### 2. ContentFlag Model

```javascript
const ContentFlagModel = {
  id: 'UUID PRIMARY KEY',
  
  // Content identification
  contentType: 'ENUM(POST, COMMENT, MESSAGE, PROFILE) NOT NULL',
  contentId: 'INTEGER NOT NULL',
  contentHash: 'VARCHAR(128)', // For content integrity
  
  // Flag details
  flagType: 'ENUM(SPAM, INAPPROPRIATE, HARASSMENT, MISINFORMATION, VIOLENCE, COPYRIGHT, OTHER) NOT NULL',
  severity: 'ENUM(LOW, MEDIUM, HIGH, CRITICAL) NOT NULL',
  
  // Detection information
  confidence: 'DECIMAL(5,4) NOT NULL',
  detectionMethod: 'VARCHAR(50)', // 'ai_model', 'keyword_match', 'pattern_detection'
  aiModelVersion: 'VARCHAR(20)',
  
  // Status
  isActive: 'BOOLEAN DEFAULT TRUE',
  reviewedByModerator: 'BOOLEAN DEFAULT FALSE',
  status: 'ENUM(ACTIVE, REVIEWED, RESOLVED, DISMISSED)',
  
  // Auto-generation
  autoGenerated: 'BOOLEAN DEFAULT TRUE',
  processingTime: 'INTEGER', // milliseconds
  
  // Analysis details
  analysis: {
    sentimentScore: 'DECIMAL(5,4)',
    toxicityScore: 'DECIMAL(5,4)',
    spamProbability: 'DECIMAL(5,4)',
    categoryScores: 'JSONB',
    keywords: 'TEXT[]',
    patterns: 'JSONB'
  },
  
  // Review information
  reviewedBy: 'INTEGER FOREIGN KEY REFERENCES users(id)',
  reviewNotes: 'TEXT',
  reviewedAt: 'TIMESTAMPTZ',
  
  // Related content
  similarContent: 'JSONB', // Array of similar content IDs
  duplicateFlags: 'UUID[]',
  
  // Timestamps
  createdAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  updatedAt: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  
  // Constraints
  UNIQUE: '(contentType, contentId, flagType)',
  CHECK: '(confidence >= 0 AND confidence <= 1)'
};
```

---

## PERFORMANCE INDEXES

### Primary Indexes

```sql
-- Trust scores indexes
CREATE INDEX idx_trust_scores_user_id ON trust_scores(user_id);
CREATE INDEX idx_trust_scores_level ON trust_scores(trust_level);
CREATE INDEX idx_trust_scores_updated ON trust_scores(updated_at DESC);
CREATE INDEX idx_trust_scores_overall ON trust_scores(overall_score);

-- Reports indexes
CREATE INDEX idx_reports_status_severity ON reports(status, severity);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_case ON reports(moderation_case_id);

-- Cases indexes
CREATE INDEX idx_cases_state_priority ON moderation_cases(state, priority);
CREATE INDEX idx_cases_moderator ON moderation_cases(assigned_moderator_id);
CREATE INDEX idx_cases_created_at ON moderation_cases(created_at DESC);
CREATE INDEX idx_cases_number ON moderation_cases(case_number);

-- Enforcement actions indexes
CREATE INDEX idx_actions_user ON enforcement_actions(target_user_id);
CREATE INDEX idx_actions_type ON enforcement_actions(action_type);
CREATE INDEX idx_actions_status ON enforcement_actions(status);
CREATE INDEX idx_actions_case ON enforcement_actions(moderation_case_id);

-- Audit logs indexes (partitioned by date)
CREATE INDEX idx_audit_logs_type ON audit_logs(log_type);
CREATE INDEX idx_audit_logs_user ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(event_timestamp DESC);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
```

### Composite Indexes

```sql
-- Performance optimization for common queries
CREATE INDEX idx_reports_user_status_created ON reports(reported_user_id, status, created_at DESC);
CREATE INDEX idx_cases_moderator_state ON moderation_cases(assigned_moderator_id, state);
CREATE INDEX idx_actions_user_status_type ON enforcement_actions(target_user_id, status, action_type);
CREATE INDEX idx_audit_user_type_timestamp ON audit_logs(actor_user_id, log_type, event_timestamp DESC);
```

---

## PARTITIONING STRATEGY

### Time-Based Partitioning

```sql
-- Partition audit logs by month
CREATE TABLE audit_logs (
  -- Column definitions from AuditLogModel
) PARTITION BY RANGE (event_timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

### User-Based Partitioning

```sql
-- Partition trust scores by user ID ranges for large platforms
CREATE TABLE trust_scores (
  -- Column definitions from TrustScoreModel
) PARTITION BY HASH (user_id);

-- Create 8 partitions for load distribution
CREATE TABLE trust_scores_0 PARTITION OF trust_scores FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE trust_scores_1 PARTITION OF trust_scores FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... continue for remainders 2-7
```

---

## SECURITY CONSTRAINTS

### Row Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for different user roles
CREATE POLICY reports_moderator_policy ON reports
    FOR ALL
    TO authenticated_role
    USING (
        actor_user_id = current_user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = current_user_id AND role IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN'))
    );
```

### Data Encryption

```sql
-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example of column-level encryption for PII
ALTER TABLE audit_logs 
ALTER COLUMN actor_ip_address TYPE TEXT,
ALTER COLUMN actor_ip_address SET DEFAULT NULL;

-- Use application-level encryption for sensitive data
```

---

## MIGRATION STRATEGY

### Version Control

```sql
-- Migration version tracking
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    checksum VARCHAR(64)
);

-- Example migration record
INSERT INTO schema_migrations (version, description, checksum) 
VALUES ('1.0.0', 'Initial Trust & Safety Engine schema', 'sha256_hash');
```

### Backward Compatibility

```sql
-- Create views for backward compatibility
CREATE VIEW v_user_trust_summary AS
SELECT 
    u.id,
    u.name,
    ts.overall_score,
    ts.trust_level,
    ts.last_calculated_at
FROM users u
JOIN trust_scores ts ON u.id = ts.user_id;
```

---

## PERFORMANCE OPTIMIZATION

### Materialized Views

```sql
-- Materialized view for dashboard metrics
CREATE MATERIALIZED VIEW moderation_dashboard_metrics AS
SELECT 
    COUNT(*) as total_reports,
    COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_priority_reports,
    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_reports,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) as avg_resolution_time
FROM reports
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY moderation_dashboard_metrics;
END;
$$ LANGUAGE plpgsql;
```

### Caching Strategy

```javascript
// Redis caching patterns for frequently accessed data
const cacheKeys = {
  userTrustScore: (userId) => `trust:score:${userId}`,
  activeReports: () => 'reports:active',
  moderatorWorkload: (modId) => 'moderator:workload:${modId}',
  enforcementActions: (userId) => `enforcement:active:${userId}`
};

// Cache TTL settings
const cacheTTL = {
  trustScore: 300, // 5 minutes
  activeReports: 60, // 1 minute
  moderatorWorkload: 120, // 2 minutes
  enforcementActions: 180 // 3 minutes
};
```

---

*Document version: 1.0*  
*Last updated: February 12, 2026*  
*Author: Trust & Safety Engine Team*
