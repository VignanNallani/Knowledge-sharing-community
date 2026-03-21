-- Add analytics and gamification tables for Week 2

-- Analytics tables
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for analytics_events
CREATE INDEX analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX analytics_events_created_at_idx ON analytics_events(created_at);
CREATE INDEX analytics_events_session_id_idx ON analytics_events(session_id);

-- User activity logs
CREATE TABLE user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  activity_data JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_activity_logs
CREATE INDEX user_activity_logs_user_id_idx ON user_activity_logs(user_id);
CREATE INDEX user_activity_logs_activity_type_idx ON user_activity_logs(activity_type);
CREATE INDEX user_activity_logs_created_at_idx ON user_activity_logs(created_at);
CREATE INDEX user_activity_logs_entity_idx ON user_activity_logs(entity_type, entity_id);

-- Session engagement metrics
CREATE TABLE session_engagement_metrics (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  mentor_id INTEGER NOT NULL,
  engagement_score DECIMAL(5,2) DEFAULT 0.00,
  interaction_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  rating_given INTEGER,
  feedback_given BOOLEAN DEFAULT false,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for session_engagement_metrics
CREATE INDEX session_engagement_metrics_session_id_idx ON session_engagement_metrics(session_id);
CREATE INDEX session_engagement_metrics_user_id_idx ON session_engagement_metrics(user_id);
CREATE INDEX session_engagement_metrics_mentor_id_idx ON session_engagement_metrics(mentor_id);
CREATE INDEX session_engagement_metrics_created_at_idx ON session_engagement_metrics(created_at);

-- Mentor performance metrics
CREATE TABLE mentor_performance_metrics (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_mentees INTEGER DEFAULT 0,
  response_time_avg INTEGER DEFAULT 0, -- in minutes
  availability_score DECIMAL(5,2) DEFAULT 0.00,
  engagement_score DECIMAL(5,2) DEFAULT 0.00,
  revenue_generated DECIMAL(10,2) DEFAULT 0.00,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for mentor_performance_metrics
CREATE INDEX mentor_performance_metrics_mentor_id_idx ON mentor_performance_metrics(mentor_id);
CREATE INDEX mentor_performance_metrics_calculated_at_idx ON mentor_performance_metrics(calculated_at);

-- Gamification tables
CREATE TABLE user_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0,
  spent_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_points
CREATE INDEX user_points_user_id_idx ON user_points(user_id);
CREATE INDEX user_points_level_idx ON user_points(level);

CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  badge_type VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100) NOT NULL,
  badge_description TEXT,
  badge_icon VARCHAR(255),
  badge_color VARCHAR(20) DEFAULT '#000000',
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, badge_type)
);

-- Indexes for user_badges
CREATE INDEX user_badges_user_id_idx ON user_badges(user_id);
CREATE INDEX user_badges_badge_type_idx ON user_badges(badge_type);
CREATE INDEX user_badges_earned_at_idx ON user_badges(earned_at);

CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  achievement_icon VARCHAR(255),
  points_awarded INTEGER DEFAULT 0,
  progress_required INTEGER DEFAULT 100,
  progress_current INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_type)
);

-- Indexes for user_achievements
CREATE INDEX user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX user_achievements_achievement_type_idx ON user_achievements(achievement_type);
CREATE INDEX user_achievements_is_completed_idx ON user_achievements(is_completed);

CREATE TABLE point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- EARNED, SPENT, BONUS, PENALTY
  points INTEGER NOT NULL,
  source_type VARCHAR(50), -- SESSION_COMPLETED, POST_CREATED, COMMENT_ADDED, etc.
  source_id INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for point_transactions
CREATE INDEX point_transactions_user_id_idx ON point_transactions(user_id);
CREATE INDEX point_transactions_transaction_type_idx ON point_transactions(transaction_type);
CREATE INDEX point_transactions_source_type_idx ON point_transactions(source_type);
CREATE INDEX point_transactions_created_at_idx ON point_transactions(created_at);

-- Leaderboards
CREATE TABLE leaderboards (
  id SERIAL PRIMARY KEY,
  leaderboard_type VARCHAR(50) NOT NULL,
  leaderboard_name VARCHAR(100) NOT NULL,
  description TEXT,
  time_period VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY, ALL_TIME
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(leaderboard_type, time_period)
);

-- Indexes for leaderboards
CREATE INDEX leaderboards_type_period_idx ON leaderboards(leaderboard_type, time_period);
CREATE INDEX leaderboards_is_active_idx ON leaderboards(is_active);

CREATE TABLE leaderboard_entries (
  id SERIAL PRIMARY KEY,
  leaderboard_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rank_position INTEGER NOT NULL,
  score DECIMAL(10,2) NOT NULL,
  additional_data JSONB,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (leaderboard_id) REFERENCES leaderboards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(leaderboard_id, user_id)
);

-- Indexes for leaderboard_entries
CREATE INDEX leaderboard_entries_leaderboard_id_idx ON leaderboard_entries(leaderboard_id);
CREATE INDEX leaderboard_entries_user_id_idx ON leaderboard_entries(user_id);
CREATE INDEX leaderboard_entries_rank_position_idx ON leaderboard_entries(rank_position);
CREATE INDEX leaderboard_entries_calculated_at_idx ON leaderboard_entries(calculated_at);

-- AI Recommendations
CREATE TABLE user_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  recommendation_type VARCHAR(50) NOT NULL, -- MENTOR, SESSION, POST, CONTENT
  recommended_entity_id INTEGER NOT NULL,
  recommendation_score DECIMAL(5,2) NOT NULL,
  recommendation_data JSONB,
  is_viewed BOOLEAN DEFAULT false,
  is_interacted BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_recommendations
CREATE INDEX user_recommendations_user_id_idx ON user_recommendations(user_id);
CREATE INDEX user_recommendations_type_idx ON user_recommendations(recommendation_type);
CREATE INDEX user_recommendations_score_idx ON user_recommendations(recommendation_score DESC);
CREATE INDEX user_recommendations_expires_at_idx ON user_recommendations(expires_at);

-- Workflow automation
CREATE TABLE workflow_triggers (
  id SERIAL PRIMARY KEY,
  trigger_name VARCHAR(100) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- TIME_BASED, EVENT_BASED, CONDITION_BASED
  trigger_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for workflow_triggers
CREATE INDEX workflow_triggers_type_idx ON workflow_triggers(trigger_type);
CREATE INDEX workflow_triggers_is_active_idx ON workflow_triggers(is_active);

CREATE TABLE workflow_executions (
  id SERIAL PRIMARY KEY,
  trigger_id INTEGER NOT NULL,
  user_id INTEGER,
  workflow_type VARCHAR(50) NOT NULL,
  execution_data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (trigger_id) REFERENCES workflow_triggers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for workflow_executions
CREATE INDEX workflow_executions_trigger_id_idx ON workflow_executions(trigger_id);
CREATE INDEX workflow_executions_user_id_idx ON workflow_executions(user_id);
CREATE INDEX workflow_executions_status_idx ON workflow_executions(status);
CREATE INDEX workflow_executions_started_at_idx ON workflow_executions(started_at);

-- Social engagement enhancements
CREATE TABLE post_engagement (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  engagement_type VARCHAR(20) NOT NULL, -- LIKE, COMMENT, SHARE, BOOKMARK
  engagement_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id, engagement_type)
);

-- Indexes for post_engagement
CREATE INDEX post_engagement_post_id_idx ON post_engagement(post_id);
CREATE INDEX post_engagement_user_id_idx ON post_engagement(user_id);
CREATE INDEX post_engagement_type_idx ON post_engagement(engagement_type);

CREATE TABLE mentions (
  id SERIAL PRIMARY KEY,
  mentioner_id INTEGER NOT NULL,
  mentioned_user_id INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- POST, COMMENT, SESSION
  entity_id INTEGER NOT NULL,
  mention_text TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (mentioner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for mentions
CREATE INDEX mentions_mentioned_user_id_idx ON mentions(mentioned_user_id);
CREATE INDEX mentions_mentioner_id_idx ON mentions(mentioner_id);
CREATE INDEX mentions_entity_idx ON mentions(entity_type, entity_id);
CREATE INDEX mentions_is_read_idx ON mentions(is_read);
CREATE INDEX mentions_created_at_idx ON mentions(created_at);

-- Admin and moderation
CREATE TABLE moderation_reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER,
  reported_user_id INTEGER,
  reported_entity_type VARCHAR(50) NOT NULL, -- USER, POST, COMMENT, SESSION
  reported_entity_id INTEGER,
  report_reason VARCHAR(100) NOT NULL,
  report_description TEXT,
  report_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWING, RESOLVED, DISMISSED
  moderator_id INTEGER,
  moderator_notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for moderation_reports
CREATE INDEX moderation_reports_reported_user_id_idx ON moderation_reports(reported_user_id);
CREATE INDEX moderation_reports_status_idx ON moderation_reports(report_status);
CREATE INDEX moderation_reports_created_at_idx ON moderation_reports(created_at);

CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id INTEGER,
  target_entity_type VARCHAR(50),
  target_entity_id INTEGER,
  action_data JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for admin_actions
CREATE INDEX admin_actions_admin_id_idx ON admin_actions(admin_id);
CREATE INDEX admin_actions_target_user_id_idx ON admin_actions(target_user_id);
CREATE INDEX admin_actions_action_type_idx ON admin_actions(action_type);
CREATE INDEX admin_actions_created_at_idx ON admin_actions(created_at);

-- Create functions for automatic calculations

-- Function to calculate mentor performance metrics
CREATE OR REPLACE FUNCTION calculate_mentor_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mentor_performance_metrics (
    mentor_id,
    total_sessions,
    completed_sessions,
    average_rating,
    total_mentees,
    response_time_avg,
    availability_score,
    engagement_score,
    revenue_generated
  )
  SELECT 
    m.mentorId,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END) as completed_sessions,
    COALESCE(AVG(CASE WHEN f.rating IS NOT NULL THEN f.rating END), 0) as average_rating,
    COUNT(DISTINCT m.menteeId) as total_mentees,
    COALESCE(AVG(EXTRACT(EPOCH FROM (m.scheduledAt - m.createdAt))/60), 0) as response_time_avg,
    -- Calculate availability score based on completed vs scheduled sessions
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END)::DECIMAL / COUNT(*)) * 100
      ELSE 0 
    END as availability_score,
    -- Calculate engagement score based on ratings and completion rate
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COALESCE(AVG(CASE WHEN f.rating IS NOT NULL THEN f.rating END), 0) * 
         (COUNT(CASE WHEN m.status = 'COMPLETED' THEN 1 END)::DECIMAL / COUNT(*)) * 20)
      ELSE 0 
    END as engagement_score,
    COALESCE(SUM(CASE WHEN m.status = 'COMPLETED' THEN ms.price END), 0) as revenue_generated
  FROM mentorship_sessions m
  LEFT JOIN feedback f ON m.id = f.sessionId
  LEFT JOIN mentorship_sessions ms ON ms.mentorId = m.mentorId
  WHERE m.createdAt >= NOW() - INTERVAL '30 days'
  GROUP BY m.mentorId
  ON CONFLICT (mentor_id) DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    completed_sessions = EXCLUDED.completed_sessions,
    average_rating = EXCLUDED.average_rating,
    total_mentees = EXCLUDED.total_mentees,
    response_time_avg = EXCLUDED.response_time_avg,
    availability_score = EXCLUDED.availability_score,
    engagement_score = EXCLUDED.engagement_score,
    revenue_generated = EXCLUDED.revenue_generated,
    calculated_at = NOW(),
    updated_at = NOW();
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic mentor performance calculation
CREATE TRIGGER auto_calculate_mentor_performance
  AFTER INSERT OR UPDATE ON mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_mentor_performance_metrics();

-- Function to update user points
CREATE OR REPLACE FUNCTION update_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_points (user_id, total_points, available_points, level)
  SELECT 
    pt.user_id,
    COALESCE(SUM(CASE WHEN pt.transaction_type = 'EARNED' THEN pt.points ELSE -pt.points END), 0) as total_points,
    COALESCE(SUM(CASE WHEN pt.transaction_type = 'EARNED' THEN pt.points ELSE -pt.points END), 0) as available_points,
    CASE 
      WHEN COALESCE(SUM(CASE WHEN pt.transaction_type = 'EARNED' THEN pt.points ELSE -pt.points END), 0) >= 1000 THEN 
        FLOOR(COALESCE(SUM(CASE WHEN pt.transaction_type = 'EARNED' THEN pt.points ELSE -pt.points END), 0) / 1000) + 1
      ELSE 1 
    END as level
  FROM point_transactions pt
  GROUP BY pt.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = EXCLUDED.total_points,
    available_points = EXCLUDED.available_points,
    level = EXCLUDED.level,
    updated_at = NOW();
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic point calculation
CREATE TRIGGER auto_update_user_points
  AFTER INSERT OR UPDATE ON point_transactions
  FOR EACH ROW EXECUTE FUNCTION update_user_points();

-- Enums for better data integrity
CREATE TYPE analytics_event_type AS ENUM (
  PAGE_VIEW,
  SESSION_START,
  SESSION_END,
  POST_VIEW,
  POST_CREATE,
  POST_LIKE,
  POST_COMMENT,
  USER_FOLLOW,
  USER_UNFOLLOW,
  BOOKMARK_ADD,
  BOOKMARK_REMOVE,
  SEARCH_QUERY,
  LOGIN,
  LOGOUT,
  PROFILE_VIEW,
  NOTIFICATION_CLICK
);

CREATE TYPE user_activity_type AS ENUM (
  LOGIN,
  LOGOUT,
  PROFILE_UPDATE,
  POST_CREATE,
  POST_LIKE,
  POST_COMMENT,
  USER_FOLLOW,
  USER_UNFOLLOW,
  BOOKMARK_ADD,
  BOOKMARK_REMOVE,
  SESSION_START,
  SESSION_END,
  SESSION_COMPLETE,
  SEARCH_QUERY,
  NOTIFICATION_READ,
  ACHIEVEMENT_UNLOCK,
  LEVEL_UP
);

CREATE TYPE point_transaction_type AS ENUM (
  EARNED,
  SPENT,
  BONUS,
  PENALTY
);

CREATE TYPE badge_type AS ENUM (
  FIRST_POST,
  FIRST_SESSION,
  FIRST_FOLLOW,
  MENTOR_BADGE,
  TOP_CONTRIBUTOR,
  HELPFUL_MEMBER,
  COMMUNITY_LEADER,
  EARLY_ADOPTER,
  POWER_USER,
  EXPERT_MENTOR
);

CREATE TYPE achievement_type AS ENUM (
  SESSION_MILESTONE_1,
  SESSION_MILESTONE_5,
  SESSION_MILESTONE_10,
  SESSION_MILESTONE_25,
  SESSION_MILESTONE_50,
  SESSION_MILESTONE_100,
  POST_MILESTONE_1,
  POST_MILESTONE_5,
  POST_MILESTONE_10,
  POST_MILESTONE_25,
  POST_MILESTONE_50,
  POST_MILESTONE_100,
  FOLLOWER_MILESTONE_1,
  FOLLOWER_MILESTONE_5,
  FOLLOWER_MILESTONE_10,
  FOLLOWER_MILESTONE_25,
  FOLLOWER_MILESTONE_50,
  FOLLOWER_MILESTONE_100,
  POINT_MILESTONE_100,
  POINT_MILESTONE_500,
  POINT_MILESTONE_1000,
  POINT_MILESTONE_5000,
  RATING_MILESTONE_4_5,
  RATING_MILESTONE_5_0,
  ENGAGEMENT_MILESTONE_HIGH,
  CONTRIBUTION_MILESTONE_SIGNIFICANT
);

CREATE TYPE recommendation_type AS ENUM (
  MENTOR,
  SESSION,
  POST,
  CONTENT,
  SKILL,
  COMMUNITY
);

CREATE TYPE leaderboard_type AS ENUM (
  POINTS,
  SESSIONS_COMPLETED,
  RATING,
  FOLLOWERS,
  POSTS_CREATED,
  ENGAGEMENT_SCORE,
  CONTRIBUTION_SCORE
);

CREATE TYPE time_period AS ENUM (
  DAILY,
  WEEKLY,
  MONTHLY,
  QUARTERLY,
  YEARLY,
  ALL_TIME
);

CREATE TYPE workflow_trigger_type AS ENUM (
  TIME_BASED,
  EVENT_BASED,
  CONDITION_BASED,
  USER_ACTION_BASED
);

CREATE TYPE workflow_status AS ENUM (
  PENDING,
  RUNNING,
  COMPLETED,
  FAILED,
  CANCELLED
);

CREATE TYPE engagement_type AS ENUM (
  LIKE,
  COMMENT,
  SHARE,
  BOOKMARK,
  VIEW,
  CLICK
);

CREATE TYPE report_status AS ENUM (
  PENDING,
  REVIEWING,
  RESOLVED,
  DISMISSED,
  BANNED
);

CREATE TYPE admin_action_type AS ENUM (
  USER_BAN,
  USER_SUSPEND,
  USER_WARN,
  CONTENT_DELETE,
  CONTENT_HIDE,
  USER_ROLE_CHANGE,
  SYSTEM_ANNOUNCEMENT,
  FEATURE_TOGGLE
);
