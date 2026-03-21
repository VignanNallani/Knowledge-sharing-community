-- Database Schema Enhancements for Production Hardening
-- This script adds missing indexes, constraints, and optimizations

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created_status 
ON posts(author_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_status_created 
ON posts(created_at DESC) 
WHERE deleted_at IS NULL AND is_published = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created 
ON comments(post_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_author_created 
ON comments(author_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_user_created 
ON likes(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followers_follower_created 
ON followers(follower_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followers_following_created 
ON followers(following_id, created_at DESC);

-- Mentorship and slot indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_mentor_status 
ON mentorships(mentor_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_mentee_status 
ON mentorships(mentee_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slots_mentor_status_start 
ON slots(mentor_id, status, start_at) 
WHERE status IN ('OPEN', 'BOOKED');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slots_status_start 
ON slots(status, start_at) 
WHERE status = 'OPEN';

-- Activity feed indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user_type_created 
ON activities(user_id, type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_entity_created 
ON activities(entity, entity_id, created_at DESC);

-- Report handling indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_status_created 
ON reports(status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_post_status 
ON reports(post_id, status) 
WHERE post_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_user_status 
ON reports(reported_user_id, status) 
WHERE reported_user_id IS NOT NULL;

-- ========================================
-- CONSTRAINTS AND VALIDATIONS
-- ========================================

-- Add check constraints for data integrity
ALTER TABLE posts 
ADD CONSTRAINT IF NOT EXISTS chk_posts_title_length 
CHECK (length(title) >= 3 AND length(title) <= 500);

ALTER TABLE posts 
ADD CONSTRAINT IF NOT EXISTS chk_posts_content_length 
CHECK (length(content) >= 10);

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure mentorship status is valid
ALTER TABLE mentorships 
ADD CONSTRAINT IF NOT EXISTS chk_mentorship_status 
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'));

-- Ensure slot timing is logical
ALTER TABLE slots 
ADD CONSTRAINT IF NOT EXISTS chk_slots_timing 
CHECK (end_at > start_at);

-- ========================================
-- PARTIAL INDEXES FOR SOFT DELETES
-- ========================================

-- Create partial indexes that only include non-deleted records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_email 
ON users(email) 
WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active 
ON posts(id, author_id, created_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_active 
ON comments(id, post_id, created_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mentorships_active 
ON mentorships(id, mentor_id, mentee_id, status) 
WHERE deleted_at IS NULL;

-- ========================================
-- FULL-TEXT SEARCH OPTIMIZATIONS
-- ========================================

-- Create GIN indexes for better full-text search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_search_gin 
ON posts USING gin(to_tsvector('english', title || ' ' || content));

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables that need updated_at maintenance
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at 
    BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mentorships_updated_at ON mentorships;
CREATE TRIGGER update_mentorships_updated_at 
    BEFORE UPDATE ON mentorships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slots_updated_at ON slots;
CREATE TRIGGER update_slots_updated_at 
    BEFORE UPDATE ON slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View for active users with stats
CREATE OR REPLACE VIEW active_users_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(DISTINCT p.id) as posts_count,
    COUNT(DISTINCT f1.id) as followers_count,
    COUNT(DISTINCT f2.id) as following_count,
    COUNT(DISTINCT l.id) as likes_given_count
FROM users u
LEFT JOIN posts p ON u.id = p.author_id AND p.deleted_at IS NULL
LEFT JOIN followers f1 ON u.id = f1.following_id
LEFT JOIN followers f2 ON u.id = f2.follower_id
LEFT JOIN likes l ON u.id = l.user_id
WHERE u.deleted_at IS NULL AND u.is_active = true
GROUP BY u.id, u.name, u.email, u.created_at;

-- View for trending posts
CREATE OR REPLACE VIEW trending_posts AS
SELECT 
    p.*,
    COUNT(DISTINCT l.id) as likes_count,
    COUNT(DISTINCT c.id) as comments_count,
    (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT c.id)) as engagement_score
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id AND c.deleted_at IS NULL
WHERE p.deleted_at IS NULL 
    AND p.is_published = true
    AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.id
ORDER BY engagement_score DESC, p.created_at DESC;

-- ========================================
-- SECURITY ENHANCEMENTS
-- ========================================

-- Row Level Security (RLS) policies (optional - uncomment if needed)
/*
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (except admins)
CREATE POLICY users_own_data ON users
    FOR ALL TO authenticated_user
    USING (id = current_setting('app.current_user_id')::integer);

-- Users can see all published posts, but only edit their own
CREATE POLICY posts_view_policy ON posts
    FOR SELECT TO authenticated_user
    USING (is_published = true OR author_id = current_setting('app.current_user_id')::integer);

CREATE POLICY posts_modify_policy ON posts
    FOR ALL TO authenticated_user
    USING (author_id = current_setting('app.current_user_id')::integer);
*/

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Create a table to track slow queries
CREATE TABLE IF NOT EXISTS slow_query_log (
    id SERIAL PRIMARY KEY,
    query_text TEXT,
    execution_time_ms INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_email TEXT,
    query_hash TEXT
);

-- Index for querying slow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slow_query_timestamp 
ON slow_query_log(timestamp DESC);

-- ========================================
-- ANALYZE TABLES FOR OPTIMIZER
-- ========================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE posts;
ANALYZE comments;
ANALYZE likes;
ANALYZE followers;
ANALYZE mentorships;
ANALYZE slots;
ANALYZE activities;
ANALYZE reports;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema enhancements completed successfully';
    RAISE NOTICE 'Added indexes for performance optimization';
    RAISE NOTICE 'Added constraints for data integrity';
    RAISE NOTICE 'Added triggers for timestamp maintenance';
    RAISE NOTICE 'Added views for common query patterns';
    RAISE NOTICE 'Updated table statistics';
END $$;
