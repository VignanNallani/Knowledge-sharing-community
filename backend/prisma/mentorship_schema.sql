-- Mentorship System Database Schema
-- Production-grade design with proper constraints, indexes, and audit fields

-- ========================================
-- ENUMS
-- ========================================

CREATE TYPE mentorship_request_status AS ENUM (
    'pending',
    'accepted', 
    'rejected',
    'expired',
    'withdrawn'
);

CREATE TYPE mentorship_relationship_status AS ENUM (
    'active',
    'paused',
    'completed',
    'terminated'
);

CREATE TYPE mentorship_type AS ENUM (
    'career',
    'technical',
    'leadership',
    'mixed'
);

CREATE TYPE session_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE session_type AS ENUM (
    'video',
    'call',
    'in_person',
    'chat'
);

CREATE TYPE feedback_type AS ENUM (
    'session_feedback',
    'relationship_feedback',
    'mentor_review',
    'mentee_review'
);

CREATE TYPE verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);

CREATE TYPE skill_level AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);

CREATE TYPE package_type AS ENUM (
    'one_time',
    'package',
    'subscription'
);

-- ========================================
-- CORE MENTORSHIP TABLES
-- ========================================

-- Skill taxonomy for standardized tagging
CREATE TABLE skill_tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    level skill_level NOT NULL DEFAULT 'intermediate',
    demand_score DECIMAL(3,2) DEFAULT 0.0 CHECK (demand_score >= 0 AND demand_score <= 10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mentor profiles extending user model
CREATE TABLE mentor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professional_title VARCHAR(150),
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    company VARCHAR(200),
    industry VARCHAR(100),
    bio TEXT,
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate >= 0),
    availability_preferences JSONB DEFAULT '{}',
    mentorship_types TEXT[] DEFAULT '{}',
    max_mentees INTEGER DEFAULT 5 CHECK (max_mentees > 0),
    response_rate DECIMAL(5,2) DEFAULT 0.0 CHECK (response_rate >= 0 AND response_rate <= 100),
    average_response_time INTEGER DEFAULT 0, -- in minutes
    verification_status verification_status DEFAULT 'pending',
    verification_documents TEXT[],
    featured_mentor BOOLEAN DEFAULT false,
    languages_spoken TEXT[] DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_mentor_user UNIQUE (user_id)
);

-- Mentee profiles extending user model
CREATE TABLE mentee_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_level VARCHAR(50),
    goals TEXT[] DEFAULT '{}',
    preferred_topics TEXT[] DEFAULT '{}',
    budget_range VARCHAR(50),
    availability JSONB DEFAULT '{}',
    learning_style VARCHAR(100),
    background TEXT,
    expectations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_mentee_user UNIQUE (user_id)
);

-- Mentor skills linking table
CREATE TABLE mentor_skills (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
    proficiency_level skill_level NOT NULL,
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    verified BOOLEAN DEFAULT false,
    verification_method VARCHAR(50),
    endorsements_count INTEGER DEFAULT 0 CHECK (endorsements_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_mentor_skill UNIQUE (mentor_id, skill_id)
);

-- Mentorship requests
CREATE TABLE mentorship_requests (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES mentee_profiles(id) ON DELETE CASCADE,
    status mentorship_request_status DEFAULT 'pending',
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('one_time', 'ongoing')),
    topic_description TEXT NOT NULL,
    goals TEXT[] DEFAULT '{}',
    expected_duration VARCHAR(50),
    proposed_schedule JSONB DEFAULT '{}',
    budget DECIMAL(10,2) CHECK (budget >= 0),
    urgency VARCHAR(20) DEFAULT 'normal',
    message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    rejection_reason TEXT,
    
    CONSTRAINT valid_expiry CHECK (expires_at > requested_at)
);

-- Skills requested in mentorship requests
CREATE TABLE request_skills (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES mentorship_requests(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    
    CONSTRAINT unique_request_skill UNIQUE (request_id, skill_id)
);

-- Active mentorship relationships
CREATE TABLE mentorship_relationships (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES mentee_profiles(id) ON DELETE CASCADE,
    status mentorship_relationship_status DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    type mentorship_type NOT NULL,
    frequency VARCHAR(50), -- e.g., "weekly", "bi-weekly", "monthly"
    duration VARCHAR(50), -- e.g., "3 months", "6 months"
    goals TEXT[] DEFAULT '{}',
    progress_notes TEXT DEFAULT '',
    next_session_date DATE,
    termination_reason TEXT,
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_end_date CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT unique_active_relationship UNIQUE (mentor_id, mentee_id) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Mentor availability
CREATE TABLE mentor_availability (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    recurring BOOLEAN DEFAULT true,
    specific_date DATE, -- NULL for recurring slots
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'busy', 'unavailable')),
    booking_buffer INTEGER DEFAULT 60, -- minutes
    max_sessions_per_day INTEGER DEFAULT 3 CHECK (max_sessions_per_day > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT either_recurring_or_specific CHECK (
        (recurring = true AND specific_date IS NULL) OR 
        (recurring = false AND specific_date IS NOT NULL)
    )
);

-- Mentorship sessions
CREATE TABLE mentorship_sessions (
    id SERIAL PRIMARY KEY,
    relationship_id INTEGER NOT NULL REFERENCES mentorship_relationships(id) ON DELETE CASCADE,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES mentee_profiles(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    status session_status DEFAULT 'scheduled',
    type session_type DEFAULT 'video',
    topic VARCHAR(200),
    agenda TEXT,
    notes TEXT,
    recording_url TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_by INTEGER REFERENCES users(id),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_scheduled_time CHECK (scheduled_end > scheduled_start),
    CONSTRAINT valid_actual_time CHECK (
        actual_start IS NULL OR 
        actual_end IS NULL OR 
        actual_end > actual_start
    )
);

-- Session topics/skills
CREATE TABLE session_topics (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
    
    CONSTRAINT unique_session_skill UNIQUE (session_id, skill_id)
);

-- Feedback system
CREATE TABLE mentorship_feedback (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_id INTEGER REFERENCES mentorship_relationships(id) ON DELETE SET NULL,
    session_id INTEGER REFERENCES mentorship_sessions(id) ON DELETE SET NULL,
    type feedback_type NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    expertise_rating INTEGER CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    comments TEXT,
    is_public BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    helpful_votes INTEGER DEFAULT 0 CHECK (helpful_votes >= 0),
    
    CONSTRAINT either_relationship_or_session CHECK (
        (relationship_id IS NOT NULL) OR (session_id IS NOT NULL)
    ),
    CONSTRAINT no_self_feedback CHECK (from_user_id != to_user_id)
);

-- Trust scores for reputation system
CREATE TABLE mentorship_trust_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) DEFAULT 70.0 CHECK (overall_score >= 0 AND overall_score <= 100),
    reliability_score DECIMAL(5,2) DEFAULT 70.0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
    expertise_score DECIMAL(5,2) DEFAULT 70.0 CHECK (expertise_score >= 0 AND expertise_score <= 100),
    communication_score DECIMAL(5,2) DEFAULT 70.0 CHECK (communication_score >= 0 AND communication_score <= 100),
    professionalism_score DECIMAL(5,2) DEFAULT 70.0 CHECK (professionalism_score >= 0 AND professionalism_score <= 100),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    response_rate DECIMAL(5,2) DEFAULT 0.0 CHECK (response_rate >= 0 AND response_rate <= 100),
    completion_rate DECIMAL(5,2) DEFAULT 0.0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
    on_time_rate DECIMAL(5,2) DEFAULT 0.0 CHECK (on_time_rate >= 0 AND on_time_rate <= 100),
    dispute_count INTEGER DEFAULT 0 CHECK (dispute_count >= 0),
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trend_direction VARCHAR(10) DEFAULT 'stable' CHECK (trend_direction IN ('up', 'down', 'stable')),
    
    CONSTRAINT unique_trust_score UNIQUE (user_id)
);

-- Mentorship packages for predefined offerings
CREATE TABLE mentorship_packages (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type package_type NOT NULL,
    duration VARCHAR(50),
    session_count INTEGER CHECK (session_count > 0),
    price DECIMAL(10,2) CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB DEFAULT '{}',
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    purchase_count INTEGER DEFAULT 0 CHECK (purchase_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Skill tags
CREATE INDEX idx_skill_tags_category ON skill_tags(category);
CREATE INDEX idx_skill_tags_active ON skill_tags(is_active);
CREATE INDEX idx_skill_tags_level ON skill_tags(level);

-- Mentor profiles
CREATE INDEX idx_mentor_profiles_user ON mentor_profiles(user_id);
CREATE INDEX idx_mentor_profiles_verification ON mentor_profiles(verification_status);
CREATE INDEX idx_mentor_profiles_featured ON mentor_profiles(featured_mentor);
CREATE INDEX idx_mentor_profiles_industry ON mentor_profiles(industry);
CREATE INDEX idx_mentor_profiles_experience ON mentor_profiles(years_of_experience);

-- Mentee profiles
CREATE INDEX idx_mentee_profiles_user ON mentee_profiles(user_id);
CREATE INDEX idx_mentee_profiles_career_level ON mentee_profiles(career_level);

-- Mentor skills
CREATE INDEX idx_mentor_skills_mentor ON mentor_skills(mentor_id);
CREATE INDEX idx_mentor_skills_skill ON mentor_skills(skill_id);
CREATE INDEX idx_mentor_skills_verified ON mentor_skills(verified);
CREATE INDEX idx_mentor_skills_proficiency ON mentor_skills(proficiency_level);

-- Mentorship requests
CREATE INDEX idx_requests_mentor ON mentorship_requests(mentor_id);
CREATE INDEX idx_requests_mentee ON mentorship_requests(mentee_id);
CREATE INDEX idx_requests_status ON mentorship_requests(status);
CREATE INDEX idx_requests_created ON mentorship_requests(requested_at);
CREATE INDEX idx_requests_expires ON mentorship_requests(expires_at);

-- Request skills
CREATE INDEX idx_request_skills_request ON request_skills(request_id);
CREATE INDEX idx_request_skills_skill ON request_skills(skill_id);

-- Mentorship relationships
CREATE INDEX idx_relationships_mentor ON mentorship_relationships(mentor_id);
CREATE INDEX idx_relationships_mentee ON mentorship_relationships(mentee_id);
CREATE INDEX idx_relationships_status ON mentorship_relationships(status);
CREATE INDEX idx_relationships_type ON mentorship_relationships(type);
CREATE INDEX idx_relationships_start ON mentorship_relationships(start_date);

-- Mentor availability
CREATE INDEX idx_availability_mentor ON mentor_availability(mentor_id);
CREATE INDEX idx_availability_status ON mentor_availability(status);
CREATE INDEX idx_availability_date ON mentor_availability(specific_date) WHERE specific_date IS NOT NULL;
CREATE INDEX idx_availability_recurring ON mentor_availability(day_of_week) WHERE recurring = true;

-- Sessions
CREATE INDEX idx_sessions_relationship ON mentorship_sessions(relationship_id);
CREATE INDEX idx_sessions_mentor ON mentorship_sessions(mentor_id);
CREATE INDEX idx_sessions_mentee ON mentorship_sessions(mentee_id);
CREATE INDEX idx_sessions_status ON mentorship_sessions(status);
CREATE INDEX idx_sessions_scheduled_start ON mentorship_sessions(scheduled_start);
CREATE INDEX idx_sessions_date ON mentorship_sessions(DATE(scheduled_start));

-- Session topics
CREATE INDEX idx_session_topics_session ON session_topics(session_id);
CREATE INDEX idx_session_topics_skill ON session_topics(skill_id);

-- Feedback
CREATE INDEX idx_feedback_from_user ON mentorship_feedback(from_user_id);
CREATE INDEX idx_feedback_to_user ON mentorship_feedback(to_user_id);
CREATE INDEX idx_feedback_relationship ON mentorship_feedback(relationship_id);
CREATE INDEX idx_feedback_session ON mentorship_feedback(session_id);
CREATE INDEX idx_feedback_type ON mentorship_feedback(type);
CREATE INDEX idx_feedback_public ON mentorship_feedback(is_public);
CREATE INDEX idx_feedback_rating ON mentorship_feedback(rating);

-- Trust scores
CREATE INDEX idx_trust_scores_user ON mentorship_trust_scores(user_id);
CREATE INDEX idx_trust_scores_overall ON mentorship_trust_scores(overall_score);
CREATE INDEX idx_trust_scores_calculated ON mentorship_trust_scores(last_calculated_at);

-- Packages
CREATE INDEX idx_packages_mentor ON mentorship_packages(mentor_id);
CREATE INDEX idx_packages_active ON mentorship_packages(is_active);
CREATE INDEX idx_packages_type ON mentorship_packages(type);

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_mentor_profiles_updated_at 
    BEFORE UPDATE ON mentor_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentee_profiles_updated_at 
    BEFORE UPDATE ON mentee_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_skills_updated_at 
    BEFORE UPDATE ON mentor_skills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_relationships_updated_at 
    BEFORE UPDATE ON mentorship_relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_availability_updated_at 
    BEFORE UPDATE ON mentor_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_sessions_updated_at 
    BEFORE UPDATE ON mentorship_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_packages_updated_at 
    BEFORE UPDATE ON mentorship_packages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Mentor directory view with aggregated data
CREATE VIEW mentor_directory AS
SELECT 
    mp.id,
    mp.user_id,
    u.name,
    u.email,
    mp.professional_title,
    mp.years_of_experience,
    mp.company,
    mp.industry,
    mp.bio,
    mp.hourly_rate,
    mp.verification_status,
    mp.featured_mentor,
    mp.languages_spoken,
    mts.overall_score,
    mts.review_count,
    mts.response_rate,
    mts.completion_rate,
    COUNT(DISTINCT ms.id) as skill_count,
    COUNT(DISTINCT mr.id) as active_relationships_count,
    COUNT(DISTINCT mreq.id) as pending_requests_count
FROM mentor_profiles mp
JOIN users u ON mp.user_id = u.id
LEFT JOIN mentorship_trust_scores mts ON mp.user_id = mts.user_id
LEFT JOIN mentor_skills ms ON mp.id = ms.mentor_id
LEFT JOIN mentorship_relationships mr ON mp.id = mr.mentor_id AND mr.status = 'active'
LEFT JOIN mentorship_requests mreq ON mp.id = mreq.mentor_id AND mreq.status = 'pending'
GROUP BY mp.id, u.name, u.email, mts.overall_score, mts.review_count, 
         mts.response_rate, mts.completion_rate;

-- Session statistics view
CREATE VIEW session_statistics AS
SELECT 
    ms.mentor_id,
    DATE_TRUNC('month', ms.scheduled_start) as month,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN ms.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN ms.status = 'cancelled' THEN 1 END) as cancelled_sessions,
    COUNT(CASE WHEN ms.status = 'no_show' THEN 1 END) as no_show_sessions,
    AVG(EXTRACT(EPOCH FROM (ms.actual_end - ms.actual_start))/60) as avg_duration_minutes
FROM mentorship_sessions ms
WHERE ms.scheduled_start >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY ms.mentor_id, DATE_TRUNC('month', ms.scheduled_start);

-- ========================================
-- CONSTRAINTS FOR BUSINESS RULES
-- ========================================

-- Prevent mentors from having too many active relationships
CREATE OR REPLACE FUNCTION check_max_mentees()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        DECLARE
            active_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO active_count
            FROM mentorship_relationships
            WHERE mentor_id = NEW.mentor_id AND status = 'active';
            
            IF active_count >= (SELECT max_mentees FROM mentor_profiles WHERE id = NEW.mentor_id) THEN
                RAISE EXCEPTION 'Mentor has reached maximum number of active mentees';
            END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_mentees
    BEFORE INSERT OR UPDATE ON mentorship_relationships
    FOR EACH ROW EXECUTE FUNCTION check_max_mentees();

-- Prevent session scheduling conflicts
CREATE OR REPLACE FUNCTION check_session_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'scheduled' THEN
        -- Check for overlapping sessions for the same mentor
        IF EXISTS (
            SELECT 1 FROM mentorship_sessions
            WHERE mentor_id = NEW.mentor_id
            AND status = 'scheduled'
            AND id != NEW.id
            AND (
                (NEW.scheduled_start <= scheduled_start AND NEW.scheduled_end > scheduled_start) OR
                (NEW.scheduled_start < scheduled_end AND NEW.scheduled_end >= scheduled_end) OR
                (NEW.scheduled_start >= scheduled_start AND NEW.scheduled_end <= scheduled_end)
            )
        ) THEN
            RAISE EXCEPTION 'Mentor already has a session scheduled during this time';
        END IF;
        
        -- Check for overlapping sessions for the same mentee
        IF EXISTS (
            SELECT 1 FROM mentorship_sessions
            WHERE mentee_id = NEW.mentee_id
            AND status = 'scheduled'
            AND id != NEW.id
            AND (
                (NEW.scheduled_start <= scheduled_start AND NEW.scheduled_end > scheduled_start) OR
                (NEW.scheduled_start < scheduled_end AND NEW.scheduled_end >= scheduled_end) OR
                (NEW.scheduled_start >= scheduled_start AND NEW.scheduled_end <= scheduled_end)
            )
        ) THEN
            RAISE EXCEPTION 'Mentee already has a session scheduled during this time';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_session_conflicts
    BEFORE INSERT OR UPDATE ON mentorship_sessions
    FOR EACH ROW EXECUTE FUNCTION check_session_conflicts();
