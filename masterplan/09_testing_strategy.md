# Content Catalyst Engine - Testing Strategy

## Testing Philosophy and Approach

### Testing Philosophy
Our testing strategy is built on the principle of "Shift-Left Testing" - identifying and addressing issues as early as possible in the development lifecycle. We employ a comprehensive multi-layered testing approach that ensures reliability, performance, and user satisfaction.

### Testing Pyramid
```
                    ┌─────────────────┐
                    │   E2E Tests     │ ← 5-10%
                    │  (UI/Integration)│
                  ┌─┴─────────────────┴─┐
                  │  Integration Tests  │ ← 15-25%
                  │   (API/Services)    │
                ┌─┴─────────────────────┴─┐
                │     Unit Tests          │ ← 70-80%
                │  (Functions/Components) │
                └─────────────────────────┘
```

### Testing Objectives
1. **Functional Correctness**: Ensure all features work as specified
2. **Integration Reliability**: Verify seamless operation with external APIs
3. **Performance Standards**: Meet response time and throughput requirements
4. **Security Compliance**: Validate security controls and data protection
5. **User Experience**: Ensure intuitive and error-free user interactions
6. **Scalability**: Confirm system handles expected load and growth

## Unit Testing Strategy

### Frontend Unit Testing (React/Next.js)

#### Testing Framework Setup
```typescript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Component Testing Examples
```typescript
// src/components/VideoCard/VideoCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCard } from './VideoCard';
import { mockVideo } from '@/test/mocks/video';

describe('VideoCard', () => {
  const defaultProps = {
    video: mockVideo,
    onEdit: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders video information correctly', () => {
    render(<VideoCard {...defaultProps} />);
    
    expect(screen.getByText(mockVideo.title)).toBeInTheDocument();
    expect(screen.getByText(`${mockVideo.view_count} views`)).toBeInTheDocument();
    expect(screen.getByText(`Score: ${mockVideo.performance_score}`)).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<VideoCard {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockVideo.id);
  });

  it('shows confirmation dialog when delete is clicked', async () => {
    render(<VideoCard {...defaultProps} />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('applies correct styling for different performance scores', () => {
    const highPerformanceVideo = { ...mockVideo, performance_score: 85 };
    render(<VideoCard {...defaultProps} video={highPerformanceVideo} />);
    
    const scoreElement = screen.getByTestId('performance-score');
    expect(scoreElement).toHaveClass('text-green-600');
  });
});

// Custom Hook Testing
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('useVideoAnalytics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('fetches video analytics data', async () => {
    const { result } = renderHook(
      () => useVideoAnalytics('user-123'),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.totalViews).toBeGreaterThan(0);
  });
});
```

### Backend Unit Testing (Edge Functions)

#### Supabase Edge Functions Testing
```typescript
// supabase/functions/generate-content/test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.192.0/testing/asserts.ts';
import { generateContent } from './index.ts';

Deno.test('generateContent - title generation', async () => {
  const mockRequest = new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'title',
      context: {
        topVideos: [
          { title: 'Test Video 1', performance_score: 85 },
          { title: 'Test Video 2', performance_score: 78 }
        ],
        style: 'motivational',
        language: 'nl'
      }
    })
  });

  const response = await generateContent(mockRequest);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertExists(data.titles);
  assertEquals(data.titles.length, 5); // Default count
});

// Database Function Testing
import { createClient } from '@supabase/supabase-js';

describe('Database Functions', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  });

  it('calculates video performance score correctly', async () => {
    // Insert test video
    const { data: video } = await supabase
      .from('youtube_videos')
      .insert({
        youtube_video_id: 'test-video-123',
        title: 'Test Video',
        view_count: 1000,
        like_count: 50,
        comment_count: 10,
        duration_seconds: 60
      })
      .select()
      .single();

    // Call performance calculation function
    const { data: score } = await supabase
      .rpc('calculate_video_performance_score', {
        p_video_id: video.id
      });

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### API Endpoint Testing
```typescript
// src/test/api/generate.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/generate/titles';
import { mockUser, mockTopVideos } from '@/test/mocks';

describe('/api/generate/titles', () => {
  it('generates video titles successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token'
      },
      body: {
        source_video_ids: ['video-1', 'video-2'],
        style: 'motivational',
        language: 'nl',
        count: 3
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.titles).toHaveLength(3);
    expect(data.titles[0]).toHaveProperty('text');
    expect(data.titles[0]).toHaveProperty('confidence');
  });

  it('validates request parameters', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // Missing required fields
        style: 'invalid-style'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data.error).toBeDefined();
  });

  it('handles rate limiting', async () => {
    // Simulate multiple requests exceeding rate limit
    const requests = Array.from({ length: 12 }, () => 
      createMocks({
        method: 'POST',
        headers: { 'Authorization': 'Bearer valid-token' },
        body: { source_video_ids: ['video-1'], count: 1 }
      })
    );

    const responses = await Promise.all(
      requests.map(({ req, res }) => handler(req, res))
    );

    const rateLimitedResponses = responses.filter(
      (_, index) => requests[index][1]._getStatusCode() === 429
    );

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## Integration Testing Strategy

### External API Integration Testing

#### YouTube API Integration Tests
```typescript
// src/test/integration/youtube.test.ts
import { YouTubeDataService } from '@/services/youtube';
import { mockYouTubeResponses } from '@/test/mocks/youtube';

describe('YouTube API Integration', () => {
  let youtubeService: YouTubeDataService;

  beforeAll(() => {
    youtubeService = new YouTubeDataService();
  });

  describe('getChannelVideos', () => {
    it('fetches and processes video data correctly', async () => {
      // Mock YouTube API responses
      nock('https://www.googleapis.com')
        .get('/youtube/v3/channels')
        .query(true)
        .reply(200, mockYouTubeResponses.channelData);

      nock('https://www.googleapis.com')
        .get('/youtube/v3/playlistItems')
        .query(true)
        .reply(200, mockYouTubeResponses.playlistItems);

      nock('https://www.googleapis.com')
        .get('/youtube/v3/videos')
        .query(true)
        .reply(200, mockYouTubeResponses.videoDetails);

      const videos = await youtubeService.getChannelVideos('test-user-id');

      expect(videos).toHaveLength(mockYouTubeResponses.videoDetails.items.length);
      expect(videos[0]).toHaveProperty('id');
      expect(videos[0]).toHaveProperty('snippet');
      expect(videos[0]).toHaveProperty('statistics');
    });

    it('handles API errors gracefully', async () => {
      nock('https://www.googleapis.com')
        .get('/youtube/v3/channels')
        .query(true)
        .reply(403, { error: { message: 'Quota exceeded' } });

      await expect(
        youtubeService.getChannelVideos('test-user-id')
      ).rejects.toThrow('Quota exceeded');
    });

    it('respects rate limiting', async () => {
      const startTime = Date.now();
      
      // Make multiple rapid requests
      const promises = Array.from({ length: 5 }, () =>
        youtubeService.getChannelVideos('test-user-id')
      );

      await Promise.allSettled(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have some delay due to rate limiting
      expect(duration).toBeGreaterThan(1000);
    });
  });

  describe('uploadVideo', () => {
    it('uploads video successfully', async () => {
      const mockVideoFile = new Blob(['mock video data'], { type: 'video/mp4' });
      
      nock('https://www.googleapis.com')
        .post('/upload/youtube/v3/videos')
        .query(true)
        .reply(200, '', { 'Location': 'https://upload.googleapis.com/upload/youtube/v3/videos?uploadId=test' });

      nock('https://upload.googleapis.com')
        .put('/upload/youtube/v3/videos')
        .query(true)
        .reply(200, {
          id: 'test-video-id',
          status: { uploadStatus: 'uploaded' }
        });

      const result = await youtubeService.uploadVideo('test-user-id', {
        title: 'Test Video',
        description: 'Test Description',
        tags: ['test'],
        categoryId: 22,
        privacyStatus: 'unlisted',
        videoFile: mockVideoFile
      });

      expect(result.videoId).toBe('test-video-id');
      expect(result.status).toBe('uploaded');
    });
  });
});
```

#### AI Service Integration Tests
```typescript
// src/test/integration/gemini.test.ts
import { GeminiAIService } from '@/services/gemini';

describe('Gemini AI Integration', () => {
  let geminiService: GeminiAIService;

  beforeAll(() => {
    geminiService = new GeminiAIService();
  });

  it('generates content successfully', async () => {
    const prompt = 'Generate a motivational YouTube title about overcoming challenges';
    
    const result = await geminiService.generateContent(prompt, {
      temperature: 0.8,
      maxOutputTokens: 100
    });

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBeGreaterThan(0);
    expect(result.finishReason).toBe('STOP');
  });

  it('handles content safety filtering', async () => {
    const unsafePrompt = 'Generate harmful content about violence';
    
    await expect(
      geminiService.generateContent(unsafePrompt)
    ).rejects.toThrow('Content blocked');
  });

  it('respects token limits', async () => {
    const longPrompt = 'A'.repeat(10000); // Very long prompt
    
    const result = await geminiService.generateContent(longPrompt, {
      maxOutputTokens: 50
    });

    expect(result.usage.completionTokens).toBeLessThanOrEqual(50);
  });
});
```

### Database Integration Testing
```typescript
// src/test/integration/database.test.ts
import { createClient } from '@supabase/supabase-js';
import { testDbSetup, testDbTeardown } from '@/test/helpers/database';

describe('Database Integration', () => {
  let supabase: SupabaseClient;

  beforeAll(async () => {
    supabase = await testDbSetup();
  });

  afterAll(async () => {
    await testDbTeardown();
  });

  describe('User Management', () => {
    it('creates user with proper defaults', async () => {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          email: 'test@example.com',
          full_name: 'Test User'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(user.subscription_tier).toBe('free');
      expect(user.monthly_video_quota).toBe(3);
      expect(user.preferences).toBeDefined();
    });

    it('enforces email uniqueness', async () => {
      const email = 'duplicate@example.com';
      
      // First insert should succeed
      const { error: firstError } = await supabase
        .from('users')
        .insert({ email, full_name: 'User 1' });
      
      expect(firstError).toBeNull();
      
      // Second insert should fail
      const { error: secondError } = await supabase
        .from('users')
        .insert({ email, full_name: 'User 2' });
      
      expect(secondError).toBeDefined();
      expect(secondError.code).toBe('23505'); // Unique violation
    });
  });

  describe('Video Analytics', () => {
    let userId: string;

    beforeEach(async () => {
      const { data: user } = await supabase
        .from('users')
        .insert({ email: 'analytics-test@example.com' })
        .select('id')
        .single();
      userId = user.id;
    });

    it('calculates performance scores correctly', async () => {
      // Insert test videos
      const videos = [
        { title: 'High Performance', view_count: 10000, like_count: 500, comment_count: 100 },
        { title: 'Low Performance', view_count: 100, like_count: 5, comment_count: 1 }
      ];

      const { data: insertedVideos } = await supabase
        .from('youtube_videos')
        .insert(
          videos.map(v => ({
            ...v,
            user_id: userId,
            youtube_video_id: `test-${Math.random()}`
          }))
        )
        .select();

      // Calculate performance scores
      for (const video of insertedVideos) {
        await supabase.rpc('calculate_video_performance_score', {
          p_video_id: video.id
        });
      }

      const { data: updatedVideos } = await supabase
        .from('youtube_videos')
        .select('title, performance_score')
        .eq('user_id', userId)
        .order('performance_score', { ascending: false });

      expect(updatedVideos[0].title).toBe('High Performance');
      expect(updatedVideos[0].performance_score).toBeGreaterThan(
        updatedVideos[1].performance_score
      );
    });
  });

  describe('Row Level Security', () => {
    it('prevents users from accessing other users data', async () => {
      // Create two users
      const { data: user1 } = await supabase
        .from('users')
        .insert({ email: 'user1@example.com' })
        .select()
        .single();

      const { data: user2 } = await supabase
        .from('users')
        .insert({ email: 'user2@example.com' })
        .select()
        .single();

      // Insert video for user1
      await supabase
        .from('youtube_videos')
        .insert({
          user_id: user1.id,
          youtube_video_id: 'private-video',
          title: 'Private Video'
        });

      // Try to access user1's video as user2 (should fail)
      const { data: videos, error } = await supabase
        .from('youtube_videos')
        .select()
        .eq('youtube_video_id', 'private-video');

      // In a real test, this would use RLS context
      // For now, we test the policy exists
      expect(videos).toHaveLength(0); // RLS should prevent access
    });
  });
});
```

## End-to-End Testing Strategy

### E2E Testing with Playwright
```typescript
// e2e/tests/video-generation-flow.spec.ts
import { test, expect } from '@playwright/test';
import { login, mockExternalAPIs } from '../helpers';

test.describe('Video Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAPIs(page);
    await login(page, 'test@example.com', 'password123');
  });

  test('completes full video generation workflow', async ({ page }) => {
    // Navigate to content generation
    await page.click('[data-testid="nav-content"]');
    await expect(page).toHaveURL('/content');

    // Start new video generation
    await page.click('[data-testid="generate-new-video"]');
    
    // Verify analysis step
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-videos-list"]')).toContainText('Test Video');

    // Generate titles
    await page.click('[data-testid="generate-titles-btn"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="generated-titles"]')).toBeVisible();

    // Select a title
    await page.click('[data-testid="title-option-0"]');
    await page.click('[data-testid="approve-title-btn"]');

    // Generate script
    await expect(page.locator('[data-testid="script-generation"]')).toBeVisible();
    await page.click('[data-testid="generate-script-btn"]');
    
    // Wait for script generation
    await expect(page.locator('[data-testid="generated-script"]')).toBeVisible({ timeout: 10000 });

    // Review and approve script
    const scriptText = await page.locator('[data-testid="script-text"]').textContent();
    expect(scriptText).toContain('motivational');
    
    await page.click('[data-testid="approve-script-btn"]');

    // Start video generation
    await page.click('[data-testid="generate-video-btn"]');
    
    // Verify video generation started
    await expect(page.locator('[data-testid="video-generation-status"]')).toContainText('Queued');
    
    // Wait for completion (mock will complete quickly)
    await expect(page.locator('[data-testid="video-generation-status"]')).toContainText('Completed', { timeout: 15000 });

    // Verify video preview
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();
    
    // Schedule upload
    await page.click('[data-testid="schedule-upload-btn"]');
    await page.fill('[data-testid="video-title-input"]', 'Test Video Title');
    await page.fill('[data-testid="video-description-input"]', 'Test video description');
    await page.click('[data-testid="confirm-upload-btn"]');

    // Verify upload scheduled
    await expect(page.locator('[data-testid="upload-confirmation"]')).toBeVisible();
  });

  test('handles errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/generate/titles', route => 
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'API Error' }) })
    );

    await page.click('[data-testid="nav-content"]');
    await page.click('[data-testid="generate-new-video"]');
    await page.click('[data-testid="generate-titles-btn"]');

    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('saves draft content', async ({ page }) => {
    await page.click('[data-testid="nav-content"]');
    await page.click('[data-testid="generate-new-video"]');
    
    // Generate and select title
    await page.click('[data-testid="generate-titles-btn"]');
    await page.click('[data-testid="title-option-0"]');
    
    // Navigate away
    await page.click('[data-testid="nav-dashboard"]');
    
    // Navigate back
    await page.click('[data-testid="nav-content"]');
    
    // Verify draft is restored
    await expect(page.locator('[data-testid="draft-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-title"]')).toBeVisible();
  });
});

// e2e/tests/dashboard-analytics.spec.ts
test.describe('Dashboard Analytics', () => {
  test('displays analytics data correctly', async ({ page }) => {
    await login(page, 'analytics-user@example.com', 'password123');
    
    // Navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify key metrics are displayed
    await expect(page.locator('[data-testid="total-views"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-videos"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-performance"]')).toBeVisible();
    
    // Verify charts are rendered
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="views-trend-chart"]')).toBeVisible();
    
    // Test date range selection
    await page.click('[data-testid="date-range-selector"]');
    await page.click('[data-testid="date-range-30days"]');
    
    // Verify data updates
    await expect(page.locator('[data-testid="loading-overlay"]')).toBeVisible();
    await expect(page.locator('[data-testid="loading-overlay"]')).not.toBeVisible();
  });

  test('handles real-time updates', async ({ page }) => {
    await login(page, 'realtime-user@example.com', 'password123');
    
    // Start video generation in background
    await mockVideoGenerationProgress(page);
    
    // Verify real-time status updates
    await expect(page.locator('[data-testid="active-jobs-count"]')).toContainText('1');
    
    // Wait for completion
    await expect(page.locator('[data-testid="completed-jobs-today"]')).toContainText('1', { timeout: 10000 });
  });
});
```

### Mobile Responsive Testing
```typescript
// e2e/tests/mobile-responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Experience', () => {
  test('navigation works on mobile', async ({ page }) => {
    await login(page, 'mobile-user@example.com', 'password123');
    
    // Test mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    
    await page.click('[data-testid="mobile-nav-content"]');
    await expect(page).toHaveURL('/content');
  });

  test('content generation flow works on mobile', async ({ page }) => {
    await login(page, 'mobile-user@example.com', 'password123');
    
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="mobile-nav-content"]');
    
    // Test mobile-optimized content generation
    await page.click('[data-testid="mobile-generate-btn"]');
    
    // Verify mobile-friendly interface
    await expect(page.locator('[data-testid="mobile-title-generator"]')).toBeVisible();
    
    // Test swipe gestures for title selection
    await page.locator('[data-testid="title-carousel"]').swipe('left');
    await expect(page.locator('[data-testid="title-option-1"]')).toBeVisible();
  });
});
```

## Performance Testing Strategy

### Load Testing with K6
```javascript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.1'], // Error rate must be below 10%
  },
};

export default function() {
  // Test dashboard load
  let dashboardResponse = http.get('https://app.contentcatalyst.com/dashboard', {
    headers: { 'Authorization': 'Bearer ' + __ENV.TEST_TOKEN }
  });
  
  check(dashboardResponse, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test content generation API
  let generateResponse = http.post('https://app.contentcatalyst.com/api/generate/titles', 
    JSON.stringify({
      source_video_ids: ['test-video-1', 'test-video-2'],
      count: 5,
      style: 'motivational',
      language: 'nl'
    }),
    {
      headers: {
        'Authorization': 'Bearer ' + __ENV.TEST_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  );

  check(generateResponse, {
    'generate API status is 200': (r) => r.status === 200,
    'generate API response time < 2s': (r) => r.timings.duration < 2000,
    'response contains titles': (r) => JSON.parse(r.body).titles.length > 0,
  }) || errorRate.add(1);

  sleep(2);
}

// Spike test configuration
export let spikeOptions = {
  stages: [
    { duration: '10s', target: 100 }, // Fast ramp-up to a high point
    { duration: '1m', target: 100 },  // Stay at high point
    { duration: '10s', target: 0 },   // Quick ramp-down to 0 users
  ],
};
```

### Database Performance Testing
```sql
-- performance/db-performance-tests.sql

-- Test query performance for dashboard analytics
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  COUNT(*) as total_videos,
  AVG(performance_score) as avg_performance,
  SUM(view_count) as total_views
FROM youtube_videos 
WHERE user_id = 'test-user-id' 
AND published_at >= NOW() - INTERVAL '30 days';

-- Test performance of content generation queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  yv.*,
  ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank
FROM youtube_videos yv
WHERE yv.user_id = 'test-user-id'
AND yv.published_at >= NOW() - INTERVAL '30 days'
ORDER BY yv.performance_score DESC
LIMIT 10;

-- Test concurrent user scenario
BEGIN;
SET LOCAL work_mem = '256MB';

-- Simulate multiple users analyzing content simultaneously
SELECT calculate_video_performance_score(id) 
FROM youtube_videos 
WHERE user_id IN (
  SELECT id FROM users 
  ORDER BY created_at DESC 
  LIMIT 100
);

COMMIT;
```

## Security Testing Strategy

### Authentication and Authorization Testing
```typescript
// security/auth-security.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Security', () => {
  test('prevents unauthorized access', async ({ page }) => {
    // Try to access protected page without authentication
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('validates JWT tokens properly', async ({ page }) => {
    // Set invalid JWT token
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'invalid.jwt.token');
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('enforces password requirements', async ({ page }) => {
    await page.goto('/register');
    
    // Test weak password
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('prevents brute force attacks', async ({ page }) => {
    await page.goto('/login');
    
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      if (i < 4) {
        await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      }
    }
    
    // Account should be locked after 5 attempts
    await expect(page.locator('[data-testid="account-locked"]')).toBeVisible();
  });
});
```

### Input Validation Security Testing
```typescript
// security/input-validation.test.ts
test.describe('Input Validation Security', () => {
  test('prevents XSS attacks', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    await page.goto('/content');
    
    // Try to inject script in title input
    const maliciousScript = '<script>alert("XSS")</script>';
    await page.fill('[data-testid="video-title-input"]', maliciousScript);
    await page.click('[data-testid="save-button"]');
    
    // Verify script is not executed
    const alertPromise = page.waitForEvent('dialog', { timeout: 1000 });
    expect(alertPromise).rejects.toThrow();
    
    // Verify content is sanitized
    const titleValue = await page.locator('[data-testid="video-title-display"]').textContent();
    expect(titleValue).not.toContain('<script>');
  });

  test('prevents SQL injection', async ({ request }) => {
    const maliciousInput = "' OR '1'='1' --";
    
    const response = await request.post('/api/videos/search', {
      data: { query: maliciousInput }
    });
    
    expect(response.status()).toBe(400); // Should be rejected
  });

  test('validates file uploads', async ({ page }) => {
    await login(page, 'test@example.com', 'password123');
    
    // Try to upload malicious file
    const maliciousFile = new File(['<?php echo "hack"; ?>'], 'hack.php', { type: 'text/php' });
    
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'hack.php',
      mimeType: 'text/php',
      buffer: Buffer.from('<?php echo "hack"; ?>')
    });
    
    await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
  });
});
```

## Test Data Management

### Test Data Factory
```typescript
// src/test/factories/index.ts
import { faker } from '@faker-js/faker';

export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      full_name: faker.name.fullName(),
      created_at: faker.date.past(),
      subscription_tier: 'free',
      monthly_video_quota: 3,
      preferences: {
        content_style: 'motivational',
        default_video_duration: 40,
        language_preference: 'nl'
      },
      ...overrides
    };
  }

  static createVideo(overrides: Partial<YouTubeVideo> = {}): YouTubeVideo {
    return {
      id: faker.datatype.uuid(),
      youtube_video_id: faker.random.alphaNumeric(11),
      title: faker.lorem.sentence(),
      view_count: faker.datatype.number({ min: 100, max: 100000 }),
      like_count: faker.datatype.number({ min: 10, max: 5000 }),
      comment_count: faker.datatype.number({ min: 0, max: 500 }),
      published_at: faker.date.past(),
      performance_score: faker.datatype.float({ min: 0, max: 100 }),
      ...overrides
    };
  }

  static createGeneratedContent(overrides: Partial<GeneratedContent> = {}): GeneratedContent {
    return {
      id: faker.datatype.uuid(),
      content_type: faker.helpers.arrayElement(['title', 'script', 'description']),
      generated_text: faker.lorem.paragraphs(),
      quality_score: faker.datatype.float({ min: 0, max: 10 }),
      status: 'generated',
      created_at: faker.date.recent(),
      ...overrides
    };
  }

  static createVideoJob(overrides: Partial<VideoProductionJob> = {}): VideoProductionJob {
    return {
      id: faker.datatype.uuid(),
      revid_job_id: faker.datatype.uuid(),
      status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
      progress_percentage: faker.datatype.number({ min: 0, max: 100 }),
      created_at: faker.date.recent(),
      ...overrides
    };
  }
}
```

### Database Test Helpers
```typescript
// src/test/helpers/database.ts
import { createClient } from '@supabase/supabase-js';

export class DatabaseTestHelper {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_SERVICE_KEY!
    );
  }

  async setupTestUser(userData: Partial<User> = {}): Promise<User> {
    const user = TestDataFactory.createUser(userData);
    
    const { data, error } = await this.supabase
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createTestVideos(userId: string, count: number = 5): Promise<YouTubeVideo[]> {
    const videos = Array.from({ length: count }, () => 
      TestDataFactory.createVideo({ user_id: userId })
    );

    const { data, error } = await this.supabase
      .from('youtube_videos')
      .insert(videos)
      .select();

    if (error) throw error;
    return data;
  }

  async cleanupTestData(): Promise<void> {
    // Delete test data in correct order (respecting foreign keys)
    await this.supabase.from('video_production_jobs').delete().neq('id', '');
    await this.supabase.from('generated_content').delete().neq('id', '');
    await this.supabase.from('youtube_videos').delete().neq('id', '');
    await this.supabase.from('users').delete().neq('id', '');
  }

  async seedDatabase(): Promise<{
    users: User[];
    videos: YouTubeVideo[];
    content: GeneratedContent[];
  }> {
    // Create test users
    const users = await Promise.all([
      this.setupTestUser({ email: 'test1@example.com' }),
      this.setupTestUser({ email: 'test2@example.com' }),
      this.setupTestUser({ email: 'premium@example.com', subscription_tier: 'professional' })
    ]);

    // Create test videos for each user
    const videos: YouTubeVideo[] = [];
    for (const user of users) {
      const userVideos = await this.createTestVideos(user.id, 3);
      videos.push(...userVideos);
    }

    // Create test generated content
    const content: GeneratedContent[] = [];
    for (const user of users) {
      const userContent = Array.from({ length: 2 }, () =>
        TestDataFactory.createGeneratedContent({ user_id: user.id })
      );
      
      const { data } = await this.supabase
        .from('generated_content')
        .insert(userContent)
        .select();
      
      content.push(...(data || []));
    }

    return { users, videos, content };
  }
}
```

## Continuous Testing Strategy

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup test database
        run: |
          npm run db:setup:test
          npm run db:migrate:test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Run K6 performance tests
        uses: grafana/k6-action@v0.2.0
        with:
          filename: performance/load-test.js
        env:
          TEST_TOKEN: ${{ secrets.TEST_API_TOKEN }}

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: security/results.sarif
      
      - name: Run dependency audit
        run: npm audit --audit-level high
```

### Test Reporting and Monitoring
```typescript
// src/test/reporters/custom-reporter.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class CustomTestReporter implements Reporter {
  onBegin(config, suite) {
    console.log(`Starting the run with ${suite.allTests().length} tests`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Send test results to monitoring system
    this.sendTestMetrics({
      testName: test.title,
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      timestamp: new Date()
    });
  }

  onEnd(result) {
    console.log(`Finished the run: ${result.status}`);
    
    // Generate and send test summary
    this.sendTestSummary({
      status: result.status,
      startTime: result.startTime,
      duration: Date.now() - result.startTime.getTime(),
      totalTests: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests
    });
  }

  private async sendTestMetrics(metrics: TestMetrics): Promise<void> {
    // Send to analytics/monitoring service
    await fetch(process.env.METRICS_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics)
    });
  }
}
```

**[ ] TASK**: Set up comprehensive test automation pipeline with CI/CD integration
**[ ] TASK**: Implement performance testing benchmarks and monitoring
**[ ] TASK**: Create security testing protocols and automated vulnerability scanning
**[ ] TASK**: Establish test data management and cleanup procedures
**[ ] TASK**: Build test reporting dashboards and quality metrics tracking