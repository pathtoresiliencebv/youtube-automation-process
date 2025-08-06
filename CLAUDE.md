# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev          # Start Next.js development server
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Database Management
```bash
npm run seed:postgres    # Seed Neon PostgreSQL database
npm run seed:convex      # Seed Convex database 
npm run seed:all         # Seed both databases
node scripts/create-test-user.js  # Create test user account
```

### Convex Backend
```bash
npx convex dev      # Start Convex development server
npx convex deploy   # Deploy Convex functions to production
```

### Deployment
```bash
vercel --prod       # Deploy to Vercel production
vercel env add VARIABLE_NAME production  # Add environment variables
```

## Architecture Overview

### Dual Database System
The application uses a hybrid database architecture:

- **Neon PostgreSQL**: Primary user authentication and persistent data storage
  - User accounts with credentials stored in `preferences` JSON field  
  - YouTube channel connection data (channel_id, channel_title)
  - Simple authentication via custom API endpoints (`/api/auth/signin`, `/api/auth/signup`)
  
- **Convex**: Real-time features, AI workflows, and analytics
  - Video ideas with comprehensive status tracking (pending_approval → approved → script_generated → video_creating → published)
  - Real-time dashboard updates using Convex queries
  - System logging and performance analytics
  - RevID job tracking and webhook handling
  - Content analysis, optimizations, and calendar management

### Authentication Flow (Recently Updated)
1. **Primary Login**: Simple email/password authentication via `/api/auth/signin` using Neon PostgreSQL
   - Passwords stored in user `preferences` JSON field
   - Session stored in localStorage for client-side persistence
   - User object passed as props to all dashboard components
2. **Dashboard Access**: Dashboard loads immediately after login, without requiring YouTube connection
3. **YouTube OAuth**: Optional secondary authentication for YouTube API access via dashboard widget
   - Handled through YouTube Connect Widget on dashboard
   - Users can use the platform without YouTube connection
   - OAuth redirect: `/api/auth/callback` → `/auth/callback` → dashboard with connection status

### Content Generation Pipeline
The system follows a comprehensive automated workflow:

1. **Analysis**: YouTube Data API fetches top-performing videos from user's channel (last 30 days)
2. **AI Generation**: Google Gemini 2.5 Pro generates new video titles based on successful patterns
3. **Manual Approval**: User reviews and approves/rejects AI-generated ideas via dashboard
4. **Script Generation**: Auto-generate 2-minute scripts for approved video titles
5. **Video Creation**: RevID API creates PIXAR-style videos from generated scripts  
6. **SEO Optimization**: Generate optimized titles, descriptions, and tags using AI
7. **Upload & Schedule**: Automatic YouTube upload and scheduling system

### Key Components

#### Dashboard System (`src/components/dashboard/`)
- **dashboard.tsx**: Main container, gracefully handles missing Convex data, shows metrics as 0 when no data available
- **video-ideas-widget.tsx**: AI-generated ideas approval/rejection interface (requires YouTube connection)
- **production-pipeline-widget.tsx**: Real-time production status tracking 
- **analytics-widget.tsx**: Performance metrics and charts using Recharts
- **youtube-connect-widget.tsx**: **Primary connection interface** - handles optional YouTube OAuth from dashboard
- **ai-optimization-widget.tsx**: Content optimization and performance insights
- **content-calendar-widget.tsx**: Smart calendar with AI-driven scheduling
- **bulk-management-widget.tsx**: Batch operations for video management
- **notifications-widget.tsx**: Real-time notifications and settings

#### Authentication Components (`src/components/auth/`)
- **simple-auth-form.tsx**: Primary login form with email/password (no YouTube OAuth required)
- **auth-form.tsx**: Legacy OAuth-first form (deprecated in favor of simple-auth-form)

#### API Structure (`src/app/api/`)
- **auth/**: Custom authentication system using Neon PostgreSQL
  - `/signin`: Email/password authentication with localStorage session
  - `/signup`: User registration
  - `/me`: Session validation (fallback, primary auth is localStorage)
  - `/logout`: Session cleanup
  - `/oauth-complete`: Handles YouTube OAuth completion and user updates
- **youtube/**: YouTube Data API integration (analyze, upload, analytics)  
- **gemini/**: Google Gemini AI integration (ideas, scripts, SEO, content optimization)
- **webhooks/revid/**: RevID webhook handling for video creation status updates
- **convex/**: Proxy endpoints for Convex operations (generate-ideas, create-video, reject-idea)
- **admin/**: Admin panel endpoints (system health, logs export)
- **bulk/**: Batch operations API for managing multiple videos
- **notifications/**: Email notification system using Resend API

#### Convex Backend (`convex/`)
Key schema tables with proper indexing:
- **videoIdeas**: Complete video lifecycle tracking with 12 status states
- **youtubeAnalytics**: Performance data from YouTube API
- **systemLogs**: Application logging and monitoring
- **contentAnalysis**: AI-driven content insights and recommendations  
- **contentOptimizations**: AI optimization results and performance predictions
- **contentCalendars**: Smart scheduling with AI-based timing optimization
- **notifications**: Real-time notification system

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Convex Real-time Backend  
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.site

# YouTube API (Google Cloud Console)
YOUTUBE_CLIENT_ID=your-client-id
YOUTUBE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=your-client-id

# Google AI (Gemini 2.5 Pro)
GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key

# RevID Video Generation API
REVID_API_KEY=your-revid-key
NEXT_PUBLIC_REVID_API_KEY=your-revid-key

# Email Service (Resend)
RESEND_API_KEY=your-resend-key

# Application URL for OAuth callbacks
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## Important Implementation Details

### Authentication System (Two-Tier Architecture)
**Primary Authentication**: Simple email/password login via Neon PostgreSQL with passwords in user `preferences` JSON field.
- **Session Management**: localStorage-based with fallback to server-side cookie validation
- **Dashboard Access**: Immediate access after login, no external dependencies required
- **User Propagation**: User object passed as props to all dashboard widgets

**Secondary Authentication**: Optional YouTube OAuth for API access
- **Trigger**: User-initiated via YouTube Connect Widget on dashboard
- **Flow**: Google OAuth → `/api/auth/callback` → `/auth/callback` page → database update → dashboard refresh
- **Storage**: YouTube channel data saved to PostgreSQL user record (youtubeChannelId, youtubeChannelTitle)

### Database Usage Patterns
- **PostgreSQL**: User auth, YouTube channel connections, persistent user data
- **Convex**: Real-time features, video workflows, analytics, system logs, AI optimizations

### Video Status Lifecycle
Videos flow through 12 distinct statuses: pending_approval → approved → script_generated → video_creating → video_completed → uploading → generating_seo → scheduled → published (with error states: failed, pending_retry, unrecoverable).

### RevID Integration
Video creation handled via RevID API with webhook callbacks updating video status in real-time through `/api/webhooks/revid`.

### AI Content Optimization
Advanced AI features including content analysis, performance predictions, optimal timing recommendations, and smart calendar generation using Google Gemini 2.5 Pro.

### Development Workflow
1. **Quick Start**: Use test account for immediate access to dashboard
2. **YouTube Setup**: Optional - configure YouTube OAuth for full functionality
3. **Convex Setup**: Optional - for real-time features and data persistence

### Test User Account
Development credentials (pre-configured):
- Email: `pathtoresiliencebv@gmail.com`
- Password: `6fz9itxv1`
- Name: `Path to Resilience`
- Created via: `node scripts/create-test-user.js`

### Current Authentication State
The system now uses a **separated authentication approach**:
- **Step 1**: Login with email/password → Access dashboard immediately
- **Step 2**: (Optional) Connect YouTube via dashboard widget → Enable video features
- **Benefit**: Users can explore the dashboard and interface without external API setup