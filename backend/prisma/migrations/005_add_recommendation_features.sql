-- Add recommendation tracking and AI metadata tables for Day 9

-- Recommendation tracking tables
CREATE TABLE recommendation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  recommendation_type VARCHAR(50) NOT NULL, -- MENTOR, SESSION, POST, CONTENT
  entity_id INTEGER NOT NULL,
  recommendation_score DECIMAL(5,2) NOT NULL,
  algorithm_type VARCHAR(50) NOT NULL DEFAULT 'COLLABORATIVE_FILTERING',
  algorithm_data JSONB,
  user_feedback INTEGER, -- 1-5 rating
  is_clicked BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for recommendation_logs
CREATE INDEX recommendation_logs_user_id_idx ON recommendation_logs(user_id);
CREATE INDEX recommendation_logs_type_idx ON recommendation_logs(recommendation_type);
CREATE INDEX recommendation_logs_score_idx ON recommendation_logs(recommendation_score DESC);
CREATE INDEX recommendation_logs_created_at_idx ON recommendation_logs(created_at);
CREATE INDEX recommendation_logs_expires_at_idx ON recommendation_logs(expires_at);
CREATE INDEX recommendation_logs_entity_idx ON recommendation_logs(recommendation_type, entity_id);

-- User preference tracking for recommendations
CREATE TABLE user_recommendation_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  skill_weights JSONB DEFAULT '{}', -- Skill importance weights
  category_preferences JSONB DEFAULT '{}', -- Content category preferences
  interaction_history JSONB DEFAULT '[]', -- Recent interactions for learning
  feedback_history JSONB DEFAULT '[]', -- Feedback on recommendations
  auto_refresh BOOLEAN DEFAULT true,
  refresh_frequency INTEGER DEFAULT 3600, -- seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for user_recommendation_preferences
CREATE INDEX user_recommendation_preferences_user_id_idx ON user_recommendation_preferences(user_id);

-- AI metadata for content analysis
CREATE TABLE ai_metadata (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- POST, SESSION, USER
  entity_id INTEGER NOT NULL,
  feature_vector JSONB, -- AI-generated feature vector
  content_similarity JSONB, -- Content similarity scores
  engagement_prediction DECIMAL(5,2), -- Predicted engagement score
  trending_score DECIMAL(5,2), -- Trending algorithm score
  quality_score DECIMAL(5,2), -- Content quality assessment
  last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(entity_type, entity_id)
);

-- Indexes for ai_metadata
CREATE INDEX ai_metadata_entity_idx ON ai_metadata(entity_type, entity_id);
CREATE INDEX ai_metadata_trending_score_idx ON ai_metadata(trending_score DESC);
CREATE INDEX ai_metadata_quality_score_idx ON ai_metadata(quality_score DESC);
CREATE INDEX ai_metadata_last_analyzed_idx ON ai_metadata(last_analyzed);

-- Recommendation algorithm configuration
CREATE TABLE recommendation_algorithms (
  id SERIAL PRIMARY KEY,
  algorithm_name VARCHAR(100) NOT NULL UNIQUE,
  algorithm_type VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0, -- Weight in recommendation scoring
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for recommendation_algorithms
CREATE INDEX recommendation_algorithms_type_idx ON recommendation_algorithms(algorithm_type);
CREATE INDEX recommendation_algorithms_is_active_idx ON recommendation_algorithms(is_active);

-- User recommendation cache
CREATE TABLE recommendation_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  recommendation_data JSONB NOT NULL,
  expires_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for recommendation_cache
CREATE INDEX recommendation_cache_user_id_idx ON recommendation_cache(user_id);
CREATE INDEX recommendation_cache_key_idx ON recommendation_cache(cache_key);
CREATE INDEX recommendation_cache_expires_at_idx ON recommendation_cache(expires_at);

-- Content similarity tracking
CREATE TABLE content_similarity (
  id SERIAL PRIMARY KEY,
  entity1_type VARCHAR(50) NOT NULL,
  entity1_id INTEGER NOT NULL,
  entity2_type VARCHAR(50) NOT NULL,
  entity2_id INTEGER NOT NULL,
  similarity_score DECIMAL(5,2) NOT NULL,
  similarity_type VARCHAR(50) NOT NULL, -- COSINE, JACCARD, EUCLIDEAN
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(entity1_type, entity1_id, entity2_type, entity2_id, similarity_type)
);

-- Indexes for content_similarity
CREATE INDEX content_similarity_entity1_idx ON content_similarity(entity1_type, entity1_id);
CREATE INDEX content_similarity_entity2_idx ON content_similarity(entity2_type, entity2_id);
CREATE INDEX content_similarity_score_idx ON content_similarity(similarity_score DESC);
CREATE INDEX content_similarity_calculated_at_idx ON content_similarity(calculated_at);

-- Recommendation feedback collection
CREATE TABLE recommendation_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  recommendation_id INTEGER NOT NULL,
  feedback_type VARCHAR(20) NOT NULL, -- CLICK, DISMISS, LIKE, DISLIKE
  rating INTEGER, -- 1-5 rating
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recommendation_id) REFERENCES recommendation_logs(id) ON DELETE CASCADE
);

-- Indexes for recommendation_feedback
CREATE INDEX recommendation_feedback_user_id_idx ON recommendation_feedback(user_id);
CREATE INDEX recommendation_feedback_recommendation_id_idx ON recommendation_feedback(recommendation_id);
CREATE INDEX recommendation_feedback_type_idx ON recommendation_feedback(feedback_type);
CREATE INDEX recommendation_feedback_created_at_idx ON recommendation_feedback(created_at);

-- Create functions for recommendation calculations

-- Function to calculate collaborative filtering similarity
CREATE OR REPLACE FUNCTION calculate_collaborative_similarity(
  user1_id INTEGER,
  user2_id INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  DECLARE similarity_score DECIMAL;
  
  -- Get common items between users
  WITH common_items AS (
    SELECT 
      COUNT(*) as common_count
    FROM (
      SELECT post_id FROM likes WHERE user_id = user1
      INTERSECT
      SELECT post_id FROM likes WHERE user_id = user2
      
      UNION ALL
      
      SELECT followee_id FROM follows WHERE follower_id = user1
      INTERSECT
      SELECT followee_id FROM follows WHERE follower_id = user2
      
      UNION ALL
      
      SELECT bookmark_id FROM bookmarks WHERE user_id = user1
      INTERSECT
      SELECT bookmark_id FROM bookmarks WHERE user_id = user2
    )
  ),
  total_items AS (
    SELECT 
      COUNT(*) as total_count
    FROM (
        SELECT post_id FROM likes WHERE user_id = user1
        
        UNION ALL
        
        SELECT followee_id FROM follows WHERE follower_id = user1
        
        UNION ALL
        
        SELECT bookmark_id FROM bookmarks WHERE user_id = user1
    )
  )
  
  -- Calculate Jaccard similarity
  SELECT 
    CASE 
      WHEN total_items = 0 THEN 0.0
      WHEN common_items.common_count = 0 THEN 0.0
      ELSE (common_items.common_count::DECIMAL / total_items.total_count)
    END as similarity_score
  INTO similarity_score;
  
  RETURN similarity_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate content-based similarity
CREATE OR REPLACE FUNCTION calculate_content_similarity(
  content1_type VARCHAR(50),
  content1_id INTEGER,
  content2_type VARCHAR(50),
  content2_id INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  DECLARE similarity_score DECIMAL;
  
  -- Get feature vectors from AI metadata
  SELECT 
    COALESCE(
      (
        SELECT (
          (vector1.vector <#> vector2.vector) /
          (||vector1.vector||) * (||vector2.vector||)
        ) * 100
        FROM ai_metadata m1
        JOIN LATERAL JSON_ARRAY_ELEMENTS(m1.feature_vector) AS vector1(element, index) ON true
        JOIN LATERAL JSON_ARRAY_ELEMENTS(m2.feature_vector) AS vector2(element, index) ON vector1.index = vector2.index
        WHERE m1.entity_type = content1_type AND m1.entity_id = content1_id
        AND m2.entity_type = content2_type AND m2.entity_id = content2_id
      ),
      0.0
    )
  INTO similarity_score;
  
  RETURN similarity_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(
  entity_type VARCHAR(50),
  entity_id INTEGER,
  time_window_hours INTEGER DEFAULT 24
) RETURNS DECIMAL AS $$
BEGIN
  DECLARE trending_score DECIMAL;
  DECLARE engagement_weight DECIMAL DEFAULT 0.4;
  DECLARE recency_weight DECIMAL DEFAULT 0.3;
  DECLARE quality_weight DECIMAL DEFAULT 0.3;
  
  -- Get engagement metrics
  WITH engagement_data AS (
    SELECT 
      COALESCE(SUM(likes), 0) as likes,
      COALESCE(SUM(comments), 0) as comments,
      COALESCE(SUM(shares), 0) as shares,
      COALESCE(SUM(bookmarks), 0) as bookmarks,
      EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_ago
    FROM (
      SELECT 
        id, likes, comments, shares, bookmarks, created_at
      FROM posts
      WHERE id = entity_id AND is_published = true
      UNION ALL
      SELECT 
        id, 0, 0, 0, 0, created_at
      FROM mentorship_sessions
      WHERE id = entity_id AND status = 'COMPLETED'
    )
  ),
  quality_data AS (
    SELECT 
      COALESCE(quality_score, 0) as quality_score
    FROM ai_metadata
    WHERE entity_type = entity_type AND entity_id = entity_id
  )
  
  -- Calculate trending score
  SELECT 
    (
      (engagement.likes * 0.4 + engagement.comments * 0.3 + engagement.shares * 0.2 + engagement.bookmarks * 0.1) * 
      POWER(0.95, engagement.hours_ago / time_window_hours) * 100 +
      quality_data.quality_score * quality_weight * 100
    ) as trending_score
  INTO trending_score;
  
  RETURN trending_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update recommendation score based on feedback
CREATE OR REPLACE FUNCTION update_recommendation_score(
  recommendation_id INTEGER,
  feedback_rating INTEGER,
  feedback_type VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
  DECLARE current_score DECIMAL;
  DECLARE new_score DECIMAL;
  
  -- Get current recommendation score
  SELECT recommendation_score INTO current_score
  FROM recommendation_logs
  WHERE id = recommendation_id;
  
  -- Calculate new score based on feedback
  new_score := CASE
    WHEN feedback_type = 'LIKE' THEN 
      LEAST(current_score + (feedback_rating - 3) * 0.1, 5.0)
    WHEN feedback_type = 'DISMISS' THEN 
      LEAST(current_score - 0.5, 0.0)
    WHEN feedback_type = 'DISLIKE' THEN 
      LEAST(current_score - 0.3, 0.0)
    ELSE 
      current_score
  END;
  
  -- Update recommendation score
  UPDATE recommendation_logs
  SET 
    recommendation_score = new_score,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = recommendation_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic content analysis
CREATE OR REPLACE FUNCTION analyze_content_for_recommendations()
RETURNS TRIGGER AS $$
BEGIN
  -- This would typically call an external AI service
  -- For now, we'll use basic metrics as placeholders
  
  -- Update AI metadata for posts
  INSERT INTO ai_metadata (entity_type, entity_id, feature_vector, content_similarity, engagement_prediction, trending_score, quality_score)
  SELECT 
    'POST',
    id,
    -- Placeholder feature vector - in production, this would come from AI service
    json_build_array(
      json_build_object('skill', 'javascript'),
      json_build_object('length', LENGTH(content)),
      json_build_object('has_code', content ~ '[a-zA-Z]'::text),
      json_build_object('has_links', content ~ 'https?://[^\\s]+'::text),
      json_build_object('readability_score', LEAST(LENGTH(content) / 100, 1.0))
    ),
    -- Placeholder similarity scores
    json_build_object(),
    -- Placeholder engagement prediction
    CASE 
      WHEN (SELECT COUNT(*) FROM likes WHERE post_id = id) > 10 THEN 0.8
      WHEN (SELECT COUNT(*) FROM comments WHERE post_id = id) > 5 THEN 0.6
      ELSE 0.4
    END,
    -- Placeholder trending score
    calculate_trending_score('POST', id, 24),
    -- Placeholder quality score
    CASE 
      WHEN LENGTH(content) > 1000 THEN 0.9
      WHEN LENGTH(content) > 500 THEN 0.7
      WHEN LENGTH(content) > 100 THEN 0.5
      ELSE 0.3
    END,
    NOW(),
    NOW()
  FROM posts
  WHERE is_published = true
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    feature_vector = EXCLUDED.feature_vector,
    content_similarity = EXCLUDED.content_similarity,
    engagement_prediction = EXCLUDED.engagement_prediction,
    trending_score = EXCLUDED.trending_score,
    quality_score = EXCLUDED.quality_score,
    last_analyzed = NOW(),
    updated_at = NOW();
    
  -- Update AI metadata for users
  INSERT INTO ai_metadata (entity_type, entity_id, feature_vector, content_similarity, engagement_prediction, trending_score, quality_score)
  SELECT 
    'USER',
    id,
    -- Placeholder feature vector - in production, this would come from AI service
    json_build_array(
      json_build_object('experience_years', EXTRACT(EPOCH FROM (NOW() - created_at)) / (365 * 24 * 60 * 60)),
      json_build_object('session_count', (SELECT COUNT(*) FROM mentorship_sessions WHERE mentorId = id)),
      json_build_object('rating', COALESCE(AVG(rating), 0)),
      json_build_object('followers_count', followers_count),
      json_build_object('posts_count', (SELECT COUNT(*) FROM posts WHERE authorId = id))
    ),
    -- Placeholder similarity scores
    json_build_object(),
    -- Placeholder engagement prediction
    CASE 
      WHEN (SELECT COUNT(*) FROM mentorship_sessions WHERE mentorId = id AND status = 'COMPLETED') > 50 THEN 0.9
      WHEN (SELECT COUNT(*) FROM mentorship_sessions WHERE mentorId = id AND status = 'COMPLETED') > 20 THEN 0.7
      WHEN (SELECT COUNT(*) FROM mentorship_sessions WHERE mentorId = id AND status = 'COMPLETED') > 10 THEN 0.5
      ELSE 0.3
    END,
    -- Placeholder trending score
    CASE 
      WHEN (SELECT COUNT(*) FROM followers WHERE followingId = id) > 100 THEN 0.8
      WHEN (SELECT COUNT(*) FROM followers WHERE followingId = id) > 50 THEN 0.6
      WHEN (SELECT COUNT(*) FROM followers WHERE followingId = id) > 20 THEN 0.4
      ELSE 0.2
    END,
    -- Placeholder quality score
    CASE 
      WHEN (SELECT COUNT(*) FROM posts WHERE authorId = id) > 50 THEN 0.9
      WHEN (SELECT COUNT(*) FROM posts WHERE authorId = id) > 25 THEN 0.7
      WHEN (SELECT COUNT(*) FROM posts WHERE authorId = id > 10 THEN 0.5
      ELSE 0.3
    END,
    NOW(),
    NOW()
  FROM users
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    feature_vector = EXCLUDED.feature_vector,
    content_similarity = EXCLUDED.content_similarity,
    engagement_prediction = EXCLUDED.engagement_prediction,
    trending_score = EXCLUDED.trending_score,
    quality_score = EXCLUDED.quality_score,
    last_analyzed = NOW(),
    updated_at = NOW();
    
  -- Update AI metadata for sessions
  INSERT INTO ai_metadata (entity_type, entity_id, feature_vector, content_similarity, engagement_prediction, trending_score, quality_score)
  SELECT 
    'SESSION',
    id,
    -- Placeholder feature vector - in production, this would come from AI service
    json_build_array(
      json_build_object('duration_minutes', duration),
      json_build_object('rating', COALESCE(AVG(f.rating), 0)),
      json_build_object('price', price),
      json_build_object('skill_match', 0.8), -- Placeholder
      json_build_object('mentor_experience', EXTRACT(EPOCH FROM (NOW() - u.createdAt) / (365 * 24 * 60 * 60)))
    ),
    -- Placeholder similarity scores
    json_build_object(),
    -- Placeholder engagement prediction
    CASE 
      WHEN COALESCE(AVG(f.rating), 0) >= 4.5 THEN 0.9
      WHEN COALESCE(AVG(f.rating), 0) >= 4.0 THEN 0.8
      WHEN COALESCE(AVG(f.rating), 0) >= 3.5 THEN 0.7
      WHEN COALESCE(AVG(f.rating), 0) >= 3.0 THEN 0.6
      ELSE 0.5
    END,
    -- Placeholder trending score
    CASE 
      WHEN status = 'COMPLETED' THEN 0.8
      WHEN status = 'SCHEDULED' THEN 0.6
      ELSE 0.4
    END,
    -- Placeholder quality score
    CASE 
      WHEN COALESCE(AVG(f.rating), 0) >= 4.5 THEN 0.9
      WHEN COALESCE(AVG(f.rating), 0) >= 4.0 THEN 0.8
      WHEN COALESCE(AVG(f.rating), 0) >= 3.5 THEN 0.7
      WHEN COALESCE(AVG(f.rating), 0) >= 3.0 THEN 0.6
      ELSE 0.5
    END,
    NOW(),
    NOW()
  FROM mentorship_sessions s
    LEFT JOIN feedback f ON s.id = f.sessionId
    LEFT JOIN users u ON s.mentorId = u.id
    ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    feature_vector = EXCLUDED.feature_vector,
    content_similarity = EXCLUDED.content_similarity,
    engagement_prediction = EXCLUDED.engagement_prediction,
    trending_score = EXCLUDED.trending_score,
    quality_score = EXCLUDED.quality_score,
    last_analyzed = NOW(),
    updated_at = NOW();
    
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic content analysis
CREATE TRIGGER auto_analyze_content
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  WHEN (NEW.is_published = true OR OLD.is_published = true)
  EXECUTE FUNCTION analyze_content_for_recommendations();

CREATE TRIGGER auto_analyze_sessions
  AFTER INSERT OR UPDATE ON mentorship_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED' OR OLD.status = 'COMPLETED')
  EXECUTE FUNCTION analyze_content_for_recommendations();

-- Create trigger for user activity analysis
CREATE TRIGGER auto_analyze_user_activity
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION analyze_content_for_recommendations();

-- Create trigger for recommendation feedback
CREATE TRIGGER update_recommendation_score_on_feedback
  AFTER INSERT OR UPDATE ON recommendation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_recommend_score(NEW.recommendation_id, NEW.rating, NEW.feedback_type);

-- Create function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM recommendation_logs
  WHERE expires_at < NOW() AND is_clicked = false;
  
  GET DIAGNOSTICS ROW_COUNT INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh recommendation cache
CREATE OR REPLACE FUNCTION refresh_recommendation_cache()
RETURNS INTEGER AS $$
DECLARE refreshed_count INTEGER;
BEGIN
  -- Delete expired cache entries
  DELETE FROM recommendation_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS ROW_COUNT INTO refreshed_count;
  
  RETURN refreshed_count;
END;
$$ LANGUAGE plpgsql;

-- Create cron job for periodic tasks
CREATE OR REPLACE FUNCTION recommendation_maintenance()
RETURNS VOID AS $$
BEGIN
  -- Clean up expired recommendations
  PERFORM cleanup_expired_recommendations();
  
  -- Refresh recommendation cache
  PERFORM refresh_recommendation_cache();
  
  -- Update trending scores
  PERFORM analyze_content_for_recommendations();
  
  -- Update user recommendation preferences
  UPDATE user_recommendation_preferences
  SET updated_at = NOW()
  WHERE auto_refresh = true 
    AND last_updated < NOW() - INTERVAL '1 hour';
  
  -- Log maintenance
  INSERT INTO analytics_events (user_id, event_type, eventData)
  SELECT 
    1, -- System user ID
    'RECOMMENDATION_MAINTENANCE',
    json_build_object(
      'expired_cleaned', deleted_count
    ),
    NULL,
    'system',
    NULL,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create enum types for recommendation system
CREATE TYPE recommendation_type AS ENUM (
  MENTOR,
  SESSION,
  POST,
  CONTENT,
  SKILL,
  COMMUNITY
);

CREATE TYPE algorithm_type AS ENUM (
  COLLABORATIVE_FILTERING,
  CONTENT_BASED,
  SKILL_BASED,
  TRENDING_BASED,
  HYBRID_RECOMMENDATION,
  POPULARITY_BASED
);

CREATE TYPE feedback_type AS ENUM (
  CLICK,
  DISMISS,
  LIKE,
  DISLIKE,
  VIEW,
  SHARE,
  BOOKMARK,
  FOLLOW
  UNFOLLOW
);

CREATE TYPE similarity_type AS ENUM (
  COSINE,
  JACCARD,
  EUCLIDEAN,
  MANHATTAN,
  PEARSON,
  DICE
);

CREATE TYPE recommendation_status AS ENUM (
  ACTIVE,
  EXPIRED,
  DISMISSED,
  CLICKED
);

CREATE TYPE cache_key_type AS ENUM (
  MENTOR_RECOMMENDATIONS,
  SESSION_RECOMMENDATIONS,
  POST_RECOMMENDATIONS,
  USER_PREFERENCES,
  TRENDING_CONTENT,
  SIMILARITY_CACHE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recommendation_logs_user_type_score ON recommendation_logs(user_id, recommendation_type, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_logs_entity_score ON recommendation_logs(recommendation_type, entity_id, recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metadata_trending_quality ON ai_metadata(trending_score DESC, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_similarity_score ON content_similarity(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_recommendation_preferences_refresh ON user_recommendation_preferences(auto_refresh, refresh_frequency);

-- Create view for recommendation analytics
CREATE OR REPLACE VIEW recommendation_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_recommendations,
  COUNT(CASE WHEN is_clicked THEN 1 END) as clicked_recommendations,
  AVG(recommendation_score) as avg_score,
  AVG(CASE WHEN user_feedback THEN user_feedback END) as avg_feedback,
  recommendation_type,
  algorithm_type,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT entity_id) as unique_entities
FROM recommendation_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  DATE_TRUNC('day', created_at),
  recommendation_type,
  algorithm_type
ORDER BY date DESC, total_recommendations DESC;

-- Create view for recommendation performance
CREATE OR REPLACE VIEW recommendation_performance AS
SELECT 
  r.recommendation_type,
  AVG(r.recommendation_score) as avg_score,
  COUNT(*) as total_recommendations,
  COUNT(CASE WHEN r.is_clicked THEN 1 END) as clicked_count,
  COUNT(CASE WHEN r.is_dismissed THEN 1 END) as dismissed_count,
  AVG(CASE WHEN r.user_feedback THEN r.user_feedback END) as avg_feedback,
  r.algorithm_type,
  DATE_TRUNC('day', r.created_at) as date
FROM recommendation_logs r
WHERE r.created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  r.recommendation_type,
  r.algorithm_type,
  DATE_TRUNC('day', r.created_at)
ORDER BY date DESC, avg_score DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT ON recommendation_analytics TO public;
GRANT SELECT ON recommendation_performance TO public;
GRANT EXECUTE ON FUNCTION calculate_collaborative_similarity TO public;
GRANT EXECUTE ON FUNCTION calculate_content_similarity TO public;
GRANT EXECUTE FUNCTION calculate_trending_score TO public;
GRANT EXECUTE FUNCTION update_recommendation_score TO public;
GRANT EXECUTE FUNCTION cleanup_expired_recommendations TO public;
GRANT EXECUTE FUNCTION refresh_recommendation_cache TO public;
GRANT EXECUTE FUNCTION recommendation_maintenance TO public;
