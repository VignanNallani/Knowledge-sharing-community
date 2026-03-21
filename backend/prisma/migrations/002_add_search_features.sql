-- Add full-text search columns and indexes for search functionality

-- Add search vector columns to existing tables
ALTER TABLE posts ADD COLUMN search_vector tsvector;
ALTER TABLE users ADD COLUMN search_vector tsvector;

-- Create GIN indexes for search vectors
CREATE INDEX posts_search_vector_idx ON posts USING GIN(search_vector);
CREATE INDEX users_search_vector_idx ON users USING GIN(search_vector);

-- Create function to update search vectors
CREATE OR REPLACE FUNCTION update_post_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.skills, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search vectors
CREATE TRIGGER post_search_vector_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

CREATE TRIGGER user_search_vector_update
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_user_search_vector();

-- Update existing records
UPDATE posts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B');

UPDATE users SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(skills, '')), 'C');

-- Create search analytics table
CREATE TABLE search_analytics (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  user_id INTEGER,
  results_count INTEGER DEFAULT 0,
  search_type VARCHAR(50) NOT NULL,
  filters JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for search analytics
CREATE INDEX search_analytics_query_idx ON search_analytics USING GIN(to_tsvector('english', query));
CREATE INDEX search_analytics_user_id_idx ON search_analytics(user_id);
CREATE INDEX search_analytics_search_type_idx ON search_analytics(search_type);
CREATE INDEX search_analytics_created_at_idx ON search_analytics(created_at);

-- Create trending posts table
CREATE TABLE trending_posts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL UNIQUE,
  score DECIMAL(10, 2) DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Indexes for trending posts
CREATE INDEX trending_posts_score_idx ON trending_posts(score DESC);
CREATE INDEX trending_posts_post_id_idx ON trending_posts(post_id);

-- Create search suggestions table for autocomplete
CREATE TABLE search_suggestions (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  weight INTEGER DEFAULT 1,
  search_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for search suggestions
CREATE INDEX search_suggestions_query_idx ON search_suggestions USING GIN(to_tsvector('english', query));
CREATE INDEX search_suggestions_search_type_idx ON search_suggestions(search_type);
CREATE UNIQUE INDEX search_suggestions_unique_idx ON search_suggestions(query, suggestion, search_type);

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fuzzy matching
CREATE INDEX posts_title_trgm_idx ON posts USING GIN(title gin_trgm_ops);
CREATE INDEX posts_content_trgm_idx ON posts USING GIN(content gin_trgm_ops);
CREATE INDEX users_name_trgm_idx ON users USING GIN(name gin_trgm_ops);
CREATE INDEX users_skills_trgm_idx ON users USING GIN(skills gin_trgm_ops);

-- Create function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  hours_since_creation INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  -- Base score from engagement
  DECLARE base_score DECIMAL;
  DECLARE time_decay DECIMAL;
  DECLARE final_score DECIMAL;
  
  base_score := (like_count * 2) + (comment_count * 3) + (view_count * 0.1);
  
  -- Time decay: newer posts get higher scores
  IF hours_since_creation < 1 THEN
    time_decay := 1.0;
  ELSIF hours_since_creation < 24 THEN
    time_decay := 0.8;
  ELSIF hours_since_creation < 168 THEN -- 1 week
    time_decay := 0.6;
  ELSE
    time_decay := 0.4;
  END IF;
  
  final_score := base_score * time_decay;
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;
