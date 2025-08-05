# Content Catalyst Engine - Database Schema and API Design

## Database Architecture Overview

### Database Technology Stack
- **Primary Database**: PostgreSQL 15+ (via Supabase)
- **Real-time Features**: PostgreSQL triggers + Supabase Realtime
- **Authentication**: Supabase Auth with RLS (Row Level Security)
- **File Storage**: Supabase Storage for video assets and thumbnails
- **Caching Layer**: Built-in PostgreSQL query optimization + Edge caching
- **Backup Strategy**: Automated daily backups with point-in-time recovery

### Schema Design Principles
1. **Data Integrity**: Foreign key constraints and check constraints
2. **Performance**: Strategic indexing and query optimization
3. **Security**: Row Level Security (RLS) for data isolation
4. **Scalability**: Normalized design with JSON for flexible data
5. **Auditability**: Created/updated timestamps and change tracking

## Complete Database Schema

### Core User Management

#### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  language_preference TEXT DEFAULT 'nl' CHECK (language_preference IN ('nl', 'en')),
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  
  -- YouTube Integration
  youtube_channel_id TEXT UNIQUE,
  youtube_channel_title TEXT,
  youtube_channel_description TEXT,
  youtube_subscriber_count INTEGER DEFAULT 0,
  youtube_access_token TEXT, -- Encrypted
  youtube_refresh_token TEXT, -- Encrypted
  youtube_token_expires_at TIMESTAMP WITH TIME ZONE,
  youtube_connected_at TIMESTAMP WITH TIME ZONE,
  
  -- User Preferences
  preferences JSONB DEFAULT '{
    "content_style": "motivational",
    "default_video_duration": 40,
    "auto_approve_titles": false,
    "auto_schedule_uploads": true,
    "notification_settings": {
      "email_on_completion": true,
      "email_on_failure": true,
      "daily_summary": true
    }
  }',
  
  -- Subscription Management
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'agency')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'suspended', 'expired')),
  subscription_starts_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage Tracking
  monthly_video_quota INTEGER DEFAULT 3,
  monthly_videos_used INTEGER DEFAULT 0,
  quota_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_youtube_channel_id ON users(youtube_channel_id) WHERE youtube_channel_id IS NOT NULL;
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Service role full access" ON users
  FOR ALL USING (auth.role() = 'service_role');
```

#### user_sessions table
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Auto cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions();');
```

### YouTube Data Management

#### youtube_videos table
```sql
CREATE TABLE youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- YouTube Metadata
  youtube_video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance Metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  dislike_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  average_view_duration_seconds DECIMAL(10,2),
  watch_time_minutes DECIMAL(12,2),
  click_through_rate DECIMAL(5,4), -- CTR as decimal (0.0456 = 4.56%)
  subscriber_growth INTEGER DEFAULT 0,
  
  -- Content Analysis
  tags TEXT[] DEFAULT '{}',
  category_id INTEGER,
  language TEXT DEFAULT 'nl',
  thumbnail_url TEXT,
  
  -- Performance Scoring
  performance_score DECIMAL(5,2), -- 0-100 calculated score
  performance_percentile DECIMAL(5,2), -- Percentile within user's channel
  
  -- Analytics Data (JSON for flexibility)
  analytics_data JSONB DEFAULT '{}',
  /*
  analytics_data structure:
  {
    "demographics": {
      "age_groups": {...},
      "gender": {...},
      "geography": {...}
    },
    "traffic_sources": {
      "youtube_search": 0.35,
      "suggested_videos": 0.28,
      "external": 0.15,
      "browse_features": 0.22
    },
    "retention_data": [
      {"timestamp": 0, "retention": 1.0},
      {"timestamp": 10, "retention": 0.85},
      ...
    ]
  }
  */
  
  -- Processing Status
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE UNIQUE INDEX idx_youtube_videos_youtube_id ON youtube_videos(youtube_video_id);
CREATE INDEX idx_youtube_videos_user_id ON youtube_videos(user_id);
CREATE INDEX idx_youtube_videos_performance_score ON youtube_videos(user_id, performance_score DESC NULLS LAST);
CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(user_id, published_at DESC);
CREATE INDEX idx_youtube_videos_view_count ON youtube_videos(user_id, view_count DESC);
CREATE INDEX idx_youtube_videos_analytics_status ON youtube_videos(analysis_status, last_analyzed_at);

-- GIN index for tag searching
CREATE INDEX idx_youtube_videos_tags ON youtube_videos USING GIN(tags);

-- Partial index for unanalyzed videos
CREATE INDEX idx_youtube_videos_needs_analysis ON youtube_videos(user_id, created_at) 
WHERE analysis_status IN ('pending', 'failed');

-- Row Level Security
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own videos" ON youtube_videos
  FOR ALL USING (user_id = auth.uid());
```

#### youtube_analytics_snapshots table
```sql
CREATE TABLE youtube_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES youtube_videos(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  metrics_type TEXT NOT NULL CHECK (metrics_type IN ('daily', 'weekly', 'monthly')),
  
  -- Metrics at snapshot time
  views INTEGER DEFAULT 0,
  watch_time_minutes DECIMAL(12,2) DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  
  -- Advanced metrics
  average_view_duration DECIMAL(10,2),
  click_through_rate DECIMAL(5,4),
  end_screen_clicks INTEGER DEFAULT 0,
  card_clicks INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate snapshots
  UNIQUE(video_id, snapshot_date, metrics_type)
);

CREATE INDEX idx_analytics_snapshots_video_date ON youtube_analytics_snapshots(video_id, snapshot_date DESC);
CREATE INDEX idx_analytics_snapshots_user_date ON youtube_analytics_snapshots(user_id, snapshot_date DESC);

-- RLS Policy
ALTER TABLE youtube_analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own analytics" ON youtube_analytics_snapshots
  FOR ALL USING (user_id = auth.uid());
```

### AI Content Generation

#### generated_content table
```sql
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content Details
  content_type TEXT NOT NULL CHECK (content_type IN ('title', 'script', 'description', 'tags', 'thumbnail_prompt')),
  generated_text TEXT NOT NULL,
  formatted_text TEXT, -- For RevID formatting
  
  -- Generation Context
  source_video_ids UUID[] DEFAULT '{}', -- Array of video IDs used for analysis
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.5-pro',
  prompt_template TEXT,
  prompt_used TEXT,
  
  -- Generation Parameters
  generation_parameters JSONB DEFAULT '{}',
  /*
  generation_parameters structure:
  {
    "style": "motivational",
    "language": "nl",
    "duration_seconds": 40,
    "hook_intensity": "high",
    "call_to_action": true,
    "keywords": ["motivatie", "succes", "mindset"],
    "target_audience": "young_adults"
  }
  */
  
  -- Quality and Approval
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected', 'used', 'archived')),
  quality_score DECIMAL(3,2), -- 0-10 quality rating
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,
  
  -- Usage Tracking
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  
  -- AI Metadata
  generation_metadata JSONB DEFAULT '{}',
  /*
  generation_metadata structure:
  {
    "model_version": "gemini-2.5-pro-001",
    "prompt_tokens": 156,
    "completion_tokens": 89,
    "generation_time_ms": 1250,
    "confidence_score": 0.85,
    "cost_usd": 0.0023
  }
  */
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_generated_content_created_at ON generated_content(created_at DESC);
CREATE INDEX idx_generated_content_user_type_status ON generated_content(user_id, content_type, status);

-- GIN index for source video IDs array
CREATE INDEX idx_generated_content_source_videos ON generated_content USING GIN(source_video_ids);

-- RLS Policy
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own content" ON generated_content
  FOR ALL USING (user_id = auth.uid());
```

#### content_templates table
```sql
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Template Details
  name TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('title', 'script', 'description')),
  template_text TEXT NOT NULL,
  
  -- Template Parameters
  parameters JSONB DEFAULT '{}',
  /*
  parameters structure:
  {
    "variables": ["topic", "benefit", "emotion"],
    "style": "motivational",
    "length_target": 40,
    "required_elements": ["hook", "call_to_action"]
  }
  */
  
  -- Usage and Performance
  usage_count INTEGER DEFAULT 0,
  average_performance DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Can be shared with other users
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX idx_content_templates_type ON content_templates(content_type);
CREATE INDEX idx_content_templates_public ON content_templates(is_public) WHERE is_public = true;

-- RLS Policy
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON content_templates
  FOR ALL USING (user_id = auth.uid() OR is_public = true);
```

### Video Production Pipeline

#### video_production_jobs table
```sql
CREATE TABLE video_production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Job Configuration
  title_id UUID REFERENCES generated_content(id),
  script_id UUID REFERENCES generated_content(id),
  description_id UUID REFERENCES generated_content(id),
  tags_id UUID REFERENCES generated_content(id),
  
  -- RevID Integration
  revid_job_id TEXT UNIQUE,
  revid_video_id TEXT,
  
  -- Job Status and Progress
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  
  -- Production Settings
  production_settings JSONB DEFAULT '{
    "voice_id": "cjVigY5qzO86Huf0OWal",
    "background_music_id": "iky1ZYcS4AfCoof9TRhn",
    "generation_preset": "PIXAR",
    "enhanced_generation": true,
    "aspect_ratio": "9:16",
    "duration_seconds": 40
  }',
  
  -- Results and Output
  video_url TEXT,
  thumbnail_url TEXT,
  video_duration_seconds INTEGER,
  file_size_bytes BIGINT,
  
  -- Error Handling
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timing
  queued_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost Tracking
  generation_cost_usd DECIMAL(10,4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_jobs_user_id ON video_production_jobs(user_id);
CREATE INDEX idx_video_jobs_status ON video_production_jobs(status);
CREATE INDEX idx_video_jobs_created_at ON video_production_jobs(created_at DESC);
CREATE INDEX idx_video_jobs_revid_id ON video_production_jobs(revid_job_id) WHERE revid_job_id IS NOT NULL;

-- Compound index for job queue processing
CREATE INDEX idx_video_jobs_queue ON video_production_jobs(status, created_at) 
WHERE status IN ('pending', 'queued');

-- RLS Policy
ALTER TABLE video_production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own jobs" ON video_production_jobs
  FOR ALL USING (user_id = auth.uid());
```

#### video_job_logs table
```sql
CREATE TABLE video_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES video_production_jobs(id) ON DELETE CASCADE,
  
  -- Log Details
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  
  -- Context
  step TEXT, -- 'script_formatting', 'api_call', 'video_generation', etc.
  revid_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_video_job_logs_job_id ON video_job_logs(job_id, created_at);
CREATE INDEX idx_video_job_logs_level ON video_job_logs(log_level, created_at);

-- Auto-cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_job_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM video_job_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('cleanup-job-logs', '0 2 * * *', 'SELECT cleanup_old_job_logs();');
```

### Upload and Scheduling System

#### upload_schedule table
```sql
CREATE TABLE upload_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_job_id UUID REFERENCES video_production_jobs(id) ON DELETE CASCADE,
  
  -- Schedule Configuration
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category_id INTEGER DEFAULT 22, -- People & Blogs
  
  -- YouTube Settings
  privacy_status TEXT DEFAULT 'public' CHECK (privacy_status IN ('public', 'unlisted', 'private')),
  is_made_for_kids BOOLEAN DEFAULT false,
  license TEXT DEFAULT 'youtube',
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  auto_publish BOOLEAN DEFAULT true,
  
  -- Status and Results
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'uploading', 'uploaded', 'failed', 'cancelled')),
  youtube_video_id TEXT,
  youtube_url TEXT,
  upload_progress_percentage INTEGER DEFAULT 0,
  
  -- Upload Response Data
  upload_response JSONB DEFAULT '{}',
  error_message TEXT,
  error_code TEXT,
  
  -- Timing
  upload_started_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance Tracking (filled after upload)
  initial_views INTEGER,
  views_24h INTEGER,
  views_7d INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_schedule_time CHECK (scheduled_for > created_at)
);

-- Indexes
CREATE INDEX idx_upload_schedule_user_id ON upload_schedule(user_id);
CREATE INDEX idx_upload_schedule_scheduled_for ON upload_schedule(scheduled_for);
CREATE INDEX idx_upload_schedule_status ON upload_schedule(status);
CREATE INDEX idx_upload_schedule_youtube_video_id ON upload_schedule(youtube_video_id) WHERE youtube_video_id IS NOT NULL;

-- Index for pending uploads
CREATE INDEX idx_upload_schedule_pending ON upload_schedule(scheduled_for) 
WHERE status = 'scheduled' AND scheduled_for <= NOW();

-- RLS Policy
ALTER TABLE upload_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own uploads" ON upload_schedule
  FOR ALL USING (user_id = auth.uid());
```

#### content_calendar table
```sql
CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Calendar Entry
  date DATE NOT NULL,
  time_slot TIME DEFAULT '00:00:00',
  
  -- Content Planning
  planned_topic TEXT,
  content_category TEXT,
  target_keywords TEXT[],
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  
  -- Links to actual content
  video_job_id UUID REFERENCES video_production_jobs(id),
  upload_schedule_id UUID REFERENCES upload_schedule(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one entry per date per user
  UNIQUE(user_id, date)
);

CREATE INDEX idx_content_calendar_user_date ON content_calendar(user_id, date);
CREATE INDEX idx_content_calendar_status ON content_calendar(status);

-- RLS Policy
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own calendar" ON content_calendar
  FOR ALL USING (user_id = auth.uid());
```

### System Monitoring and Logging

#### system_logs table
```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Log Classification
  event_type TEXT NOT NULL, -- 'api_call', 'user_action', 'system_event', 'error', etc.
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL, -- 'youtube_api', 'gemini_api', 'revid_api', 'webapp', etc.
  
  -- Event Details
  message TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Context
  session_id TEXT,
  request_id TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Performance Metrics
  execution_time_ms INTEGER,
  memory_usage_mb DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for log analysis
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_system_logs_event_type ON system_logs(event_type, created_at DESC);
CREATE INDEX idx_system_logs_severity ON system_logs(severity, created_at DESC);
CREATE INDEX idx_system_logs_source ON system_logs(source, created_at DESC);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);

-- Partitioning by month for performance
CREATE TABLE system_logs_y2025m01 PARTITION OF system_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Auto-cleanup old logs (keep 90 days for info, 1 year for errors)
CREATE OR REPLACE FUNCTION cleanup_old_system_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days' 
  AND severity IN ('debug', 'info');
  
  DELETE FROM system_logs 
  WHERE created_at < NOW() - INTERVAL '1 year' 
  AND severity IN ('warning', 'error', 'critical');
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('cleanup-system-logs', '0 3 * * *', 'SELECT cleanup_old_system_logs();');
```

#### api_usage_tracking table
```sql
CREATE TABLE api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- API Details
  api_provider TEXT NOT NULL CHECK (api_provider IN ('youtube', 'gemini', 'revid')),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  
  -- Request/Response
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  status_code INTEGER,
  
  -- Performance
  response_time_ms INTEGER,
  
  -- Cost Tracking
  quota_cost INTEGER, -- YouTube quota units
  financial_cost_usd DECIMAL(10,6), -- Actual cost in USD
  
  -- Context
  feature_used TEXT, -- 'content_analysis', 'title_generation', 'video_creation', etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_usage_user_id ON api_usage_tracking(user_id, created_at DESC);
CREATE INDEX idx_api_usage_provider ON api_usage_tracking(api_provider, created_at DESC);
CREATE INDEX idx_api_usage_feature ON api_usage_tracking(feature_used, created_at DESC);

-- Monthly usage summary materialized view
CREATE MATERIALIZED VIEW monthly_api_usage AS
SELECT 
  user_id,
  api_provider,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as request_count,
  SUM(quota_cost) as total_quota_cost,
  SUM(financial_cost_usd) as total_financial_cost,
  AVG(response_time_ms) as avg_response_time
FROM api_usage_tracking
GROUP BY user_id, api_provider, DATE_TRUNC('month', created_at);

CREATE UNIQUE INDEX idx_monthly_api_usage ON monthly_api_usage(user_id, api_provider, month);

-- RLS Policy
ALTER TABLE api_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON api_usage_tracking
  FOR SELECT USING (user_id = auth.uid());
```

## Database Functions and Procedures

### Performance Score Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_video_performance_score(
  p_video_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_video RECORD;
  v_channel_avg RECORD;
  v_view_score DECIMAL(5,2);
  v_engagement_score DECIMAL(5,2);
  v_retention_score DECIMAL(5,2);
  v_growth_score DECIMAL(5,2);
  v_final_score DECIMAL(5,2);
  
  -- Configurable weights
  w_views DECIMAL(3,2) := 0.30;
  w_engagement DECIMAL(3,2) := 0.25;
  w_retention DECIMAL(3,2) := 0.20;
  w_growth DECIMAL(3,2) := 0.25;
BEGIN
  -- Get video data
  SELECT * INTO v_video
  FROM youtube_videos
  WHERE id = p_video_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get channel averages for comparison
  SELECT 
    AVG(view_count) as avg_views,
    AVG(like_count) as avg_likes,
    AVG(comment_count) as avg_comments,
    AVG(average_view_duration_seconds) as avg_duration
  INTO v_channel_avg
  FROM youtube_videos
  WHERE user_id = COALESCE(p_user_id, v_video.user_id)
  AND published_at >= NOW() - INTERVAL '90 days';
  
  -- Calculate view score (0-30 points)
  v_view_score := LEAST(30, 
    (v_video.view_count::DECIMAL / GREATEST(v_channel_avg.avg_views, 100)) * 15
  );
  
  -- Calculate engagement score (0-25 points) 
  v_engagement_score := LEAST(25,
    ((v_video.like_count + v_video.comment_count * 2)::DECIMAL / 
     GREATEST(v_video.view_count, 1)) * 2500
  );
  
  -- Calculate retention score (0-20 points)
  v_retention_score := CASE
    WHEN v_video.average_view_duration_seconds IS NULL THEN 10 -- Default score
    WHEN v_video.duration_seconds = 0 THEN 10
    ELSE LEAST(20, (v_video.average_view_duration_seconds / v_video.duration_seconds) * 20)
  END;
  
  -- Calculate growth score (0-25 points)
  v_growth_score := LEAST(25, v_video.subscriber_growth::DECIMAL / 10);
  
  -- Calculate weighted final score
  v_final_score := (v_view_score * w_views) + 
                   (v_engagement_score * w_engagement) + 
                   (v_retention_score * w_retention) + 
                   (v_growth_score * w_growth);
  
  -- Update the video record
  UPDATE youtube_videos 
  SET performance_score = v_final_score,
      updated_at = NOW()
  WHERE id = p_video_id;
  
  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;
```

### Content Generation Analytics
```sql
CREATE OR REPLACE FUNCTION get_content_generation_analytics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_generated INTEGER,
  total_approved INTEGER,
  total_used INTEGER,
  avg_quality_score DECIMAL(3,2),
  content_type_breakdown JSONB,
  daily_generation_trend JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH content_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_generated,
      COUNT(*) FILTER (WHERE status = 'approved')::INTEGER as total_approved,
      COUNT(*) FILTER (WHERE status = 'used')::INTEGER as total_used,
      AVG(quality_score) as avg_quality_score
    FROM generated_content
    WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
  ),
  type_breakdown AS (
    SELECT jsonb_object_agg(
      content_type, 
      jsonb_build_object(
        'count', count,
        'avg_quality', avg_quality
      )
    ) as content_type_breakdown
    FROM (
      SELECT 
        content_type,
        COUNT(*)::INTEGER as count,
        AVG(quality_score) as avg_quality
      FROM generated_content
      WHERE user_id = p_user_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY content_type
    ) t
  ),
  daily_trend AS (
    SELECT jsonb_object_agg(
      date_key,
      count
    ) as daily_generation_trend
    FROM (
      SELECT 
        DATE(created_at) as date_key,
        COUNT(*)::INTEGER as count
      FROM generated_content
      WHERE user_id = p_user_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL
      GROUP BY DATE(created_at)
      ORDER BY date_key
    ) t
  )
  SELECT 
    cs.total_generated,
    cs.total_approved,
    cs.total_used,
    cs.avg_quality_score,
    tb.content_type_breakdown,
    dt.daily_generation_trend
  FROM content_stats cs
  CROSS JOIN type_breakdown tb
  CROSS JOIN daily_trend dt;
END;
$$ LANGUAGE plpgsql;
```

### User Quota Management
```sql
CREATE OR REPLACE FUNCTION check_and_update_user_quota(
  p_user_id UUID,
  p_video_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_result JSONB;
BEGIN
  -- Get user quota information
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Check if quota reset is needed
  IF v_user.quota_reset_date <= CURRENT_DATE THEN
    UPDATE users 
    SET monthly_videos_used = 0,
        quota_reset_date = DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    WHERE id = p_user_id;
    
    v_user.monthly_videos_used := 0;
  END IF;
  
  -- Check if user has enough quota
  IF v_user.monthly_videos_used + p_video_count > v_user.monthly_video_quota THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quota exceeded',
      'quota_limit', v_user.monthly_video_quota,
      'quota_used', v_user.monthly_videos_used,
      'quota_remaining', v_user.monthly_video_quota - v_user.monthly_videos_used
    );
  END IF;
  
  -- Update quota usage
  UPDATE users 
  SET monthly_videos_used = monthly_videos_used + p_video_count
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'quota_limit', v_user.monthly_video_quota,
    'quota_used', v_user.monthly_videos_used + p_video_count,
    'quota_remaining', v_user.monthly_video_quota - v_user.monthly_videos_used - p_video_count
  );
END;
$$ LANGUAGE plpgsql;
```

### Automated Triggers

#### Update video performance percentiles
```sql
CREATE OR REPLACE FUNCTION update_video_percentiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Update percentile ranking when performance score changes
  WITH percentile_calc AS (
    SELECT 
      id,
      PERCENT_RANK() OVER (
        PARTITION BY user_id 
        ORDER BY performance_score
      ) * 100 as percentile
    FROM youtube_videos
    WHERE user_id = NEW.user_id
    AND performance_score IS NOT NULL
  )
  UPDATE youtube_videos v
  SET performance_percentile = pc.percentile
  FROM percentile_calc pc
  WHERE v.id = pc.id
  AND v.user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_percentiles
  AFTER UPDATE OF performance_score ON youtube_videos
  FOR EACH ROW
  WHEN (NEW.performance_score IS DISTINCT FROM OLD.performance_score)
  EXECUTE FUNCTION update_video_percentiles();
```

#### Log content generation events
```sql
CREATE OR REPLACE FUNCTION log_content_generation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_logs (
    user_id,
    event_type,
    severity,
    source,
    message,
    event_data
  ) VALUES (
    NEW.user_id,
    'content_generation',
    'info',
    'ai_generator',
    'Content generated: ' || NEW.content_type,
    jsonb_build_object(
      'content_id', NEW.id,
      'content_type', NEW.content_type,
      'ai_model', NEW.ai_model,
      'quality_score', NEW.quality_score
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_content_generation
  AFTER INSERT ON generated_content
  FOR EACH ROW
  EXECUTE FUNCTION log_content_generation();
```

## API Design Specifications

### RESTful API Structure

#### Base Configuration
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1';
const API_VERSION = 'v1';

// Standard API Response Format
interface APIResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}

// Standard Error Codes
enum APIErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### Authentication API Endpoints

#### POST /auth/youtube/connect
```typescript
interface YouTubeConnectRequest {
  authorization_code: string;
  state: string;
  redirect_uri: string;
}

interface YouTubeConnectResponse {
  success: boolean;
  channel: {
    id: string;
    title: string;
    description: string;
    subscriber_count: number;
    video_count: number;
    view_count: number;
  };
  permissions: string[];
}

// Implementation
export async function connectYouTubeChannel(
  request: YouTubeConnectRequest
): Promise<APIResponse<YouTubeConnectResponse>> {
  // Exchange authorization code for tokens
  // Store encrypted tokens in database
  // Fetch channel information
  // Update user record
  // Return channel information
}
```

#### POST /auth/youtube/refresh
```typescript
interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function refreshYouTubeToken(
  userId: string
): Promise<APIResponse<RefreshTokenResponse>> {
  // Retrieve encrypted refresh token
  // Call YouTube token refresh endpoint
  // Update stored access token
  // Return new token information
}
```

### Content Analysis API Endpoints

#### GET /api/analysis/videos/top
```typescript
interface TopVideosQuery {
  days?: number; // default: 30
  limit?: number; // default: 10
  sort_by?: 'views' | 'performance_score' | 'published_at';
  include_analytics?: boolean; // default: false
}

interface TopVideosResponse {
  videos: Array<{
    id: string;
    youtube_video_id: string;
    title: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string;
    performance_score: number;
    performance_percentile: number;
    analytics?: {
      watch_time_minutes: number;
      average_view_duration: number;
      click_through_rate: number;
      subscriber_growth: number;
      retention_data: Array<{
        timestamp: number;
        retention: number;
      }>;
    };
  }>;
  summary: {
    total_videos_analyzed: number;
    average_performance_score: number;
    top_keywords: string[];
    performance_trends: {
      views_trend: number;
      engagement_trend: number;
    };
  };
}
```

#### POST /api/analysis/videos/analyze
```typescript
interface AnalyzeVideosRequest {
  video_ids?: string[]; // Specific videos to analyze
  force_refresh?: boolean; // Force re-analysis
  include_competitors?: boolean; // Compare with similar channels
}

interface AnalyzeVideosResponse {
  analyzed_count: number;
  updated_count: number;
  failed_count: number;
  processing_time_seconds: number;
  insights: {
    top_performing_topics: string[];
    optimal_posting_times: string[];
    audience_preferences: {
      preferred_duration: number;
      engagement_patterns: Record<string, number>;
    };
  };
}
```

### Content Generation API Endpoints

#### POST /api/generate/titles
```typescript
interface GenerateTitlesRequest {
  source_analysis: {
    video_ids: string[];
    performance_threshold?: number; // Only use videos above this score
  };
  generation_params: {
    count: number; // 1-10
    style: 'motivational' | 'educational' | 'entertainment' | 'business';
    language: 'nl' | 'en';
    target_keywords?: string[];
    max_length?: number; // Characters
  };
  user_preferences?: {
    avoid_keywords?: string[];
    brand_voice?: string;
    target_audience?: string;
  };
}

interface GenerateTitlesResponse {
  titles: Array<{
    id: string;
    text: string;
    estimated_performance: number; // 0-100 prediction
    seo_score: number; // 0-100 SEO optimization score
    keywords_used: string[];
    character_count: number;
    reasons: string[]; // Why this title was generated
  }>;
  generation_metadata: {
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
    generation_time_ms: number;
    cost_usd: number;
  };
}
```

#### POST /api/generate/script
```typescript
interface GenerateScriptRequest {
  title_id: string;
  parameters: {
    duration_seconds: number; // 15-180
    language: 'nl' | 'en';
    style_preferences: {
      hook_intensity: 'subtle' | 'moderate' | 'intense';
      motivational_level: 'light' | 'medium' | 'strong';
      include_statistics: boolean;
      include_call_to_action: boolean;
    };
    target_audience?: {
      age_group: string;
      interests: string[];
      pain_points: string[];
    };
  };
}

interface GenerateScriptResponse {
  script: {
    id: string;
    full_text: string;
    structured_content: {
      hook: {
        text: string;
        duration_seconds: number;
        intensity_level: string;
      };
      body: {
        text: string;
        duration_seconds: number;
        key_points: string[];
      };
      call_to_action: {
        text: string;
        duration_seconds: number;
        action_type: string;
      };
    };
    revid_formatted: string; // Formatted for video generation
    estimated_reading_time: number;
    readability_score: number;
    emotional_tone_score: number;
  };
  quality_metrics: {
    hook_strength: number; // 0-10
    flow_coherence: number; // 0-10
    engagement_potential: number; // 0-10
    brand_alignment: number; // 0-10
  };
}
```

#### POST /api/generate/seo-content
```typescript
interface GenerateSEOContentRequest {
  video_context: {
    title: string;
    script: string;
    target_keywords: string[];
  };
  requirements: {
    description_min_words: number; // default: 150
    max_tags: number; // default: 15
    include_timestamps: boolean;
    include_hashtags: boolean;
  };
}

interface GenerateSEOContentResponse {
  description: {
    text: string;
    word_count: number;
    seo_score: number;
    keywords_density: Record<string, number>;
  };
  tags: Array<{
    tag: string;
    relevance_score: number;
    search_volume: 'low' | 'medium' | 'high';
  }>;
  suggested_hashtags: string[];
  meta_data: {
    estimated_reach: number;
    competition_level: 'low' | 'medium' | 'high';
    optimization_tips: string[];
  };
}
```

### Video Production API Endpoints

#### POST /api/video/generate
```typescript
interface GenerateVideoRequest {
  content_ids: {
    title_id: string;
    script_id: string;
    description_id?: string;
  };
  production_settings: {
    voice_id: string;
    background_music_id: string;
    generation_preset: 'PIXAR' | 'REALISTIC' | 'ANIMATED';
    enhanced_generation: boolean;
    aspect_ratio: '9:16' | '16:9' | '1:1';
    custom_settings?: {
      voice_speed: number; // 0.5-2.0
      music_volume: number; // 0-100
      transition_style: string;
    };
  };
  priority: 'low' | 'normal' | 'high'; // Affects queue position
}

interface GenerateVideoResponse {
  job: {
    id: string;
    status: 'queued' | 'processing';
    position_in_queue: number;
    estimated_completion_time: string; // ISO timestamp
    estimated_processing_minutes: number;
  };
  revid_job_id: string;
  webhook_url: string; // For status updates
}
```

#### GET /api/video/status/{job_id}
```typescript
interface VideoStatusResponse {
  job: {
    id: string;
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress_percentage: number;
    current_step: string;
    estimated_time_remaining: number; // seconds
  };
  result?: {
    video_url: string;
    thumbnail_url: string;
    duration_seconds: number;
    file_size_mb: number;
    quality_metrics: {
      video_quality: string;
      audio_quality: string;
      sync_accuracy: number;
    };
  };
  error?: {
    code: string;
    message: string;
    retry_possible: boolean;
  };
}
```

#### POST /api/video/{job_id}/retry
```typescript
interface RetryVideoRequest {
  modify_settings?: {
    voice_id?: string;
    background_music_id?: string;
    generation_preset?: string;
  };
  priority?: 'low' | 'normal' | 'high';
}

interface RetryVideoResponse {
  job: {
    id: string;
    retry_count: number;
    status: 'queued';
    estimated_completion_time: string;
  };
  revid_job_id: string;
}
```

### Upload and Scheduling API Endpoints

#### POST /api/upload/schedule
```typescript
interface ScheduleUploadRequest {
  video_job_id: string;
  seo_content: {
    title: string;
    description: string;
    tags: string[];
  };
  youtube_settings: {
    privacy_status: 'public' | 'unlisted' | 'private';
    category_id: number;
    is_made_for_kids: boolean;
    license: 'youtube' | 'creativeCommons';
  };
  scheduling: {
    scheduled_for?: string; // ISO timestamp, null for immediate
    timezone: string;
    auto_publish: boolean;
  };
}

interface ScheduleUploadResponse {
  schedule: {
    id: string;
    scheduled_for: string;
    queue_position: number;
    estimated_upload_time: string;
  };
  youtube_settings: {
    final_title: string; // May be truncated
    final_description: string;
    final_tags: string[];
    estimated_visibility: 'immediate' | 'delayed';
  };
}
```

#### GET /api/upload/calendar
```typescript
interface UploadCalendarQuery {
  start_date: string; // ISO date
  end_date: string; // ISO date
  status?: 'all' | 'scheduled' | 'uploaded' | 'failed';
}

interface UploadCalendarResponse {
  calendar_entries: Array<{
    date: string;
    entries: Array<{
      id: string;
      title: string;
      scheduled_time: string;
      status: string;
      youtube_url?: string;
      thumbnail_url: string;
      performance_preview?: {
        views_24h: number;
        likes_24h: number;
        comments_24h: number;
      };
    }>;
  }>;
  summary: {
    total_scheduled: number;
    total_uploaded: number;
    success_rate: number;
    next_available_slot: string;
  };
}
```

#### PATCH /api/upload/{schedule_id}
```typescript
interface UpdateScheduleRequest {
  title?: string;
  description?: string;
  tags?: string[];
  scheduled_for?: string;
  privacy_status?: 'public' | 'unlisted' | 'private';
}

interface UpdateScheduleResponse {
  updated_fields: string[];
  new_schedule_time?: string;
  warnings?: string[]; // e.g., "Title truncated to fit YouTube limits"
}
```

### Analytics and Reporting API Endpoints

#### GET /api/analytics/dashboard
```typescript
interface DashboardAnalyticsQuery {
  period: '7d' | '30d' | '90d' | '1y';
  metrics: string[]; // ['views', 'engagement', 'growth', 'performance']
  compare_previous?: boolean;
}

interface DashboardAnalyticsResponse {
  overview: {
    total_videos: number;
    total_views: number;
    total_watch_time_hours: number;
    average_performance_score: number;
    subscriber_growth: number;
  };
  trends: {
    views_trend: Array<{ date: string; value: number }>;
    engagement_trend: Array<{ date: string; value: number }>;
    performance_trend: Array<{ date: string; value: number }>;
  };
  comparisons?: {
    views_change: number; // Percentage change
    engagement_change: number;
    performance_change: number;
  };
  insights: {
    best_performing_content: string[];
    optimization_opportunities: string[];
    audience_insights: {
      peak_viewing_times: string[];
      preferred_content_length: number;
      engagement_patterns: Record<string, number>;
    };
  };
}
```

**[ ] TASK**: Implement comprehensive database migration system with rollback capabilities
**[ ] TASK**: Create database performance monitoring and optimization procedures
**[ ] TASK**: Build API rate limiting and quota management system
**[ ] TASK**: Implement comprehensive API documentation with OpenAPI/Swagger specification
**[ ] TASK**: Create automated database backup and disaster recovery procedures