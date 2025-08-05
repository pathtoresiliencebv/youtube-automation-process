# Content Catalyst Engine - Technical Architecture

## Architecture Overview

The Content Catalyst Engine follows a modern microservices architecture with clear separation of concerns:

### Core Architecture Pattern
- **Frontend**: Next.js 14+ with App Router
- **Backend**: Supabase Edge Functions + PostgreSQL
- **Authentication**: Supabase Auth with OAuth 2.0
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Deployment**: Vercel (Frontend) + Supabase (Backend)
- **External Integrations**: YouTube APIs, Gemini AI, RevID

### System Components

#### 1. Authentication Layer
- Supabase Auth with Google OAuth 2.0
- YouTube OAuth integration for channel access
- Role-based access control (RBAC)

#### 2. Data Layer
- PostgreSQL with optimized schemas
- Real-time subscriptions for dashboard updates
- Automated backups and scaling

#### 3. Business Logic Layer
- Edge Functions for API integrations
- Content analysis algorithms
- Video generation orchestration
- Upload scheduling system

#### 4. Integration Layer
- YouTube Data API v3 wrapper
- Gemini AI service integration
- RevID video generation client
- Webhook handlers for status updates

#### 5. Presentation Layer
- Responsive dashboard UI
- Real-time status indicators
- Content management interface
- Analytics visualization

### Security Architecture

#### API Security
- All external API keys stored in Supabase secrets
- Server-side only access to sensitive credentials
- Rate limiting on all external API calls
- Input validation and sanitization

#### Data Security
- PostgreSQL RLS policies
- Encrypted data at rest
- HTTPS/TLS for all communications
- OAuth 2.0 token refresh mechanisms

### Scalability Considerations

#### Performance Optimization
- Database indexing strategy
- Caching layer for frequently accessed data
- Asynchronous processing for video generation
- Background job queues

#### Monitoring & Observability
- Application performance monitoring
- Error tracking and alerting
- API usage analytics
- System health dashboards

### Technology Stack

#### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Query for state management

#### Backend
- Supabase (PostgreSQL + Edge Functions)
- TypeScript/JavaScript
- Zod for validation
- Node.js runtime

#### External Services
- YouTube Data API v3
- YouTube Analytics API
- YouTube Reporting API
- Google Gemini 2.5 Pro
- RevID Video Generation API

### Deployment Architecture

#### Production Environment
- Vercel for frontend hosting
- Supabase for backend services
- CDN for static assets
- Environment-specific configurations

#### Development Environment
- Local development with Supabase CLI
- Docker containers for consistency
- Hot reloading and live updates
- Comprehensive testing suite

## Decision Rationale

### Why Supabase?
- Real-time capabilities out of the box
- Built-in authentication and authorization
- PostgreSQL with advanced features
- Edge Functions for serverless compute
- Excellent Next.js integration

### Why Next.js?
- Full-stack capabilities
- Excellent SEO and performance
- Built-in API routes
- Strong TypeScript support
- Vercel deployment optimization

### Why PostgreSQL?
- ACID compliance for data integrity
- Advanced querying capabilities
- JSON support for flexible schemas
- Excellent scaling characteristics
- Strong ecosystem and tooling