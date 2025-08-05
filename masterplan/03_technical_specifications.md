# Content Catalyst Engine - Technical Specifications

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  External APIs  │
│   (Next.js)     │◄──►│  (Supabase)     │◄──►│  (YouTube, AI)  │
│                 │    │                 │    │                 │
│ - Dashboard UI  │    │ - Auth & DB     │    │ - YouTube APIs  │
│ - Real-time     │    │ - Edge Functions│    │ - Gemini API    │
│ - Responsive    │    │ - File Storage  │    │ - RevID API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend Layer
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.0+
- **Components**: Shadcn/ui + Radix UI
- **State Management**: React Query (TanStack Query) + React Context
- **Real-time**: Supabase Realtime subscriptions
- **Charts**: Recharts for analytics visualization

#### Backend Layer
- **Database**: PostgreSQL 15+ (Supabase)
- **Authentication**: Supabase Auth with OAuth 2.0
- **API Layer**: Supabase Edge Functions (Deno runtime)
- **File Storage**: Supabase Storage for video assets
- **Background Jobs**: Supabase Edge Functions with queuing
- **Real-time**: PostgreSQL triggers + Supabase Realtime

#### External Integrations
- **YouTube APIs**: Data API v3, Analytics API, Upload API
- **AI Generation**: Google Gemini 2.5 Pro API
- **Video Generation**: RevID API
- **Authentication**: Google OAuth 2.0
- **Monitoring**: Supabase built-in monitoring

## Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  youtube_channel_id TEXT UNIQUE,
  youtube_channel_title TEXT,
  youtube_access_token TEXT,
  youtube_refresh_token TEXT,
  preferences JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);
```

#### youtube_videos
```sql
CREATE TABLE youtube_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  youtube_video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  tags TEXT[],
  performance_score DECIMAL(5,2),
  analytics_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_youtube_videos_user_id ON youtube_videos(user_id);
CREATE INDEX idx_youtube_videos_performance_score ON youtube_videos(performance_score DESC);
CREATE INDEX idx_youtube_videos_published_at ON youtube_videos(published_at DESC);

-- RLS Policy
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own videos" ON youtube_videos
  FOR ALL USING (user_id = auth.uid());
```

#### generated_content
```sql
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('title', 'script', 'description', 'tags')),
  source_video_ids UUID[] REFERENCES youtube_videos(id),
  generated_text TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  prompt_used TEXT,
  generation_metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected', 'used')),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);
CREATE INDEX idx_generated_content_status ON generated_content(status);

-- RLS Policy
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own content" ON generated_content
  FOR ALL USING (user_id = auth.uid());
```

#### video_production_jobs
```sql
CREATE TABLE video_production_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title_id UUID REFERENCES generated_content(id),
  script_id UUID REFERENCES generated_content(id),
  revid_job_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  video_url TEXT,
  generation_parameters JSONB DEFAULT '{}',
  error_message TEXT,
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_jobs_user_id ON video_production_jobs(user_id);
CREATE INDEX idx_video_jobs_status ON video_production_jobs(status);

-- RLS Policy
ALTER TABLE video_production_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own jobs" ON video_production_jobs
  FOR ALL USING (user_id = auth.uid());
```

#### upload_schedule
```sql
CREATE TABLE upload_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_job_id UUID REFERENCES video_production_jobs(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[],
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'uploading', 'uploaded', 'failed', 'cancelled')),
  youtube_video_id TEXT,
  upload_response JSONB,
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_upload_schedule_user_id ON upload_schedule(user_id);
CREATE INDEX idx_upload_schedule_scheduled_for ON upload_schedule(scheduled_for);
CREATE INDEX idx_upload_schedule_status ON upload_schedule(status);

-- RLS Policy
ALTER TABLE upload_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own uploads" ON upload_schedule
  FOR ALL USING (user_id = auth.uid());
```

#### system_logs
```sql
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
```

### Database Functions and Triggers

#### Update Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  
CREATE TRIGGER update_youtube_videos_updated_at BEFORE UPDATE ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Performance Score Calculation
```sql
CREATE OR REPLACE FUNCTION calculate_performance_score(
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  duration_seconds INTEGER,
  channel_average_views DECIMAL DEFAULT 1000
)
RETURNS DECIMAL AS $$
DECLARE
  view_score DECIMAL;
  engagement_score DECIMAL;
  retention_score DECIMAL;
  final_score DECIMAL;
BEGIN
  -- View score (0-40 points)
  view_score = LEAST(40, (views::DECIMAL / channel_average_views) * 20);
  
  -- Engagement score (0-35 points)
  engagement_score = LEAST(35, ((likes + comments * 2)::DECIMAL / GREATEST(views, 1)) * 3500);
  
  -- Retention estimate based on duration (0-25 points)
  retention_score = CASE 
    WHEN duration_seconds <= 30 THEN 25
    WHEN duration_seconds <= 60 THEN 20
    WHEN duration_seconds <= 120 THEN 15
    ELSE 10
  END;
  
  final_score = view_score + engagement_score + retention_score;
  
  RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;
```

## API Specifications

### Authentication Endpoints

#### POST /auth/youtube/callback
```typescript
interface YouTubeCallbackRequest {
  code: string;
  state: string;
}

interface YouTubeCallbackResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    youtube_channel_id: string;
    youtube_channel_title: string;
  };
  access_token: string;
}
```

#### POST /auth/youtube/refresh
```typescript
interface RefreshTokenRequest {
  user_id: string;
}

interface RefreshTokenResponse {
  success: boolean;
  access_token: string;
  expires_in: number;
}
```

### Content Analysis Endpoints

#### GET /api/analysis/top-videos
```typescript
interface TopVideosResponse {
  videos: Array<{
    id: string;
    title: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string;
    performance_score: number;
    analytics: {
      watch_time_minutes: number;
      ctr_percentage: number;
      subscriber_growth: number;
    };
  }>;
  summary: {
    total_videos: number;
    average_performance: number;
    top_keywords: string[];
    best_posting_times: string[];
  };
}
```

#### POST /api/analysis/calculate-scores
```typescript
interface CalculateScoresRequest {
  video_ids: string[];
  weights?: {
    views: number;
    watch_time: number;
    ctr: number;
    subscriber_growth: number;
    engagement: number;
  };
}

interface CalculateScoresResponse {
  scores: Array<{
    video_id: string;
    score: number;
    breakdown: {
      views: number;
      watch_time: number;
      ctr: number;
      subscriber_growth: number;
      engagement: number;
    };
  }>;
}
```

### Content Generation Endpoints

#### POST /api/generate/titles
```typescript
interface GenerateTitlesRequest {
  source_video_ids: string[];
  count?: number; // default: 5
  style?: 'motivational' | 'educational' | 'entertainment';
  language?: 'en' | 'nl'; // default: 'nl'
}

interface GenerateTitlesResponse {
  titles: Array<{
    id: string;
    text: string;
    confidence_score: number;
    keywords: string[];
    estimated_ctr: number;
  }>;
  generation_metadata: {
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
  };
}
```

#### POST /api/generate/script
```typescript
interface GenerateScriptRequest {
  title_id: string;
  duration_seconds?: number; // default: 40
  language?: 'en' | 'nl'; // default: 'nl'
  style_preferences?: {
    hook_intensity: 'low' | 'medium' | 'high';
    motivational_level: 'subtle' | 'moderate' | 'intense';
    call_to_action: boolean;
  };
}

interface GenerateScriptResponse {
  script: {
    id: string;
    full_text: string;
    sections: {
      hook: string;
      body: string;
      call_to_action: string;
    };
    estimated_duration: number;
    readability_score: number;
  };
  revid_formatted: string; // Formatted for RevID API
}
```

### Video Production Endpoints

#### POST /api/video/generate
```typescript
interface GenerateVideoRequest {
  script_id: string;
  production_settings: {
    voice_id: string; // default: 'cjVigY5qzO86Huf0OWal'
    background_music_id: string; // default: 'iky1ZYcS4AfCoof9TRhn'
    generation_preset: string; // default: 'PIXAR'
    enhanced_generation: boolean; // default: true
    aspect_ratio: '9:16' | '16:9'; // default: '9:16'
  };
}

interface GenerateVideoResponse {
  job_id: string;
  revid_job_id: string;
  estimated_completion_time: number; // seconds
  status: 'pending' | 'processing';
}
```

#### GET /api/video/status/{job_id}
```typescript
interface VideoStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  video_url?: string;
  error_message?: string;
  processing_time_seconds?: number;
}
```

### Upload and Scheduling Endpoints

#### POST /api/upload/schedule
```typescript
interface ScheduleUploadRequest {
  video_job_id: string;
  seo_content: {
    title: string;
    description: string;
    tags: string[];
  };
  scheduled_for?: string; // ISO timestamp, default: immediate
  privacy_status: 'public' | 'unlisted' | 'private';
}

interface ScheduleUploadResponse {
  schedule_id: string;
  scheduled_for: string;
  queue_position: number;
}
```

#### GET /api/upload/calendar
```typescript
interface UploadCalendarResponse {
  scheduled_uploads: Array<{
    id: string;
    title: string;
    scheduled_for: string;
    status: 'scheduled' | 'uploading' | 'uploaded' | 'failed';
    video_url?: string;
  }>;
  next_available_slot: string;
}
```

## External API Integration Specifications

### YouTube Data API v3 Integration

#### Configuration
```typescript
const YOUTUBE_CONFIG = {
  CLIENT_ID: 'your-actual-youtube-client-id',
  CLIENT_SECRET: 'your-actual-youtube-client-secret',
  SCOPES: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/yt-analytics.readonly'
  ],
  API_BASE_URL: 'https://www.googleapis.com/youtube/v3',
  QUOTA_LIMIT: 10000 // per day
};
```

#### Rate Limiting Strategy
```typescript
interface RateLimiter {
  daily_quota: number;
  requests_made: number;
  reset_time: Date;
  
  canMakeRequest(cost: number): boolean;
  recordRequest(cost: number): void;
  getAvailableQuota(): number;
}

const API_COSTS = {
  'videos.list': 1,
  'search.list': 100,
  'analytics.query': 1,
  'videos.insert': 1600
};
```

### Google Gemini 2.5 Pro Integration

#### Configuration
```typescript
const GEMINI_CONFIG = {
  API_KEY: 'your-gemini-api-key',
  MODEL: 'gemini-2.5-pro',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7
};
```

#### Prompt Templates
```typescript
const PROMPT_TEMPLATES = {
  TITLE_GENERATION: `
    Analyze these successful YouTube video titles and generate 5 new title suggestions:
    
    Top performing titles:
    {top_titles}
    
    Performance data:
    {performance_metrics}
    
    Generate titles that:
    - Match the successful pattern
    - Are optimized for YouTube SEO
    - Appeal to the target audience
    - Are in Dutch language
    - Focus on helping and inspiring people
    
    Return only the titles, one per line.
  `,
  
  SCRIPT_GENERATION: `
    Je bent een uitzonderlijk getalenteerde script schrijver, gespecialiseerd in het maken van YouTube Shorts die mensen diep raken. 
    
    Video titel: {title}
    Duur: 40 seconden
    
    Vereisten:
    - Krachtige hook in de eerste 3 seconden
    - Motiverende, inspirerende inhoud
    - Emotionele lading die het hart raakt
    - Aanzet tot actie of reflectie
    - Spreektaal, kort en bondig
    - Eindigen met subscribe oproep
    
    Structuur:
    [Hook - 3 seconden]
    [Body - 30 seconden]
    [Call-to-action - 7 seconden]
    
    Schrijf alleen de tekst, geen opmaak.
  `
};
```

### RevID API Integration

#### Configuration
```typescript
const REVID_CONFIG = {
  API_KEY: 'your-revid-api-key',
  BASE_URL: 'https://api.revid.ai',
  DEFAULT_SETTINGS: {
    voice_id: 'cjVigY5qzO86Huf0OWal',
    background_music_id: 'iky1ZYcS4AfCoof9TRhn',
    generation_preset: 'PIXAR',
    enhanced_generation: true,
    aspect_ratio: '9:16',
    duration: 40
  }
};
```

#### Script Formatting for RevID
```typescript
function formatScriptForRevID(script: string): string {
  // Add media hints and timing
  const sections = script.split('\n').filter(line => line.trim());
  
  let formatted = '';
  sections.forEach((section, index) => {
    if (index === 0) {
      formatted += `[Energetic opening scene]\n${section}\n<break time="1.0s" />\n\n`;
    } else if (index === sections.length - 1) {
      formatted += `[Subscribe button animation]\n${section}\n`;
    } else {
      formatted += `${section}\n<break time="0.5s" />\n\n`;
    }
  });
  
  return formatted;
}
```

## Performance Optimization

### Database Optimization

#### Indexing Strategy
```sql
-- Performance-critical indexes
CREATE INDEX CONCURRENTLY idx_youtube_videos_user_performance 
ON youtube_videos(user_id, performance_score DESC, published_at DESC);

CREATE INDEX CONCURRENTLY idx_generated_content_user_status 
ON generated_content(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_video_jobs_status_progress 
ON video_production_jobs(status, progress_percentage, created_at);
```

#### Query Optimization
```sql
-- Materialized view for user dashboard data
CREATE MATERIALIZED VIEW user_dashboard_data AS
SELECT 
  u.id as user_id,
  u.youtube_channel_title,
  COUNT(yv.id) as total_videos,
  AVG(yv.performance_score) as avg_performance,
  COUNT(CASE WHEN vpj.status = 'processing' THEN 1 END) as processing_jobs,
  COUNT(CASE WHEN us.status = 'scheduled' THEN 1 END) as scheduled_uploads
FROM users u
LEFT JOIN youtube_videos yv ON u.id = yv.user_id
LEFT JOIN video_production_jobs vpj ON u.id = vpj.user_id
LEFT JOIN upload_schedule us ON u.id = us.user_id
GROUP BY u.id, u.youtube_channel_title;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_dashboard_data()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_data;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Frontend Optimization

#### Code Splitting Strategy
```typescript
// Route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const VideoGeneration = lazy(() => import('./pages/VideoGeneration'));

// Component-based splitting for heavy components
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const AnalyticsChart = lazy(() => import('./components/AnalyticsChart'));
```

#### State Management Optimization
```typescript
// React Query configuration for optimal caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      }
    }
  }
});

// Custom hooks for data fetching
export function useTopVideos() {
  return useQuery({
    queryKey: ['videos', 'top'],
    queryFn: fetchTopVideos,
    staleTime: 30 * 60 * 1000 // 30 minutes for analytics data
  });
}
```

### API Performance

#### Caching Strategy
```typescript
// Edge Functions with caching
export async function fetchYouTubeAnalytics(channelId: string) {
  const cacheKey = `analytics:${channelId}:${new Date().toDateString()}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from YouTube API
  const data = await youtubeAPI.getAnalytics(channelId);
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  
  return data;
}
```

#### Background Job Processing
```typescript
// Queue system for video generation
interface VideoGenerationJob {
  id: string;
  user_id: string;
  script_id: string;
  settings: VideoSettings;
  priority: 'low' | 'normal' | 'high';
}

class VideoGenerationQueue {
  async addJob(job: VideoGenerationJob): Promise<void> {
    await this.queue.add('generate-video', job, {
      priority: job.priority === 'high' ? 10 : 5,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  
  async processJob(job: VideoGenerationJob): Promise<void> {
    // Update job status to processing
    await this.updateJobStatus(job.id, 'processing');
    
    try {
      // Generate video via RevID API
      const result = await this.revid.generateVideo(job);
      
      // Update job with result
      await this.updateJobStatus(job.id, 'completed', { video_url: result.url });
      
      // Trigger real-time update
      await this.notifyUser(job.user_id, 'video_completed', result);
      
    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', { error: error.message });
      await this.notifyUser(job.user_id, 'video_failed', { error: error.message });
    }
  }
}
```

## Security Specifications

### Authentication and Authorization

#### JWT Token Management
```typescript
interface TokenPayload {
  sub: string; // user_id
  email: string;
  youtube_channel_id?: string;
  role: 'user' | 'admin';
  exp: number;
  iat: number;
}

// Token refresh strategy
export async function refreshAccessToken(refresh_token: string): Promise<TokenResponse> {
  const payload = await jwt.verify(refresh_token, JWT_REFRESH_SECRET);
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  // Generate new access token
  const access_token = await jwt.sign(
    { 
      sub: payload.sub, 
      email: payload.email,
      type: 'access'
    },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  
  return { access_token, expires_in: 900 };
}
```

#### Row Level Security Policies
```sql
-- Users can only access their own data
CREATE POLICY "Users own data access" ON users
  FOR ALL USING (auth.uid() = id);

-- Videos can only be accessed by their owner
CREATE POLICY "User video access" ON youtube_videos
  FOR ALL USING (user_id = auth.uid());

-- Generated content access
CREATE POLICY "User content access" ON generated_content
  FOR ALL USING (user_id = auth.uid());

-- Video jobs access
CREATE POLICY "User jobs access" ON video_production_jobs
  FOR ALL USING (user_id = auth.uid());

-- Admin access to system logs
CREATE POLICY "Admin log access" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### API Security

#### Rate Limiting Implementation
```typescript
interface RateLimit {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

const API_RATE_LIMITS: Record<string, RateLimit> = {
  '/api/generate/*': {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many generation requests',
    standardHeaders: true,
    legacyHeaders: false
  },
  '/api/upload/*': {
    windowMs: 60 * 1000,
    max: 5, // 5 uploads per minute
    message: 'Too many upload requests',
    standardHeaders: true,
    legacyHeaders: false
  }
};
```

#### Input Validation
```typescript
// Zod schemas for request validation
export const GenerateTitlesSchema = z.object({
  source_video_ids: z.array(z.string().uuid()).min(1).max(10),
  count: z.number().int().min(1).max(10).optional().default(5),
  style: z.enum(['motivational', 'educational', 'entertainment']).optional(),
  language: z.enum(['en', 'nl']).optional().default('nl')
});

export const GenerateScriptSchema = z.object({
  title_id: z.string().uuid(),
  duration_seconds: z.number().int().min(15).max(180).optional().default(40),
  language: z.enum(['en', 'nl']).optional().default('nl'),
  style_preferences: z.object({
    hook_intensity: z.enum(['low', 'medium', 'high']).optional(),
    motivational_level: z.enum(['subtle', 'moderate', 'intense']).optional(),
    call_to_action: z.boolean().optional().default(true)
  }).optional()
});
```

#### Data Encryption
```typescript
// Sensitive data encryption
import { createCipher, createDecipher } from 'crypto';

export function encryptSensitiveData(data: string): string {
  const cipher = createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decryptSensitiveData(encryptedData: string): string {
  const decipher = createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// YouTube tokens encryption
export async function storeYouTubeTokens(
  userId: string, 
  accessToken: string, 
  refreshToken: string
): Promise<void> {
  const encryptedAccess = encryptSensitiveData(accessToken);
  const encryptedRefresh = encryptSensitiveData(refreshToken);
  
  await supabase
    .from('users')
    .update({
      youtube_access_token: encryptedAccess,
      youtube_refresh_token: encryptedRefresh
    })
    .eq('id', userId);
}
```

## Monitoring and Logging

### Application Monitoring
```typescript
// Custom monitoring middleware
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      user_id: req.user?.id,
      ip: req.ip,
      user_agent: req.get('User-Agent')
    };
    
    // Log to database
    logToDatabase('api_request', logData);
    
    // Send to monitoring service
    if (duration > 5000 || res.statusCode >= 400) {
      alertingService.send('performance_issue', logData);
    }
  });
  
  next();
}
```

### Error Tracking
```typescript
// Comprehensive error handling
export class ApplicationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  // Log error with context
  const errorLog = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user_id: req.user?.id,
    context: error instanceof ApplicationError ? error.context : {}
  };
  
  logToDatabase('error', errorLog);
  
  // Send user-friendly response
  if (error instanceof ApplicationError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}
```

**[ ] TASK**: Implement comprehensive monitoring and alerting system
**[ ] TASK**: Set up automated performance testing and benchmarking
**[ ] TASK**: Create detailed API documentation with interactive examples
**[ ] TASK**: Implement security audit logging and compliance reporting