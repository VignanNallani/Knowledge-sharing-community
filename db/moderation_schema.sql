-- ========================================
-- MODERATION & TRUST SYSTEM SCHEMA
-- ========================================
-- Week-3 Ownership Feature Build
-- Production-grade moderation with full lifecycle

-- ========================================
-- MODERATION ENUMS
-- ========================================

-- Report severity levels
CREATE TYPE report_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Report status tracking
CREATE TYPE report_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED');

-- Moderation case states
CREATE TYPE case_state AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESOLVED', 'CLOSED');

-- Moderator action types
CREATE TYPE action_type AS ENUM ('WARNING', 'CONTENT_REMOVAL', 'USER_SUSPENSION', 'USER_BAN', 'TRUST_DEDUCTION', 'ESCALATE', 'NOTES_ONLY');

-- Trust levels for users
CREATE TYPE trust_level AS ENUM ('NEW', 'ESTABLISHED', 'TRUSTED', 'VIP', 'RESTRICTED', 'SUSPENDED');

-- Appeal status
CREATE TYPE appeal_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'ESCALATED');

-- Content flag types
CREATE TYPE flag_type AS ENUM ('SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION', 'VIOLENCE', 'COPYRIGHT', 'OTHER');

-- ========================================
-- MODERATION CORE TABLES
-- ========================================

-- Enhanced Reports Table (replaces basic reports)
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  reported_post_id INT REFERENCES posts(id) ON DELETE SET NULL,
  reported_comment_id INT REFERENCES comments(id) ON DELETE SET NULL,
  severity report_severity NOT NULL DEFAULT 'MEDIUM',
  status report_status NOT NULL DEFAULT 'PENDING',
  flag_type flag_type NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[], -- Array of evidence URLs
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id INT REFERENCES reports(id) ON DELETE SET NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  moderation_case_id INT REFERENCES moderation_cases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Moderation Cases (central case management)
CREATE TABLE moderation_cases (
  id SERIAL PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL, -- Auto-generated: CASE-YYYY-XXXXX
  title TEXT NOT NULL,
  description TEXT,
  priority report_severity NOT NULL DEFAULT 'MEDIUM',
  state case_state NOT NULL DEFAULT 'OPEN',
  assigned_moderator_id INT REFERENCES users(id) ON DELETE SET NULL,
  escalated_to_admin BOOLEAN DEFAULT FALSE,
  escalated_admin_id INT REFERENCES users(id) ON DELETE SET NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Moderator Actions (audit trail of all actions)
CREATE TABLE moderator_actions (
  id SERIAL PRIMARY KEY,
  moderation_case_id INT NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  moderator_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action_type action_type NOT NULL,
  action_details TEXT,
  target_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  target_content_type TEXT, -- 'post', 'comment', 'user'
  target_content_id INT,
  duration_days INT, -- For suspensions
  trust_score_change INT DEFAULT 0, -- Positive or negative change
  is_automatic BOOLEAN DEFAULT FALSE,
  system_reason TEXT, -- For automatic actions
  created_at TIMESTAMAMPTZ DEFAULT now()
);

-- ========================================
-- TRUST SYSTEM TABLES
-- ========================================

-- User Trust Scores (dynamic trust calculation)
CREATE TABLE trust_scores (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  overall_score INT NOT NULL DEFAULT 50, -- 0-100 scale
  trust_level trust_level NOT NULL DEFAULT 'NEW',
  content_quality_score INT DEFAULT 50,
  community_engagement_score INT DEFAULT 50,
  reliability_score INT DEFAULT 50,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Flags (behavioral flags)
CREATE TABLE user_flags (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- 'spam_risk', 'harassment', 'fake_account', etc.
  severity report_severity NOT NULL DEFAULT 'MEDIUM',
  is_active BOOLEAN DEFAULT TRUE,
  auto_generated BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content Flags (automated content analysis)
CREATE TABLE content_flags (
  id SERIAL PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'post', 'comment'
  content_id INT NOT NULL,
  flag_type flag_type NOT NULL,
  confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  reviewed_by_moderator BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT TRUE,
  ai_model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_type, content_id, flag_type)
);

-- ========================================
-- APPEALS SYSTEM
-- ========================================

-- Appeals (user appeals against moderation actions)
CREATE TABLE appeals (
  id SERIAL PRIMARY KEY,
  moderation_case_id INT NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  appellant_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_action_id INT REFERENCES moderator_actions(id) ON DELETE SET NULL,
  appeal_reason TEXT NOT NULL,
  appeal_description TEXT,
  evidence_urls TEXT[],
  status appeal_status NOT NULL DEFAULT 'SUBMITTED',
  reviewed_by_moderator_id INT REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  final_decision TEXT, -- 'uphold', 'reverse', 'modify'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ========================================
-- AUDIT & LOGGING
-- ========================================

-- Moderation Logs (comprehensive audit trail)
CREATE TABLE moderation_logs (
  id SERIAL PRIMARY KEY,
  log_type TEXT NOT NULL, -- 'case_created', 'action_taken', 'appeal_filed', etc.
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  moderation_case_id INT REFERENCES moderation_cases(id) ON DELETE SET NULL,
  action_id INT REFERENCES moderator_actions(id) ON DELETE SET NULL,
  report_id INT REFERENCES reports(id) ON DELETE SET NULL,
  appeal_id INT REFERENCES appeals(id) ON DELETE SET NULL,
  details JSONB, -- Structured log data
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Reports indexes
CREATE INDEX idx_reports_status_severity ON reports(status, severity);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id) WHERE reported_user_id IS NOT NULL;
CREATE INDEX idx_reports_reported_post ON reports(reported_post_id) WHERE reported_post_id IS NOT NULL;
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_duplicate ON reports(duplicate_of_id) WHERE duplicate_of_id IS NOT NULL;
CREATE INDEX idx_reports_case ON reports(moderation_case_id);

-- Moderation cases indexes
CREATE INDEX idx_cases_state_priority ON moderation_cases(state, priority);
CREATE INDEX idx_cases_moderator ON moderation_cases(assigned_moderator_id) WHERE assigned_moderator_id IS NOT NULL;
CREATE INDEX idx_cases_created_at ON moderation_cases(created_at DESC);
CREATE INDEX idx_cases_number ON moderation_cases(case_number);

-- Moderator actions indexes
CREATE INDEX idx_actions_case ON moderator_actions(moderation_case_id);
CREATE INDEX idx_actions_moderator ON moderator_actions(moderator_id);
CREATE INDEX idx_actions_target_user ON moderator_actions(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_actions_created_at ON moderator_actions(created_at DESC);

-- Trust scores indexes
CREATE INDEX idx_trust_level ON trust_scores(trust_level);
CREATE INDEX idx_trust_overall ON trust_scores(overall_score);
CREATE INDEX idx_trust_updated ON trust_scores(updated_at DESC);

-- User flags indexes
CREATE INDEX idx_user_flags_user ON user_flags(user_id);
CREATE INDEX idx_user_flags_active ON user_flags(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_flags_type ON user_flags(flag_type);

-- Content flags indexes
CREATE INDEX idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX idx_content_flags_active ON content_flags(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_content_flags_reviewed ON content_flags(reviewed_by_moderator) WHERE reviewed_by_moderator = FALSE;

-- Appeals indexes
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_appeals_user ON appeals(appellant_user_id);
CREATE INDEX idx_appeals_case ON appeals(moderation_case_id);

-- Moderation logs indexes
CREATE INDEX idx_logs_type ON moderation_logs(log_type);
CREATE INDEX idx_logs_user ON moderation_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_logs_case ON moderation_logs(moderation_case_id) WHERE moderation_case_id IS NOT NULL;
CREATE INDEX idx_logs_created_at ON moderation_logs(created_at DESC);

-- ========================================
-- CONSTRAINTS & VALIDATION
-- ========================================

-- Ensure at least one target is specified in reports
ALTER TABLE reports ADD CONSTRAINT chk_reports_target 
  CHECK ((reported_user_id IS NOT NULL) OR (reported_post_id IS NOT NULL) OR (reported_comment_id IS NOT NULL));

-- Ensure trust score is within valid range
ALTER TABLE trust_scores ADD CONSTRAINT chk_trust_score_range 
  CHECK (overall_score >= 0 AND overall_score <= 100);

-- Ensure sub-scores are within valid range
ALTER TABLE trust_scores ADD CONSTRAINT chk_sub_scores_range 
  CHECK (
    content_quality_score >= 0 AND content_quality_score <= 100 AND
    community_engagement_score >= 0 AND community_engagement_score <= 100 AND
    reliability_score >= 0 AND reliability_score <= 100
  );

-- Ensure content flag confidence is valid range
ALTER TABLE content_flags ADD CONSTRAINT chk_confidence_range 
  CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Ensure suspension duration is positive for suspension actions
ALTER TABLE moderator_actions ADD CONSTRAINT chk_suspension_duration 
  CHECK (
    (action_type != 'USER_SUSPENSION') OR 
    (duration_days IS NOT NULL AND duration_days > 0)
  );

-- ========================================
-- TRIGGERS FOR AUTOMATION
-- ========================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_moderation_cases_updated_at BEFORE UPDATE ON moderation_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trust_scores_updated_at BEFORE UPDATE ON trust_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_flags_updated_at BEFORE UPDATE ON user_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_flags_updated_at BEFORE UPDATE ON content_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appeals_updated_at BEFORE UPDATE ON appeals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate case numbers trigger
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.case_number = 'CASE-' || to_char(now(), 'YYYY') || '-' || lpad(NEW.id::text, 5, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON moderation_cases FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Active cases dashboard view
CREATE VIEW active_cases_dashboard AS
SELECT 
    mc.id,
    mc.case_number,
    mc.title,
    mc.priority,
    mc.state,
    mc.assigned_moderator_id,
    u.name as moderator_name,
    COUNT(r.id) as report_count,
    MAX(r.created_at) as latest_report_at,
    mc.created_at
FROM moderation_cases mc
LEFT JOIN users u ON mc.assigned_moderator_id = u.id
LEFT JOIN reports r ON mc.id = r.moderation_case_id
WHERE mc.state NOT IN ('RESOLVED', 'CLOSED')
GROUP BY mc.id, mc.case_number, mc.title, mc.priority, mc.state, mc.assigned_moderator_id, u.name, mc.created_at;

-- User trust summary view
CREATE VIEW user_trust_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    ts.overall_score,
    ts.trust_level,
    ts.content_quality_score,
    ts.community_engagement_score,
    ts.reliability_score,
    COUNT(r.id) as reports_received,
    COUNT(r2.id) as reports_made,
    ts.last_calculated_at
FROM users u
LEFT JOIN trust_scores ts ON u.id = ts.user_id
LEFT JOIN reports r ON u.id = r.reported_user_id
LEFT JOIN reports r2 ON u.id = r2.reporter_id
GROUP BY u.id, u.name, u.email, ts.overall_score, ts.trust_level, ts.content_quality_score, ts.community_engagement_score, ts.reliability_score, ts.last_calculated_at;

-- ========================================
-- SECURITY & AUDIT
-- ========================================

-- Row Level Security (RLS) for moderation tables
-- Enable RLS on sensitive tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on role system)
-- Only moderators and admins can see reports
CREATE POLICY report_access_policy ON reports
    FOR ALL
    TO authenticated_role -- Replace with actual role
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = current_user_id AND role IN ('ADMIN', 'MODERATOR'))
        OR reporter_id = current_user_id
    );

-- ========================================
-- COMMENTS
-- ========================================

-- This schema provides:
-- 1. Complete moderation lifecycle management
-- 2. Dynamic trust scoring system
-- 3. Automated flagging and detection
-- 4. Appeal process
-- 5. Comprehensive audit logging
-- 6. Performance-optimized indexes
-- 7. Security constraints and RLS
-- 8. Automated triggers and views
-- 9. Production-ready constraints
-- 10. Scalable architecture

-- Next phases should implement:
-- 1. Backend API layer with this schema
-- 2. Trust scoring algorithms
-- 3. Automated detection rules
-- 4. Role-based access control
-- 5. Comprehensive testing
-- 6. Documentation
-- 7. UI components
