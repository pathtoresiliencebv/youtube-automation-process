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
npm run seed:convex     # Seed Convex database 
npm run seed:all        # Seed both databases
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

- **Neon PostgreSQL**: Primary user authentication and data storage
  - User accounts with credentials stored in `preferences` JSON field
  - YouTube channel connection data
  - Production-ready with proper schemas
  
- **Convex**: Real-time features and AI-generated content
  - Video ideas and content generation workflows
  - Real-time dashboard updates
  - System logging and analytics
  - RevID job tracking

### Authentication Flow
1. **User Registration/Login**: Custom API endpoints (`/api/auth/signup`, `/api/auth/signin`) using Neon PostgreSQL
2. **Session Management**: localStorage-based session persistence 
3. **YouTube OAuth**: Separate OAuth flow for YouTube API access via Google Cloud Console
4. **Dashboard Access**: User prop passed down to all dashboard widgets instead of Convex queries

### Content Generation Pipeline
The system follows a 7-stage automated workflow:

1. **Analysis**: Fetch top-performing YouTube videos from user's channel (last 30 days)
2. **AI Generation**: Gemini 2.5 Pro generates new video titles based on successful patterns
3. **Manual Approval**: User reviews and approves AI-generated ideas via dashboard
4. **Script Generation**: Auto-generate 2-minute scripts for approved titles
5. **Video Creation**: RevID API creates PIXAR-style videos from scripts
6. **SEO Optimization**: Generate optimized titles, descriptions, and tags
7. **Upload & Schedule**: Automatic YouTube upload and scheduling (daily at 00:00)

### Key Components Architecture

#### Dashboard System (`src/components/dashboard/`)
- **dashboard.tsx**: Main dashboard container, passes user prop to all widgets
- **video-ideas-widget.tsx**: Displays AI-generated ideas for approval/rejection
- **production-pipeline-widget.tsx**: Real-time production status tracking
- **publication-calendar-widget.tsx**: Scheduled content calendar view
- **analytics-widget.tsx**: Performance metrics and charts
- **youtube-connect-widget.tsx**: YouTube OAuth connection management

#### API Structure (`src/app/api/`)
- **auth/**: Custom authentication endpoints (signup/signin)
- **youtube/**: YouTube Data API integration (analyze, upload)
- **gemini/**: Google Gemini AI integration (ideas, scripts, SEO)
- **webhooks/revid**: RevID webhook handling for video creation status
- **seed**: Database seeding endpoint for Convex

#### Convex Backend (`convex/`)
- **schema.ts**: Database schema definitions with proper indexing
- **users.ts**: User management functions (note: getCurrentUser not used in production)
- **content.ts**: Video ideas and content generation workflows
- **youtube.ts**: YouTube analytics and data processing
- **revid.ts**: RevID API integration and job management
- **systemLogs.ts**: Application logging and monitoring

### Environment Configuration

Required environment variables across development and production:

```env
# Convex Real-time Backend
CONVEX_DEPLOYMENT=your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.site

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

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

# Application URL for OAuth callbacks
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## Important Implementation Notes

### Authentication System Migration
The codebase was migrated from Stack Auth to custom Neon database authentication due to build compatibility issues. All dashboard widgets now receive user data as props instead of using Convex `getCurrentUser` queries.

### YouTube OAuth Setup
Google Cloud Console OAuth setup requires:
1. Authorized JavaScript origins: `https://your-domain.vercel.app`
2. Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback`
3. Enable YouTube Data API v3 and YouTube Analytics API

### Convex vs PostgreSQL Usage
- Use **Convex** for: Real-time features, AI content workflows, system logs
- Use **PostgreSQL** for: User authentication, persistent user data, YouTube channel connections

### Error Handling
All components include ErrorBoundary wrappers. The dashboard widgets gracefully handle missing Convex data and display loading states appropriately.

### Test User Account
Default test credentials for development:
- Email: `pathtoresiliencebv@gmail.com`
- Password: `6fz9itxv1`
- Name: `Path to Resilience`

This account is automatically created via `scripts/create-test-user.js` during setup.