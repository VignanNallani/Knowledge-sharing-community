-- Migration: Add Gamification Features
-- Description: Add tables for points, badges, achievements, leaderboards, and activity tracking

-- Create enum types for gamification
CREATE TYPE badge_type AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
CREATE TYPE achievement_type AS ENUM ('MENTOR_SESSIONS', 'POSTS_CREATED', 'LIKES_RECEIVED', 'COMMENTS_POSTED', 'FOLLOWERS_GAINED', 'STREAK_DAYS', 'SKILL_MASTERY', 'COMMUNITY_CONTRIBUTION');
CREATE TYPE activity_type AS ENUM ('MENTORSHIP_SESSION', 'POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'USER_FOLLOWED', 'BADGE_EARNED', 'ACHIEVEMENT_UNLOCKED', 'DAILY_LOGIN', 'WEEKLY_STREAK');
CREATE TYPE leaderboard_type AS ENUM ('GLOBAL', 'SKILL_BASED', 'FRIEND_BASED', 'WEEKLY', 'MONTHLY');
CREATE TYPE point_transaction_type AS ENUM ('EARNED', 'SPENT', 'BONUS', 'PENALTY');

-- Create user_points table
CREATE TABLE user_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_points INTEGER NOT NULL DEFAULT 0,
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_points_spent INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    experience_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_points UNIQUE (user_id)
);

-- Create badges table
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    badge_type badge_type NOT NULL,
    icon_url VARCHAR(255),
    points_value INTEGER NOT NULL DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_badges table (junction table for user-badge relationships)
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB NOT NULL DEFAULT '{}',
    is_displayed BOOLEAN NOT NULL DEFAULT true,
    
    CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- Create achievements table
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    achievement_type achievement_type NOT NULL,
    badge_type badge_type NOT NULL,
    points_reward INTEGER NOT NULL DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table (junction table for user-achievement relationships)
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB NOT NULL DEFAULT '{}',
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Create leaderboards table
CREATE TABLE leaderboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leaderboard_type leaderboard_type NOT NULL,
    skill_filter VARCHAR(50), -- For skill-based leaderboards
    time_period VARCHAR(20) NOT NULL DEFAULT 'all_time', -- 'daily', 'weekly', 'monthly', 'all_time'
    is_active BOOLEAN NOT NULL DEFAULT true,
    max_entries INTEGER NOT NULL DEFAULT 100,
    reset_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'never'
    last_reset_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaderboard_entries table
CREATE TABLE leaderboard_entries (
    id SERIAL PRIMARY KEY,
    leaderboard_id INTEGER NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_position INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    previous_rank INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_leaderboard_entry UNIQUE (leaderboard_id, user_id)
);

-- Create point_transactions table for tracking point changes
CREATE TABLE point_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type point_transaction_type NOT NULL,
    points INTEGER NOT NULL, -- Positive for earned, negative for spent
    source_type VARCHAR(50) NOT NULL, -- 'session', 'post', 'achievement', 'badge', 'admin'
    source_id INTEGER, -- ID of the source entity
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table for tracking user activities
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_id INTEGER,
    points_earned INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create streak_tracking table for daily/weekly streaks
CREATE TABLE streak_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(20) NOT NULL, -- 'daily_login', 'weekly_activity', 'mentorship_streak'
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_streak UNIQUE (user_id, streak_type)
);

-- Create gamification_preferences table for user settings
CREATE TABLE gamification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    show_badges_publicly BOOLEAN NOT NULL DEFAULT true,
    show_points_publicly BOOLEAN NOT NULL DEFAULT true,
    show_achievements_publicly BOOLEAN NOT NULL DEFAULT true,
    enable_notifications BOOLEAN NOT NULL DEFAULT true,
    notification_types JSONB NOT NULL DEFAULT '["badge_earned", "achievement_unlocked", "leaderboard_change"]',
    leaderboard_preferences JSONB NOT NULL DEFAULT '{"show_global": true, "show_skill_based": true, "show_friend_based": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_gamification_preferences UNIQUE (user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_user_points_level ON user_points(level);
CREATE INDEX idx_user_points_total_points ON user_points(total_points_earned DESC);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(is_completed);
CREATE INDEX idx_user_achievements_completion ON user_achievements(completion_percentage DESC);

CREATE INDEX idx_leaderboards_type ON leaderboards(leaderboard_type);
CREATE INDEX idx_leaderboards_active ON leaderboards(is_active);
CREATE INDEX idx_leaderboards_skill ON leaderboards(skill_filter) WHERE skill_filter IS NOT NULL;

CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(rank_position);
CREATE INDEX idx_leaderboard_entries_score ON leaderboard_entries(score DESC);

CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at DESC);

CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

CREATE INDEX idx_streak_tracking_user_id ON streak_tracking(user_id);
CREATE INDEX idx_streak_tracking_type ON streak_tracking(streak_type);
CREATE INDEX idx_streak_tracking_current ON streak_tracking(current_streak DESC);

CREATE INDEX idx_gamification_preferences_user_id ON gamification_preferences(user_id);

-- Create functions for gamification calculations

-- Function to calculate user level based on experience points
CREATE OR REPLACE FUNCTION calculate_user_level(experience_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level calculation: 100 XP for level 1-2, 200 XP for level 2-3, 300 XP for level 3-4, etc.
    RETURN FLOOR(SQRT(2 * experience_points / 100 + 0.25) - 0.5) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to award points to user
CREATE OR REPLACE FUNCTION award_points(
    p_user_id INTEGER,
    p_points INTEGER,
    p_source_type VARCHAR(50),
    p_source_id INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    current_points_record RECORD;
    new_level INTEGER;
BEGIN
    -- Get or create user points record
    SELECT * INTO current_points_record FROM user_points WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_points (user_id, current_points, total_points_earned, experience_points)
        VALUES (p_user_id, p_points, p_points, p_points)
        RETURNING * INTO current_points_record;
    ELSE
        UPDATE user_points 
        SET 
            current_points = current_points + p_points,
            total_points_earned = total_points_earned + p_points,
            experience_points = experience_points + p_points,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING * INTO current_points_record;
    END IF;
    
    -- Calculate and update level
    new_level := calculate_user_level(current_points_record.experience_points);
    IF new_level != current_points_record.level THEN
        UPDATE user_points SET level = new_level WHERE user_id = p_user_id;
    END IF;
    
    -- Log the transaction
    INSERT INTO point_transactions (
        user_id, transaction_type, points, source_type, source_id, description, metadata
    ) VALUES (
        p_user_id, 'EARNED', p_points, p_source_type, p_source_id, p_description, p_metadata
    );
    
    -- Log the activity
    INSERT INTO activity_log (
        user_id, activity_type, source_type, source_id, points_earned, metadata
    ) VALUES (
        p_user_id, 'POST_CREATED', p_source_type, p_source_id, p_points, p_metadata
    );
    
    RETURN current_points_record.current_points;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id INTEGER)
RETURNS TABLE(achievement_id INTEGER, achievement_name VARCHAR, badge_type badge_type) AS $$
DECLARE
    user_achievement RECORD;
    achievement RECORD;
    progress INTEGER;
    should_award BOOLEAN;
BEGIN
    -- Check all active achievements
    FOR achievement IN 
        SELECT * FROM achievements WHERE is_active = true
    LOOP
        -- Check if user already has this achievement
        SELECT * INTO user_achievement 
        FROM user_achievements 
        WHERE user_id = p_user_id AND achievement_id = achievement.id;
        
        IF NOT FOUND OR NOT user_achievement.is_completed THEN
            -- Calculate progress based on achievement type
            progress := calculate_achievement_progress(p_user_id, achievement.achievement_type, achievement.requirements);
            
            should_award := progress >= 100;
            
            -- Update or create user achievement record
            IF user_achievement IS NOT NULL THEN
                UPDATE user_achievements 
                SET 
                    progress_data = jsonb_set(progress_data, '{progress}', to_jsonb(progress)),
                    completion_percentage = progress,
                    is_completed = should_award,
                    unlocked_at = CASE WHEN should_award AND NOT is_completed THEN NOW() ELSE unlocked_at END
                WHERE user_id = p_user_id AND achievement_id = achievement.id;
            ELSE
                INSERT INTO user_achievements (
                    user_id, achievement_id, progress_data, completion_percentage, is_completed, unlocked_at
                ) VALUES (
                    p_user_id, achievement.id, 
                    jsonb_build_object('progress', progress),
                    progress, should_award, CASE WHEN should_award THEN NOW() ELSE NULL END
                );
            END IF;
            
            -- Award achievement points and badge if completed
            IF should_award AND (user_achievement IS NULL OR NOT user_achievement.is_completed) THEN
                PERFORM award_points(p_user_id, achievement.points_reward, 'achievement', achievement.id, 
                    'Achievement unlocked: ' || achievement.name, achievement.requirements);
                
                -- Award associated badge
                PERFORM award_badge(p_user_id, achievement.badge_type, achievement.name, achievement.description);
                
                RETURN QUERY SELECT achievement.id, achievement.name, achievement.badge_type;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate achievement progress
CREATE OR REPLACE FUNCTION calculate_achievement_progress(
    p_user_id INTEGER, 
    p_achievement_type achievement_type, 
    p_requirements JSONB
)
RETURNS INTEGER AS $$
DECLARE
    progress INTEGER := 0;
    target_count INTEGER;
    current_count INTEGER;
BEGIN
    target_count := COALESCE((p_requirements->>'target')::INTEGER, 1);
    
    CASE p_achievement_type
        WHEN 'MENTOR_SESSIONS' THEN
            SELECT COUNT(*) INTO current_count 
            FROM mentorship_sessions 
            WHERE mentor_id = p_user_id AND status = 'COMPLETED';
            
        WHEN 'POSTS_CREATED' THEN
            SELECT COUNT(*) INTO current_count 
            FROM posts 
            WHERE author_id = p_user_id AND is_published = true;
            
        WHEN 'LIKES_RECEIVED' THEN
            SELECT COUNT(*) INTO current_count 
            FROM likes 
            JOIN posts ON likes.post_id = posts.id 
            WHERE posts.author_id = p_user_id;
            
        WHEN 'COMMENTS_POSTED' THEN
            SELECT COUNT(*) INTO current_count 
            FROM comments 
            WHERE author_id = p_user_id;
            
        WHEN 'FOLLOWERS_GAINED' THEN
            SELECT COUNT(*) INTO current_count 
            FROM user_follows 
            WHERE following_id = p_user_id;
            
        WHEN 'STREAK_DAYS' THEN
            SELECT COALESCE(current_streak, 0) INTO current_count 
            FROM streak_tracking 
            WHERE user_id = p_user_id AND streak_type = 'daily_login';
            
        WHEN 'SKILL_MASTERY' THEN
            -- Count sessions completed in specific skill
            SELECT COUNT(*) INTO current_count 
            FROM mentorship_sessions 
            WHERE mentor_id = p_user_id AND status = 'COMPLETED'
            AND EXISTS (
                SELECT 1 FROM users u WHERE u.id = p_user_id 
                AND u.skills ? (p_requirements->>'skill')
            );
            
        WHEN 'COMMUNITY_CONTRIBUTION' THEN
            -- Combined contribution score
            SELECT 
                (SELECT COUNT(*) FROM posts WHERE author_id = p_user_id AND is_published = true) * 2 +
                (SELECT COUNT(*) FROM comments WHERE author_id = p_user_id) +
                (SELECT COUNT(*) FROM mentorship_sessions WHERE mentor_id = p_user_id AND status = 'COMPLETED') * 5
            INTO current_count;
            
        ELSE
            current_count := 0;
    END CASE;
    
    -- Calculate percentage progress
    progress := LEAST(100, (current_count * 100) / target_count);
    
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Function to award badge to user
CREATE OR REPLACE FUNCTION award_badge(
    p_user_id INTEGER,
    p_badge_type badge_type,
    p_name VARCHAR,
    p_description TEXT
)
RETURNS INTEGER AS $$
DECLARE
    badge_id INTEGER;
    user_badge_id INTEGER;
BEGIN
    -- Find or create badge
    SELECT id INTO badge_id FROM badges WHERE name = p_name;
    
    IF NOT FOUND THEN
        INSERT INTO badges (name, description, badge_type)
        VALUES (p_name, p_description, p_badge_type)
        RETURNING id INTO badge_id;
    END IF;
    
    -- Award badge to user if not already awarded
    SELECT id INTO user_badge_id FROM user_badges WHERE user_id = p_user_id AND badge_id = badge_id;
    
    IF NOT FOUND THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (p_user_id, badge_id)
        RETURNING id INTO user_badge_id;
    END IF;
    
    RETURN user_badge_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update leaderboards
CREATE OR REPLACE FUNCTION update_leaderboard(p_leaderboard_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    leaderboard_record RECORD;
    entry RECORD;
    rank_counter INTEGER := 1;
    previous_score INTEGER := NULL;
    rank_offset INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- Get leaderboard info
    SELECT * INTO leaderboard_record FROM leaderboards WHERE id = p_leaderboard_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Clear existing entries for full refresh
    DELETE FROM leaderboard_entries WHERE leaderboard_id = p_leaderboard_id;
    
    -- Insert new entries based on leaderboard type
    CASE leaderboard_record.leaderboard_type
        WHEN 'GLOBAL' THEN
            INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank_position, score)
            SELECT 
                p_leaderboard_id,
                up.user_id,
                0, -- Will be updated below
                up.total_points_earned
            FROM user_points up
            ORDER BY up.total_points_earned DESC
            LIMIT leaderboard_record.max_entries;
            
        WHEN 'SKILL_BASED' THEN
            INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank_position, score)
            SELECT 
                p_leaderboard_id,
                up.user_id,
                0, -- Will be updated below
                COALESCE(
                    (SELECT COUNT(*) * 10 FROM mentorship_sessions 
                     WHERE mentor_id = up.user_id AND status = 'COMPLETED'
                     AND EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id AND u.skills ? leaderboard_record.skill_filter)), 0
                )
            FROM user_points up
            WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = up.user_id AND u.skills ? leaderboard_record.skill_filter)
            ORDER BY score DESC
            LIMIT leaderboard_record.max_entries;
            
        WHEN 'FRIEND_BASED' THEN
            -- This would need to be implemented based on user relationships
            -- For now, return empty
            RETURN 0;
            
        WHEN 'WEEKLY' THEN
            INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank_position, score)
            SELECT 
                p_leaderboard_id,
                up.user_id,
                0, -- Will be updated below
                COALESCE(
                    (SELECT COALESCE(SUM(points_earned), 0) FROM activity_log 
                     WHERE user_id = up.user_id 
                     AND created_at >= DATE_TRUNC('week', CURRENT_DATE)), 0
                )
            FROM user_points up
            ORDER BY score DESC
            LIMIT leaderboard_record.max_entries;
            
        WHEN 'MONTHLY' THEN
            INSERT INTO leaderboard_entries (leaderboard_id, user_id, rank_position, score)
            SELECT 
                p_leaderboard_id,
                up.user_id,
                0, -- Will be updated below
                COALESCE(
                    (SELECT COALESCE(SUM(points_earned), 0) FROM activity_log 
                     WHERE user_id = up.user_id 
                     AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0
                )
            FROM user_points up
            ORDER BY score DESC
            LIMIT leaderboard_record.max_entries;
    END CASE;
    
    -- Update ranks
    FOR entry IN 
        SELECT * FROM leaderboard_entries 
        WHERE leaderboard_id = p_leaderboard_id 
        ORDER BY score DESC, user_id
    LOOP
        IF previous_score IS NOT NULL AND entry.score = previous_score THEN
            rank_offset := rank_offset + 1;
        ELSE
            rank_counter := rank_counter + rank_offset;
            rank_offset := 0;
        END IF;
        
        UPDATE leaderboard_entries 
        SET rank_position = rank_counter 
        WHERE id = entry.id;
        
        previous_score := entry.score;
        updated_count := updated_count + 1;
    END LOOP;
    
    -- Update last reset time
    UPDATE leaderboards 
    SET last_reset_at = NOW(), updated_at = NOW() 
    WHERE id = p_leaderboard_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update streaks
CREATE OR REPLACE FUNCTION update_streak(p_user_id INTEGER, p_streak_type VARCHAR, p_activity_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    streak_record RECORD;
    new_streak INTEGER;
    should_reset BOOLEAN := false;
BEGIN
    -- Get existing streak record
    SELECT * INTO streak_record FROM streak_tracking WHERE user_id = p_user_id AND streak_type = p_streak_type;
    
    IF NOT FOUND THEN
        -- Create new streak record
        INSERT INTO streak_tracking (user_id, streak_type, current_streak, longest_streak, last_activity_date)
        VALUES (p_user_id, p_streak_type, 1, 1, p_activity_date)
        RETURNING * INTO streak_record;
        RETURN 1;
    END IF;
    
    -- Check if streak should continue or reset
    IF streak_record.last_activity_date IS NOT NULL THEN
        CASE p_streak_type
            WHEN 'daily_login' THEN
                should_reset := (p_activity_date - streak_record.last_activity_date) > 1;
            WHEN 'weekly_activity' THEN
                should_reset := (p_activity_date - streak_record.last_activity_date) > 7;
            WHEN 'mentorship_streak' THEN
                should_reset := (p_activity_date - streak_record.last_activity_date) > 1;
        END CASE;
    END IF;
    
    IF should_reset THEN
        new_streak := 1;
    ELSE
        new_streak := streak_record.current_streak + 1;
    END IF;
    
    -- Update streak record
    UPDATE streak_tracking 
    SET 
        current_streak = new_streak,
        longest_streak = GREATEST(longest_streak, new_streak),
        last_activity_date = p_activity_date,
        updated_at = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
    
    -- Award points for streak milestones
    IF new_streak IN (3, 7, 14, 30, 60, 100) THEN
        PERFORM award_points(p_user_id, new_streak * 10, 'streak', NULL, 
            'Streak milestone: ' || new_streak || ' days', 
            jsonb_build_object('streak_type', p_streak_type, 'streak_days', new_streak));
    END IF;
    
    RETURN new_streak;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic gamification

-- Trigger to award points for post creation
CREATE OR REPLACE FUNCTION award_post_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM award_points(NEW.author_id, 10, 'post', NEW.id, 'Post created', 
        jsonb_build_object('post_title', NEW.title, 'post_tags', NEW.tags));
    
    -- Check for achievements
    PERFORM check_and_award_achievements(NEW.author_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_post_points
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION award_post_points();

-- Trigger to award points for mentorship session completion
CREATE OR REPLACE FUNCTION award_session_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Award points to mentor
    PERFORM award_points(NEW.mentor_id, 50, 'session', NEW.id, 'Mentorship session completed', 
        jsonb_build_object('session_title', NEW.title, 'duration', NEW.duration));
    
    -- Award points to mentee
    PERFORM award_points(NEW.mentee_id, 25, 'session', NEW.id, 'Mentorship session attended', 
        jsonb_build_object('session_title', NEW.title, 'mentor_id', NEW.mentor_id));
    
    -- Update streaks
    PERFORM update_streak(NEW.mentor_id, 'mentorship_streak');
    PERFORM update_streak(NEW.mentee_id, 'weekly_activity');
    
    -- Check for achievements
    PERFORM check_and_award_achievements(NEW.mentor_id);
    PERFORM check_and_award_achievements(NEW.mentee_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_session_points
    AFTER UPDATE ON mentorship_sessions
    FOR EACH ROW
    WHEN (OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED')
    EXECUTE FUNCTION award_session_points();

-- Trigger to award points for likes
CREATE OR REPLACE FUNCTION award_like_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Award points to post author
    PERFORM award_points(
        (SELECT author_id FROM posts WHERE id = NEW.post_id), 
        2, 'like', NEW.id, 'Post received like', 
        jsonb_build_object('post_id', NEW.post_id, 'liked_by', NEW.user_id)
    );
    
    -- Check for achievements
    PERFORM check_and_award_achievements((SELECT author_id FROM posts WHERE id = NEW.post_id));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_like_points
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION award_like_points();

-- Trigger to award points for comments
CREATE OR REPLACE FUNCTION award_comment_points()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM award_points(NEW.author_id, 5, 'comment', NEW.id, 'Comment posted', 
        jsonb_build_object('post_id', NEW.post_id, 'comment_length', LENGTH(NEW.content)));
    
    -- Update weekly activity streak
    PERFORM update_streak(NEW.author_id, 'weekly_activity');
    
    -- Check for achievements
    PERFORM check_and_award_achievements(NEW.author_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_comment_points
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION award_comment_points();

-- Trigger to award points for follows
CREATE OR REPLACE FUNCTION award_follow_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Award points to user being followed
    PERFORM award_points(NEW.following_id, 3, 'follow', NEW.id, 'User gained follower', 
        jsonb_build_object('follower_id', NEW.follower_id));
    
    -- Check for achievements
    PERFORM check_and_award_achievements(NEW.following_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_follow_points
    AFTER INSERT ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION award_follow_points();

-- Create views for gamification analytics

-- View for user gamification summary
CREATE VIEW user_gamification_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.profile_image,
    up.current_points,
    up.total_points_earned,
    up.level,
    up.experience_points,
    COUNT(DISTINCT ub.badge_id) as badge_count,
    COUNT(DISTINCT ua.achievement_id) as achievement_count,
    COUNT(DISTINCT CASE WHEN ua.is_completed THEN ua.achievement_id END) as completed_achievements,
    COALESCE(st.current_streak, 0) as daily_streak,
    COALESCE((SELECT current_streak FROM streak_tracking st WHERE st.user_id = u.id AND st.streak_type = 'weekly_activity'), 0) as weekly_streak
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
LEFT JOIN user_badges ub ON u.id = ub.user_id AND ub.is_displayed = true
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN streak_tracking st ON u.id = st.user_id AND st.streak_type = 'daily_login'
GROUP BY u.id, up.current_points, up.total_points_earned, up.level, up.experience_points, st.current_streak;

-- View for leaderboard rankings
CREATE VIEW leaderboard_rankings AS
SELECT 
    le.rank_position,
    le.score,
    le.metadata,
    u.id as user_id,
    u.name,
    u.profile_image,
    up.level,
    up.total_points_earned,
    l.name as leaderboard_name,
    l.leaderboard_type,
    l.skill_filter,
    l.time_period,
    le.previous_rank,
    CASE 
        WHEN le.previous_rank IS NULL THEN NULL
        WHEN le.previous_rank > le.rank_position THEN 'up'
        WHEN le.previous_rank < le.rank_position THEN 'down'
        ELSE 'same'
    END as rank_change
FROM leaderboard_entries le
JOIN users u ON le.user_id = u.id
JOIN user_points up ON u.id = up.user_id
JOIN leaderboards l ON le.leaderboard_id = l.id
WHERE l.is_active = true
ORDER BY l.leaderboard_type, l.time_period, le.rank_position;

-- Insert default badges
INSERT INTO badges (name, description, badge_type, icon_url, points_value, requirements, sort_order) VALUES
('First Steps', 'Created your first post', 'BRONZE', '/badges/first-steps.png', 10, '{"post_count": 1}', 1),
('Rising Star', 'Reached level 5', 'SILVER', '/badges/rising-star.png', 50, '{"level": 5}', 2),
('Expert Mentor', 'Completed 10 mentorship sessions', 'GOLD', '/badges/expert-mentor.png', 100, '{"session_count": 10}', 3),
('Community Leader', 'Gained 100 followers', 'PLATINUM', '/badges/community-leader.png', 200, '{"follower_count": 100}', 4),
('Legendary', 'Reached maximum level', 'DIAMOND', '/badges/legendary.png', 500, '{"level": 50}', 5);

-- Insert default achievements
INSERT INTO achievements (name, description, achievement_type, badge_type, points_reward, requirements, sort_order) VALUES
('First Post', 'Create your first post', 'POSTS_CREATED', 'BRONZE', 10, '{"target": 1}', 1),
('Prolific Writer', 'Create 10 posts', 'POSTS_CREATED', 'SILVER', 50, '{"target": 10}', 2),
('Master Author', 'Create 50 posts', 'POSTS_CREATED', 'GOLD', 200, '{"target": 50}', 3),
('First Like', 'Receive your first like', 'LIKES_RECEIVED', 'BRONZE', 5, '{"target": 1}', 4),
('Popular Content', 'Receive 100 likes', 'LIKES_RECEIVED', 'SILVER', 100, '{"target": 100}', 5),
('Viral Creator', 'Receive 1000 likes', 'LIKES_RECEIVED', 'GOLD', 500, '{"target": 1000}', 6),
('First Comment', 'Post your first comment', 'COMMENTS_POSTED', 'BRONZE', 5, '{"target": 1}', 7),
('Active Participant', 'Post 50 comments', 'COMMENTS_POSTED', 'SILVER', 50, '{"target": 50}', 8),
('Conversation Master', 'Post 200 comments', 'COMMENTS_POSTED', 'GOLD', 200, '{"target": 200}', 9),
('First Follower', 'Gain your first follower', 'FOLLOWERS_GAINED', 'BRONZE', 5, '{"target": 1}', 10),
('Growing Influence', 'Gain 25 followers', 'FOLLOWERS_GAINED', 'SILVER', 50, '{"target": 25}', 11),
('Community Icon', 'Gain 100 followers', 'FOLLOWERS_GAINED', 'GOLD', 200, '{"target": 100}', 12),
('Mentor Debut', 'Complete your first mentorship session', 'MENTOR_SESSIONS', 'BRONZE', 25, '{"target": 1}', 13),
('Dedicated Mentor', 'Complete 25 mentorship sessions', 'MENTOR_SESSIONS', 'SILVER', 150, '{"target": 25}', 14),
('Master Mentor', 'Complete 100 mentorship sessions', 'MENTOR_SESSIONS', 'GOLD', 500, '{"target": 100}', 15),
('Week Warrior', '7-day login streak', 'STREAK_DAYS', 'BRONZE', 35, '{"target": 7}', 16),
('Monthly Champion', '30-day login streak', 'STREAK_DAYS', 'SILVER', 150, '{"target": 30}', 17),
('Year Legend', '365-day login streak', 'STREAK_DAYS', 'GOLD', 1000, '{"target": 365}', 18);

-- Insert default leaderboards
INSERT INTO leaderboards (name, description, leaderboard_type, skill_filter, time_period, max_entries, reset_frequency) VALUES
('Global Points', 'Total points earned across all activities', 'GLOBAL', NULL, 'all_time', 100, 'never'),
('Weekly Points', 'Points earned this week', 'GLOBAL', NULL, 'weekly', 50, 'weekly'),
('Monthly Points', 'Points earned this month', 'GLOBAL', NULL, 'monthly', 50, 'monthly'),
('JavaScript Masters', 'Top JavaScript experts', 'SKILL_BASED', 'javascript', 'all_time', 25, 'monthly'),
('React Champions', 'Top React developers', 'SKILL_BASED', 'react', 'all_time', 25, 'monthly'),
('Node.js Experts', 'Top Node.js specialists', 'SKILL_BASED', 'nodejs', 'all_time', 25, 'monthly'),
('Python Gurus', 'Top Python developers', 'SKILL_BASED', 'python', 'all_time', 25, 'monthly');

-- Create function to initialize user gamification data
CREATE OR REPLACE FUNCTION initialize_user_gamification(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Create user points record
    INSERT INTO user_points (user_id, current_points, total_points_earned, experience_points)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create gamification preferences
    INSERT INTO gamification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Initialize daily login streak
    INSERT INTO streak_tracking (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 'daily_login', 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id, streak_type) DO NOTHING;
    
    -- Initialize weekly activity streak
    INSERT INTO streak_tracking (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 'weekly_activity', 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id, streak_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize gamification for new users
CREATE OR REPLACE FUNCTION initialize_new_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_gamification(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_user_gamification
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_new_user_gamification();

-- Create function for daily leaderboard updates
CREATE OR REPLACE FUNCTION update_all_leaderboards()
RETURNS INTEGER AS $$
DECLARE
    leaderboard RECORD;
    total_updated INTEGER := 0;
BEGIN
    FOR leaderboard IN SELECT id FROM leaderboards WHERE is_active = true LOOP
        total_updated := total_updated + update_leaderboard(leaderboard.id);
    END LOOP;
    
    RETURN total_updated;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user rank on leaderboards
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(p_user_id INTEGER, p_leaderboard_type leaderboard_type, p_skill_filter VARCHAR DEFAULT NULL)
RETURNS TABLE(leaderboard_name VARCHAR, rank_position INTEGER, total_users INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.name,
        le.rank_position,
        (SELECT COUNT(*) FROM leaderboard_entries WHERE leaderboard_id = l.id)
    FROM leaderboards l
    JOIN leaderboard_entries le ON l.id = le.leaderboard_id
    WHERE l.leaderboard_type = p_leaderboard_type
    AND (p_skill_filter IS NULL OR l.skill_filter = p_skill_filter)
    AND le.user_id = p_user_id
    AND l.is_active = true;
END;
$$ LANGUAGE plpgsql;
