-- Add notifications and email preferences tables

-- Email preferences table
CREATE TABLE email_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  mentorship_bookings BOOLEAN DEFAULT true,
  session_reminders BOOLEAN DEFAULT true,
  feedback_notifications BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  system_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for email preferences
CREATE INDEX email_preferences_user_id_idx ON email_preferences(user_id);

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for notifications
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at);
CREATE INDEX notifications_unread_idx ON notifications(user_id, is_read) WHERE is_read = false;

-- Email queue for batch processing
CREATE TABLE email_queue (
  id SERIAL PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  template VARCHAR(100) NOT NULL,
  data JSONB,
  priority INTEGER DEFAULT 1, -- 1=low, 2=normal, 3=high
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email queue
CREATE INDEX email_queue_status_idx ON email_queue(status);
CREATE INDEX email_queue_scheduled_at_idx ON email_queue(scheduled_at);
CREATE INDEX email_queue_priority_idx ON email_queue(priority DESC, scheduled_at);

-- User activity feed
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  activity_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  title VARCHAR(255),
  description TEXT,
  data JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for user activity
CREATE INDEX user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX user_activity_actor_id_idx ON user_activity(actor_id);
CREATE INDEX user_activity_type_idx ON user_activity(activity_type);
CREATE INDEX user_activity_entity_idx ON user_activity(entity_type, entity_id);
CREATE INDEX user_activity_created_at_idx ON user_activity(created_at);
CREATE INDEX user_activity_public_idx ON user_activity(is_public, created_at) WHERE is_public = true;

-- Following system
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, following_id)
);

-- Indexes for follows
CREATE INDEX follows_follower_id_idx ON follows(follower_id);
CREATE INDEX follows_following_id_idx ON follows(following_id);
CREATE INDEX follows_created_at_idx ON follows(created_at);

-- Bookmarks system
CREATE TABLE bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- post, mentor, session
  entity_id INTEGER NOT NULL,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, entity_type, entity_id)
);

-- Indexes for bookmarks
CREATE INDEX bookmarks_user_id_idx ON bookmarks(user_id);
CREATE INDEX bookmarks_entity_idx ON bookmarks(entity_type, entity_id);
CREATE INDEX bookmarks_created_at_idx ON bookmarks(created_at);

-- User achievements
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_data JSONB,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_type)
);

-- Indexes for user achievements
CREATE INDEX user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX user_achievements_type_idx ON user_achievements(achievement_type);

-- Update user model with new fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    -- Increment followers count for following
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    -- Decrement followers count for following
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follower count updates
CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity (
    user_id,
    actor_id,
    activity_type,
    entity_type,
    entity_id,
    title,
    description,
    data,
    is_public
  ) VALUES (
    COALESCE(NEW.mentee_id, NEW.mentorId, NEW.authorId, NEW.id),
    NEW.id,
    TG_TABLE_NAME,
    TG_TABLE_NAME,
    NEW.id,
    COALESCE(NEW.title, 'Activity'),
    COALESCE(NEW.description, 'New activity'),
    to_jsonb(NEW),
    true -- Make activities public by default
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER log_mentorship_activity
  AFTER INSERT OR UPDATE ON mentorships
  FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_post_activity
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_comment_activity
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION log_user_activity();

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  MENTORSHIP_BOOKING,
  SESSION_REMINDER,
  SESSION_COMPLETED,
  FEEDBACK_REQUEST,
  NEW_FOLLOWER,
  POST_LIKED,
  COMMENT_ADDED,
  MENTION,
  SYSTEM_ANNOUNCEMENT
);

-- Create activity types enum
CREATE TYPE activity_type AS ENUM (
  POST_CREATED,
  POST_LIKED,
  COMMENT_ADDED,
  MENTORSHIP_STARTED,
  SESSION_COMPLETED,
  USER_FOLLOWED,
  ACHIEVEMENT_UNLOCKED
);
