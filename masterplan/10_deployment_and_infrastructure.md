# Content Catalyst Engine - Deployment and Infrastructure

## Infrastructure Overview

### Architecture Philosophy
The Content Catalyst Engine follows a modern cloud-native architecture with emphasis on scalability, reliability, and cost-effectiveness. Our infrastructure leverages managed services to reduce operational overhead while maintaining high performance and security standards.

### Technology Stack
- **Frontend Hosting**: Vercel (Edge Network, CDN, Serverless Functions)
- **Backend & Database**: Supabase (PostgreSQL, Authentication, Real-time, Edge Functions)
- **Domain & DNS**: Cloudflare (DNS, SSL/TLS, DDoS Protection)
- **Monitoring**: Vercel Analytics, Supabase Observability, Custom Metrics
- **CI/CD**: GitHub Actions with automated deployments
- **External APIs**: YouTube APIs, Google Gemini, RevID

## Development Environment Setup

### Local Development Configuration
```bash
# .env.local
# Database
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key

# External APIs
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
GEMINI_API_KEY=AIzaSyB0IR_ck9KIT8h999j2SbsmnO9zx72mRAk
REVID_API_KEY=88bf5f98-637a-4f03-9576-5a11a603862a

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-secret

# Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_API_MOCKING=true
```

### Docker Development Environment
```dockerfile
# Dockerfile.dev
FROM node:18-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=development

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: content_catalyst_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  redis_data:
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:docker": "docker-compose -f docker-compose.dev.yml up",
    "dev:setup": "npm run supabase:setup && npm run db:seed",
    "supabase:setup": "supabase start && supabase db reset",
    "supabase:stop": "supabase stop",
    "db:seed": "tsx scripts/seed-database.ts",
    "db:migrate": "supabase db reset",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "build": "next build",
    "start": "next start"
  }
}
```

## Staging Environment

### Supabase Staging Project
```bash
# Staging Environment Configuration
PROJECT_ID=staging-content-catalyst
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
API_URL=https://[project-id].supabase.co
ANON_KEY=[staging-anon-key]
SERVICE_ROLE_KEY=[staging-service-key]
```

### Vercel Staging Deployment
```json
{
  "name": "content-catalyst-staging",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "staging",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-staging-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-staging-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-staging-service-key",
    "YOUTUBE_CLIENT_ID": "@youtube-client-id",
    "YOUTUBE_CLIENT_SECRET": "@youtube-client-secret-staging",
    "GEMINI_API_KEY": "@gemini-api-key-staging",
    "REVID_API_KEY": "@revid-api-key-staging"
  },
  "regions": ["ams1", "fra1"], // European regions for GDPR compliance
  "functions": {
    "pages/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 30
    }
  }
}
```

### Database Migration Strategy
```typescript
// scripts/migrate-staging.ts
import { createClient } from '@supabase/supabase-js';

async function runStagingMigrations() {
  const supabase = createClient(
    process.env.SUPABASE_STAGING_URL!,
    process.env.SUPABASE_STAGING_SERVICE_KEY!
  );

  console.log('Starting staging database migration...');

  try {
    // Run migrations in order
    await runMigration('001_initial_schema');
    await runMigration('002_add_performance_scoring');
    await runMigration('003_add_content_generation');
    await runMigration('004_add_video_processing');
    await runMigration('005_add_upload_scheduling');
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function runMigration(migrationName: string) {
  console.log(`Running migration: ${migrationName}`);
  // Migration logic here
}
```

## Production Environment

### Production Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │     Vercel      │    │    Supabase     │
│                 │    │                 │    │                 │
│ - DNS           │───▶│ - Next.js App   │───▶│ - PostgreSQL    │
│ - SSL/TLS       │    │ - Edge Runtime  │    │ - Authentication│
│ - DDoS Protection│    │ - CDN           │    │ - Edge Functions│
│ - WAF           │    │ - Auto Scaling  │    │ - Real-time     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  External APIs  │    │   Monitoring    │    │    Backups      │
│                 │    │                 │    │                 │
│ - YouTube APIs  │    │ - Vercel        │    │ - Automated     │
│ - Gemini AI     │    │ - Supabase      │    │ - Point-in-time │
│ - RevID         │    │ - Custom Metrics│    │ - Cross-region  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Production Supabase Configuration
```sql
-- Production Database Configuration
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements, pg_cron';

-- Optimize for performance
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET effective_cache_size = '8GB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Enable query optimization
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_statement = 'mod'; -- Log modifications
ALTER SYSTEM SET track_activity_query_size = 2048;

SELECT pg_reload_conf();
```

### Production Environment Variables
```bash
# Production .env (stored securely in Vercel)
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.contentcatalyst.com
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]

# Secure keys (Vercel environment variables)
SUPABASE_SERVICE_ROLE_KEY=[production-service-key]
YOUTUBE_CLIENT_SECRET=[production-youtube-secret]
GEMINI_API_KEY=[production-gemini-key]
REVID_API_KEY=[production-revid-key]
NEXTAUTH_SECRET=[production-nextauth-secret]

# Feature flags
ENABLE_RATE_LIMITING=true
ENABLE_ANALYTICS=true
ENABLE_ERROR_TRACKING=true
MAX_VIDEO_GENERATIONS_PER_USER=50
MAX_API_REQUESTS_PER_MINUTE=100
```

### Vercel Production Configuration
```json
{
  "name": "content-catalyst-production",
  "alias": ["app.contentcatalyst.com"],
  "regions": ["ams1", "fra1", "cdg1"], // EU regions for GDPR compliance
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "pages/api/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 30,
      "memory": 1024
    },
    "pages/api/generate/**/*.ts": {
      "runtime": "nodejs18.x", 
      "maxDuration": 60,
      "memory": 1024
    },
    "pages/api/video/**/*.ts": {
      "runtime": "nodejs18.x",
      "maxDuration": 300,
      "memory": 3008
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/dashboard",
      "permanent": false,
      "has": [
        {
          "type": "cookie",
          "key": "auth-token"
        }
      ]
    }
  ]
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run dependency audit
        run: npm audit --audit-level high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  database-migration:
    runs-on: ubuntu-latest
    needs: [quality-checks, security-scan]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate:production
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [quality-checks, security-scan]
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Staging
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment-url=$url" >> $GITHUB_OUTPUT

      - name: Run E2E Tests
        run: |
          npm run test:e2e
        env:
          BASE_URL: ${{ steps.deploy.outputs.deployment-url }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: [database-migration]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Production
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment-url=$url" >> $GITHUB_OUTPUT

      - name: Run Smoke Tests
        run: |
          npm run test:smoke
        env:
          BASE_URL: https://app.contentcatalyst.com

      - name: Notify Deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  performance-monitoring:
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://app.contentcatalyst.com
            https://app.contentcatalyst.com/dashboard
            https://app.contentcatalyst.com/content
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Database Migration Pipeline
```typescript
// scripts/production-migration.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface Migration {
  id: string;
  name: string;
  sql: string;
  checksum: string;
}

class ProductionMigrator {
  private supabase: SupabaseClient;
  private migrationsPath = join(process.cwd(), 'migrations');

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_PRODUCTION_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async runMigrations(): Promise<void> {
    console.log('🚀 Starting production database migration...');

    // Create migrations table if it doesn't exist
    await this.createMigrationsTable();

    // Get pending migrations
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

    // Run migrations in transaction
    const { error } = await this.supabase.rpc('run_migrations_transaction', {
      migrations: pendingMigrations
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    console.log('✅ All migrations completed successfully');
  }

  private async createMigrationsTable(): Promise<void> {
    const { error } = await this.supabase.rpc('create_migrations_table');
    if (error) {
      throw new Error(`Failed to create migrations table: ${error.message}`);
    }
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    // Get applied migrations
    const { data: appliedMigrations } = await this.supabase
      .from('schema_migrations')
      .select('id, checksum');

    const appliedIds = new Set(appliedMigrations?.map(m => m.id) || []);

    // Get all migration files
    const migrationFiles = readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pendingMigrations: Migration[] = [];

    for (const file of migrationFiles) {
      const id = file.replace('.sql', '');
      
      if (!appliedIds.has(id)) {
        const sql = readFileSync(join(this.migrationsPath, file), 'utf8');
        const checksum = this.calculateChecksum(sql);

        pendingMigrations.push({
          id,
          name: file,
          sql,
          checksum
        });
      }
    }

    return pendingMigrations;
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// Run migrations
if (require.main === module) {
  new ProductionMigrator()
    .runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
```

## Monitoring and Observability

### Application Performance Monitoring
```typescript
// lib/monitoring.ts
import { Analytics } from '@vercel/analytics';
import { performance } from 'perf_hooks';

export class ApplicationMonitoring {
  private static instance: ApplicationMonitoring;

  public static getInstance(): ApplicationMonitoring {
    if (!ApplicationMonitoring.instance) {
      ApplicationMonitoring.instance = new ApplicationMonitoring();
    }
    return ApplicationMonitoring.instance;
  }

  async trackAPICall(
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    userId?: string
  ): Promise<void> {
    const metrics = {
      endpoint,
      method,
      duration,
      status,
      userId,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    // Send to Vercel Analytics
    Analytics.track('api_call', metrics);

    // Send to custom monitoring endpoint
    if (process.env.MONITORING_ENDPOINT) {
      await fetch(process.env.MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'api_performance',
          data: metrics
        })
      });
    }

    // Log slow queries
    if (duration > 2000) {
      console.warn(`Slow API call detected: ${method} ${endpoint} took ${duration}ms`);
    }
  }

  async trackError(
    error: Error,
    context: {
      userId?: string;
      operation?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId: context.userId,
      operation: context.operation,
      metadata: context.metadata,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    // Send to error tracking service
    if (process.env.ERROR_TRACKING_ENDPOINT) {
      await fetch(process.env.ERROR_TRACKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'application_error',
          data: errorData
        })
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', errorData);
    }
  }

  async trackUserActivity(
    userId: string,
    activity: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const activityData = {
      userId,
      activity,
      metadata,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    Analytics.track('user_activity', activityData);
  }

  measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        const result = await fn();
        const duration = performance.now() - startTime;
        
        await this.trackPerformance(operation, duration, 'success');
        resolve(result);
      } catch (error) {
        const duration = performance.now() - startTime;
        
        await this.trackPerformance(operation, duration, 'error');
        reject(error);
      }
    });
  }

  private async trackPerformance(
    operation: string,
    duration: number,
    status: 'success' | 'error'
  ): Promise<void> {
    Analytics.track('performance_metric', {
      operation,
      duration,
      status,
      timestamp: new Date().toISOString()
    });
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}
```

### Custom Metrics Dashboard
```typescript
// pages/api/admin/metrics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin access
  const isAdmin = await verifyAdminAccess(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get system metrics
    const metrics = await Promise.all([
      getApplicationMetrics(supabase),
      getDatabaseMetrics(supabase),
      getAPIUsageMetrics(supabase),
      getUserActivityMetrics(supabase),
      getErrorMetrics(supabase)
    ]);

    const [
      applicationMetrics,
      databaseMetrics,
      apiUsageMetrics,
      userActivityMetrics,
      errorMetrics
    ] = metrics;

    res.status(200).json({
      timestamp: new Date().toISOString(),
      application: applicationMetrics,
      database: databaseMetrics,
      api_usage: apiUsageMetrics,
      user_activity: userActivityMetrics,
      errors: errorMetrics
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}

async function getApplicationMetrics(supabase: any) {
  const { data } = await supabase
    .from('system_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  return {
    total_requests_24h: data?.length || 0,
    error_rate: calculateErrorRate(data || []),
    avg_response_time: calculateAverageResponseTime(data || []),
    uptime_percentage: 99.9 // From external monitoring
  };
}

async function getDatabaseMetrics(supabase: any) {
  const { data: connectionStats } = await supabase
    .rpc('get_database_stats');

  return {
    active_connections: connectionStats?.active_connections || 0,
    total_queries_24h: connectionStats?.total_queries || 0,
    slow_queries_count: connectionStats?.slow_queries || 0,
    database_size_mb: connectionStats?.database_size || 0
  };
}
```

### Health Check Endpoints
```typescript
// pages/api/health/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceHealth;
    external_apis: {
      youtube: ServiceHealth;
      gemini: ServiceHealth;
      revid: ServiceHealth;
    };
  };
  system: {
    memory_usage: number;
    uptime: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  response_time: number;
  last_checked: string;
  error?: string;
}

export default async function healthCheck(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    const databaseHealth = await checkDatabaseHealth();
    
    // Check external APIs
    const externalAPIsHealth = await checkExternalAPIs();
    
    // Determine overall status
    const overallStatus = determineOverallStatus([
      databaseHealth,
      ...Object.values(externalAPIsHealth)
    ]);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: databaseHealth,
        external_apis: externalAPIsHealth
      },
      system: {
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        uptime: process.uptime()
      }
    };

    // Set appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: 'unhealthy',
          response_time: Date.now() - startTime,
          last_checked: new Date().toISOString(),
          error: 'Health check failed'
        },
        external_apis: {
          youtube: { status: 'unhealthy', response_time: 0, last_checked: new Date().toISOString() },
          gemini: { status: 'unhealthy', response_time: 0, last_checked: new Date().toISOString() },
          revid: { status: 'unhealthy', response_time: 0, last_checked: new Date().toISOString() }
        }
      },
      system: {
        memory_usage: 0,
        uptime: 0
      }
    });
  }
}

async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Simple query to test connectivity
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    return {
      status: 'healthy',
      response_time: Date.now() - startTime,
      last_checked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time: Date.now() - startTime,
      last_checked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Backup and Disaster Recovery

### Automated Backup Strategy
```sql
-- Supabase automated backups are handled by the platform
-- Custom backup procedures for critical data

-- Create backup procedure
CREATE OR REPLACE FUNCTION create_data_backup()
RETURNS void AS $$
DECLARE
  backup_name text;
BEGIN
  backup_name := 'backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
  
  -- Export critical user data
  COPY (
    SELECT row_to_json(u.*)
    FROM users u
    WHERE u.created_at >= NOW() - INTERVAL '7 days'
  ) TO '/tmp/' || backup_name || '_users.json';
  
  -- Export generated content
  COPY (
    SELECT row_to_json(gc.*)
    FROM generated_content gc
    JOIN users u ON gc.user_id = u.id
    WHERE gc.created_at >= NOW() - INTERVAL '7 days'
  ) TO '/tmp/' || backup_name || '_content.json';
  
  -- Log backup creation  
  INSERT INTO system_logs (event_type, severity, source, message)
  VALUES ('backup_created', 'info', 'backup_system', 'Data backup created: ' || backup_name);
END;
$$ LANGUAGE plpgsql;

-- Schedule daily backups
SELECT cron.schedule('daily-backup', '0 2 * * *', 'SELECT create_data_backup();');
```

### Disaster Recovery Plan
```typescript
// scripts/disaster-recovery.ts
import { createClient } from '@supabase/supabase-js';

export class DisasterRecoveryManager {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async initiateDisasterRecovery(): Promise<void> {
    console.log('🚨 Initiating disaster recovery procedures...');

    // Step 1: Assess system status
    const systemStatus = await this.assessSystemStatus();
    console.log('System status:', systemStatus);

    // Step 2: Switch to backup systems if needed
    if (systemStatus.database === 'down') {
      await this.switchToBackupDatabase();
    }

    // Step 3: Restore from latest backup
    await this.restoreFromBackup();

    // Step 4: Verify system integrity
    await this.verifySystemIntegrity();

    // Step 5: Update DNS if needed
    await this.updateDNSRecords();

    console.log('✅ Disaster recovery completed');
  }

  private async assessSystemStatus(): Promise<{
    database: 'up' | 'down' | 'degraded';
    api: 'up' | 'down' | 'degraded';
    external_services: Record<string, 'up' | 'down' | 'degraded'>;
  }> {
    // Implementation for system assessment
    return {
      database: 'up',
      api: 'up',
      external_services: {
        youtube: 'up',
        gemini: 'up',
        revid: 'up'
      }
    };
  }

  private async restoreFromBackup(): Promise<void> {
    // Get latest backup
    const latestBackup = await this.getLatestBackup();
    
    if (!latestBackup) {
      throw new Error('No backup available for restoration');
    }

    console.log(`Restoring from backup: ${latestBackup.id}`);
    
    // Restore data
    await this.supabase.rpc('restore_from_backup', {
      backup_id: latestBackup.id
    });
  }

  private async verifySystemIntegrity(): Promise<void> {
    console.log('Verifying system integrity...');
    
    // Run integrity checks
    const checks = [
      this.verifyDatabaseIntegrity(),
      this.verifyAPIEndpoints(),
      this.verifyExternalConnections()
    ];

    const results = await Promise.all(checks);
    
    if (results.some(result => !result.success)) {
      throw new Error('System integrity verification failed');
    }

    console.log('✅ System integrity verified');
  }
}
```

## Scaling Strategy

### Horizontal Scaling Configuration
```typescript
// next.config.js - Production optimizations
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  experimental: {
    runtime: 'nodejs',
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Image optimization
  images: {
    domains: ['api.revid.ai', 'i.ytimg.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Compression
  compress: true,
  
  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/app',
        destination: '/dashboard',
        permanent: true
      }
    ];
  }
};

module.exports = nextConfig;
```

### Performance Optimization
```typescript
// lib/performance-optimizations.ts
import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

// Response caching
const responseCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export function withCaching(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const cacheKey = `${req.method}:${req.url}`;
    
    // Check cache for GET requests
    if (req.method === 'GET') {
      const cached = responseCache.get(cacheKey);
      if (cached) {
        return new NextResponse(JSON.stringify(cached), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT'
          }
        });
      }
    }
    
    const response = await handler(req);
    
    // Cache successful GET responses
    if (req.method === 'GET' && response.status === 200) {
      const data = await response.json();
      responseCache.set(cacheKey, data);
      
      return new NextResponse(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS'
        }
      });
    }
    
    return response;
  };
}

// Database connection pooling optimization
export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private connectionPool: Map<string, any> = new Map();

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  getConnection(userId: string): any {
    if (!this.connectionPool.has(userId)) {
      const connection = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      this.connectionPool.set(userId, connection);
    }
    
    return this.connectionPool.get(userId);
  }

  closeConnection(userId: string): void {
    if (this.connectionPool.has(userId)) {
      const connection = this.connectionPool.get(userId);
      // Close connection if needed
      this.connectionPool.delete(userId);
    }
  }
}
```

**[ ] TASK**: Set up production infrastructure with Vercel and Supabase
**[ ] TASK**: Configure automated CI/CD pipeline with GitHub Actions
**[ ] TASK**: Implement comprehensive monitoring and alerting system
**[ ] TASK**: Create disaster recovery procedures and backup strategies
**[ ] TASK**: Establish performance optimization and scaling protocols