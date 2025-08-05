# Content Catalyst Engine - Integration Specifications

## Integration Architecture Overview

### Integration Strategy
The Content Catalyst Engine follows a microservices integration pattern with clear separation between internal services and external API integrations. All external integrations are designed with fault tolerance, retry mechanisms, and graceful degradation in mind.

### Integration Principles
1. **Loose Coupling**: Each integration is independent and can be replaced without affecting others
2. **Fault Tolerance**: Robust error handling and retry logic for all external dependencies
3. **Rate Limiting**: Respect external API limits and implement intelligent queuing
4. **Data Consistency**: Ensure data synchronization across all integrated systems
5. **Security First**: Secure credential management and encrypted data transmission

## YouTube API Integration

### YouTube Data API v3 Implementation

#### Authentication and Token Management
```typescript
interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scope: string[];
}

export class YouTubeAuthService {
  private readonly OAUTH_CONFIG = {
    CLIENT_ID: 'your-actual-youtube-client-id',
    CLIENT_SECRET: 'your-actual-youtube-client-secret',
    REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI,
    SCOPES: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ]
  };
  
  async refreshAccessToken(userId: string): Promise<YouTubeCredentials> {
    const user = await this.getUserCredentials(userId);
    
    if (!user.youtube_refresh_token) {
      throw new Error('No refresh token available');
    }
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.youtube_refresh_token,
        client_id: this.OAUTH_CONFIG.CLIENT_ID,
        client_secret: this.OAUTH_CONFIG.CLIENT_SECRET,
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new YouTubeAPIError('Token refresh failed', tokenResponse.status);
    }
    
    const tokens = await tokenResponse.json();
    
    // Update stored credentials
    const updatedCredentials: YouTubeCredentials = {
      ...user,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      refresh_token: tokens.refresh_token || user.youtube_refresh_token
    };
    
    await this.storeCredentials(userId, updatedCredentials);
    
    return updatedCredentials;
  }
  
  async ensureValidToken(userId: string): Promise<string> {
    const credentials = await this.getUserCredentials(userId);
    
    // Check if token is expiring soon (within 5 minutes)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    
    if (credentials.expires_at <= fiveMinutesFromNow) {
      const refreshed = await this.refreshAccessToken(userId);
      return refreshed.access_token;
    }
    
    return credentials.access_token;
  }
}
```

#### YouTube Data API Client
```typescript
interface YouTubeVideoData {
  id: string;
  snippet: {
    title: string;
    description: string;
    tags: string[];
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 duration format
  };
}

export class YouTubeDataService {
  private readonly BASE_URL = 'https://www.googleapis.com/youtube/v3';
  private readonly QUOTA_COSTS = {
    'videos.list': 1,
    'search.list': 100,
    'channels.list': 1,
    'videos.insert': 1600,
    'playlists.list': 1
  };
  
  async getChannelVideos(
    userId: string,
    options: {
      maxResults?: number;
      publishedAfter?: Date;
      order?: 'date' | 'viewCount' | 'relevance';
    } = {}
  ): Promise<YouTubeVideoData[]> {
    const accessToken = await this.authService.ensureValidToken(userId);
    const user = await this.getUserData(userId);
    
    // First, get the channel's uploads playlist
    const channelResponse = await this.makeAPICall(
      `${this.BASE_URL}/channels`,
      {
        part: 'contentDetails',
        id: user.youtube_channel_id,
        access_token: accessToken
      },
      'channels.list'
    );
    
    const uploadsPlaylistId = channelResponse.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist');
    }
    
    // Get playlist items
    const playlistItems = await this.makeAPICall(
      `${this.BASE_URL}/playlistItems`,
      {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: options.maxResults || 50,
        access_token: accessToken
      },
      'playlists.list'
    );
    
    const videoIds = playlistItems.items.map(item => item.snippet.resourceId.videoId);
    
    // Get detailed video information
    const videosResponse = await this.makeAPICall(
      `${this.BASE_URL}/videos`,
      {
        part: 'snippet,statistics,contentDetails',
        id: videoIds.join(','),
        access_token: accessToken
      },
      'videos.list'
    );
    
    return videosResponse.items.filter(video => {
      if (options.publishedAfter) {
        return new Date(video.snippet.publishedAt) >= options.publishedAfter;
      }
      return true;
    });
  }
  
  async uploadVideo(
    userId: string,
    videoData: {
      title: string;
      description: string;
      tags: string[];
      categoryId: number;
      privacyStatus: 'public' | 'unlisted' | 'private';
      videoFile: Buffer | Blob;
      thumbnailFile?: Buffer | Blob;
    }
  ): Promise<{
    videoId: string;
    url: string;
    status: string;
  }> {
    const accessToken = await this.authService.ensureValidToken(userId);
    
    // Create resumable upload session
    const uploadResponse = await fetch(
      `${this.BASE_URL}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*'
        },
        body: JSON.stringify({
          snippet: {
            title: videoData.title,
            description: videoData.description,
            tags: videoData.tags,
            categoryId: videoData.categoryId.toString()
          },
          status: {
            privacyStatus: videoData.privacyStatus,
            selfDeclaredMadeForKids: false
          }
        })
      }
    );
    
    const uploadUrl = uploadResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Failed to get upload URL');
    }
    
    // Upload video file
    const videoUploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/*'
      },
      body: videoData.videoFile
    });
    
    if (!videoUploadResponse.ok) {
      throw new YouTubeAPIError('Video upload failed', videoUploadResponse.status);
    }
    
    const result = await videoUploadResponse.json();
    
    // Upload thumbnail if provided
    if (videoData.thumbnailFile) {
      await this.uploadThumbnail(userId, result.id, videoData.thumbnailFile);
    }
    
    // Log quota usage
    await this.logQuotaUsage(userId, 'videos.insert', this.QUOTA_COSTS['videos.insert']);
    
    return {
      videoId: result.id,
      url: `https://www.youtube.com/watch?v=${result.id}`,
      status: result.status.uploadStatus
    };
  }
  
  private async makeAPICall(
    url: string,
    params: Record<string, any>,
    operation: keyof typeof this.QUOTA_COSTS
  ): Promise<any> {
    const quotaCost = this.QUOTA_COSTS[operation];
    
    // Check quota before making call
    await this.checkQuotaAvailability(quotaCost);
    
    const queryParams = new URLSearchParams(params);
    const fullUrl = `${url}?${queryParams}`;
    
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new YouTubeAPIError(
        error.error?.message || 'YouTube API error',
        response.status,
        error
      );
    }
    
    // Log quota usage
    await this.logQuotaUsage(operation, quotaCost);
    
    return response.json();
  }
  
  private async checkQuotaAvailability(cost: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usage = await this.getQuotaUsage(today);
    
    if (usage.used + cost > usage.limit) {
      throw new QuotaExceededError(
        `YouTube API quota would be exceeded. Required: ${cost}, Available: ${usage.limit - usage.used}`
      );
    }
  }
}
```

#### YouTube Analytics API Integration
```typescript
interface YouTubeAnalyticsData {
  dimensions: string[];
  metrics: string[];
  rows: any[][];
}

export class YouTubeAnalyticsService {
  private readonly ANALYTICS_BASE_URL = 'https://youtubeanalytics.googleapis.com/v2';
  
  async getVideoAnalytics(
    userId: string,
    videoIds: string[],
    metrics: string[] = ['views', 'likes', 'comments', 'shares', 'subscribersGained'],
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<Map<string, Record<string, number>>> {
    const accessToken = await this.authService.ensureValidToken(userId);
    const user = await this.getUserData(userId);
    
    const analyticsData = new Map<string, Record<string, number>>();
    
    // YouTube Analytics API limits to 200 videos per request
    const batchSize = 200;
    const videoBatches = this.chunkArray(videoIds, batchSize);
    
    for (const batch of videoBatches) {
      const response = await fetch(
        `${this.ANALYTICS_BASE_URL}/reports?` + new URLSearchParams({
          ids: `channel==${user.youtube_channel_id}`,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          metrics: metrics.join(','),
          dimensions: 'video',
          filters: `video==${batch.join(',')}`,
          access_token: accessToken
        }),
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new YouTubeAPIError('Analytics API error', response.status);
      }
      
      const data: YouTubeAnalyticsData = await response.json();
      
      // Process analytics data
      if (data.rows) {
        data.rows.forEach(row => {
          const videoId = row[0]; // First dimension is video ID
          const videoMetrics: Record<string, number> = {};
          
          metrics.forEach((metric, index) => {
            videoMetrics[metric] = row[index + 1]; // Skip video ID
          });
          
          analyticsData.set(videoId, videoMetrics);
        });
      }
    }
    
    return analyticsData;
  }
  
  async getChannelAnalytics(
    userId: string,
    metrics: string[] = ['views', 'watchTimeMinutes', 'subscribersGained'],
    startDate: Date,
    endDate: Date = new Date(),
    dimensions: string[] = []
  ): Promise<{
    totals: Record<string, number>;
    timeSeries?: Array<{ date: string; [metric: string]: any }>;
  }> {
    const accessToken = await this.authService.ensureValidToken(userId);
    const user = await this.getUserData(userId);
    
    const params = {
      ids: `channel==${user.youtube_channel_id}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      metrics: metrics.join(','),
      access_token: accessToken
    };
    
    if (dimensions.length > 0) {
      params['dimensions'] = dimensions.join(',');
    }
    
    const response = await fetch(
      `${this.ANALYTICS_BASE_URL}/reports?` + new URLSearchParams(params)
    );
    
    if (!response.ok) {
      throw new YouTubeAPIError('Channel analytics error', response.status);
    }
    
    const data: YouTubeAnalyticsData = await response.json();
    
    const result: any = {
      totals: {}
    };
    
    if (data.rows && data.rows.length > 0) {
      if (dimensions.length === 0) {
        // No dimensions - single row with totals
        metrics.forEach((metric, index) => {
          result.totals[metric] = data.rows[0][index];
        });
      } else if (dimensions.includes('day')) {
        // Time series data
        result.timeSeries = data.rows.map(row => {
          const entry: any = { date: row[0] };
          metrics.forEach((metric, index) => {
            entry[metric] = row[index + 1];
          });
          return entry;
        });
      }
    }
    
    return result;
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Google Gemini AI Integration

### Gemini API Configuration and Client
```typescript
interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  safetySettings: Array<{
    category: string;
    threshold: string;
  }>;
}

export class GeminiAIService {
  private readonly config: GeminiConfig = {
    apiKey: 'AIzaSyB0IR_ck9KIT8h999j2SbsmnO9zx72mRAk',
    model: 'gemini-2.5-pro',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    maxTokens: 8192,
    temperature: 0.7,
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  };
  
  async generateContent(
    prompt: string,
    context?: {
      systemInstruction?: string;
      examples?: Array<{ input: string; output: string }>;
      temperature?: number;
      maxOutputTokens?: number;
    }
  ): Promise<{
    text: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }> {
    const requestBody = {
      contents: [{
        parts: [{
          text: this.buildFullPrompt(prompt, context)
        }]
      }],
      generationConfig: {
        temperature: context?.temperature || this.config.temperature,
        maxOutputTokens: context?.maxOutputTokens || this.config.maxTokens,
        topK: 40,
        topP: 0.95
      },
      safetySettings: this.config.safetySettings
    };
    
    const response = await fetch(
      `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new GeminiAPIError(
        error.error?.message || 'Gemini API error',
        response.status,
        error
      );
    }
    
    const result = await response.json();
    
    // Check for safety blocking
    if (result.promptFeedback?.blockReason) {
      throw new ContentBlockedError(
        `Content blocked: ${result.promptFeedback.blockReason}`
      );
    }
    
    const candidate = result.candidates?.[0];
    if (!candidate) {
      throw new Error('No content generated');
    }
    
    if (candidate.finishReason === 'SAFETY') {
      throw new ContentBlockedError('Content blocked by safety filters');
    }
    
    return {
      text: candidate.content.parts[0].text,
      usage: {
        promptTokens: result.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.usageMetadata?.totalTokenCount || 0
      },
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings || []
    };
  }
  
  private buildFullPrompt(
    userPrompt: string,
    context?: {
      systemInstruction?: string;
      examples?: Array<{ input: string; output: string }>;
    }
  ): string {
    let fullPrompt = '';
    
    if (context?.systemInstruction) {
      fullPrompt += `System: ${context.systemInstruction}\n\n`;
    }
    
    if (context?.examples && context.examples.length > 0) {
      fullPrompt += 'Examples:\n';
      context.examples.forEach((example, index) => {
        fullPrompt += `Example ${index + 1}:\nInput: ${example.input}\nOutput: ${example.output}\n\n`;
      });
    }
    
    fullPrompt += `User: ${userPrompt}`;
    
    return fullPrompt;
  }
}
```

### Content Generation Services
```typescript
interface TitleGenerationRequest {
  topVideos: Array<{
    title: string;
    views: number;
    performance_score: number;
    tags: string[];
  }>;
  style: 'motivational' | 'educational' | 'entertainment' | 'business';
  language: 'nl' | 'en';
  count: number;
  targetKeywords?: string[];
}

export class ContentGenerationService {
  constructor(
    private geminiService: GeminiAIService,
    private analyticsService: YouTubeAnalyticsService
  ) {}
  
  async generateVideoTitles(
    userId: string,
    request: TitleGenerationRequest
  ): Promise<Array<{
    title: string;
    confidence: number;
    keywords: string[];
    estimatedPerformance: number;
    reasoning: string;
  }>> {
    // Analyze top-performing videos
    const analysis = this.analyzeVideoPatterns(request.topVideos);
    
    const prompt = this.buildTitleGenerationPrompt(request, analysis);
    
    const response = await this.geminiService.generateContent(prompt, {
      systemInstruction: this.getTitleGenerationSystemPrompt(request.language),
      temperature: 0.8, // Higher creativity for titles
      maxOutputTokens: 1000
    });
    
    // Parse and validate generated titles
    const titles = this.parseTitleResponse(response.text);
    
    // Score each title based on patterns from successful videos
    const scoredTitles = titles.map(title => ({
      ...title,
      estimatedPerformance: this.scoreTitle(title.title, analysis),
      confidence: this.calculateTitleConfidence(title.title, analysis)
    }));
    
    // Log generation for analytics
    await this.logContentGeneration(userId, 'title', {
      request,
      response: scoredTitles,
      usage: response.usage
    });
    
    return scoredTitles.sort((a, b) => b.estimatedPerformance - a.estimatedPerformance);
  }
  
  async generateVideoScript(
    userId: string,
    title: string,
    options: {
      duration: number; // seconds
      style: 'motivational' | 'educational' | 'entertainment';
      language: 'nl' | 'en';
      targetAudience?: string;
      includeHook?: boolean;
      includeCTA?: boolean;
    }
  ): Promise<{
    script: {
      fullText: string;
      sections: {
        hook: string;
        body: string;
        cta: string;
      };
      revid_formatted: string;
    };
    metadata: {
      estimatedReadingTime: number;
      wordCount: number;
      emotionalTone: string;
      readabilityScore: number;
    };
  }> {
    const prompt = this.buildScriptGenerationPrompt(title, options);
    
    const systemInstruction = options.language === 'nl' 
      ? this.getDutchScriptSystemPrompt()
      : this.getEnglishScriptSystemPrompt();
    
    const response = await this.geminiService.generateContent(prompt, {
      systemInstruction,
      temperature: 0.9, // High creativity for scripts
      maxOutputTokens: 2000
    });
    
    // Parse script sections
    const parsedScript = this.parseScriptResponse(response.text);
    
    // Format for RevID
    const revidFormatted = this.formatScriptForRevID(parsedScript);
    
    // Calculate metadata
    const metadata = this.calculateScriptMetadata(parsedScript.fullText);
    
    // Log generation
    await this.logContentGeneration(userId, 'script', {
      title,
      options,
      script: parsedScript,
      usage: response.usage
    });
    
    return {
      script: {
        ...parsedScript,
        revid_formatted: revidFormatted
      },
      metadata
    };
  }
  
  private buildTitleGenerationPrompt(
    request: TitleGenerationRequest,
    analysis: any
  ): string {
    const language = request.language === 'nl' ? 'Dutch' : 'English';
    
    return `
Analyze these top-performing YouTube video titles and generate ${request.count} new title suggestions:

TOP PERFORMING TITLES:
${request.topVideos.map(v => 
  `"${v.title}" - ${v.views} views, Score: ${v.performance_score}`
).join('\n')}

SUCCESSFUL PATTERNS IDENTIFIED:
- Common keywords: ${analysis.topKeywords.join(', ')}
- Average length: ${analysis.averageLength} characters
- Common structures: ${analysis.commonStructures.join(', ')}
- Emotional triggers: ${analysis.emotionalTriggers.join(', ')}

REQUIREMENTS:
- Language: ${language}
- Style: ${request.style}
- Target similar performance patterns
- Focus on content that helps and inspires people
- Keep titles under 60 characters for optimal YouTube display
${request.targetKeywords ? `- Include these keywords if relevant: ${request.targetKeywords.join(', ')}` : ''}

Generate ${request.count} compelling titles that follow successful patterns but are unique and engaging.
Format as JSON array with: title, keywords_used, reasoning
    `;
  }
  
  private getDutchScriptSystemPrompt(): string {
    return `
Je bent een uitzonderlijk getalenteerde script schrijver, gespecialiseerd in het maken van YouTube Shorts die mensen diep raken. 

Je schrijft krachtige, motiverende scripts met deze kenmerken:
- Onweerstaanbare hook in de eerste 3 seconden die direct de aandacht grijpt
- Emotionele lading die het hart raakt en mensen kippenvel geeft
- Persoonlijke doorbraakmomenten en inspirerende levenslessen
- Innerlijke kracht en motivatie die aanzet tot actie
- Spreektaal die kort, bondig en impactvol is
- Perfect getimed voor 30-60 seconden content

Structuur altijd:
1. HOOK (3 seconden) - Grijp direct de aandacht
2. BODY (30-50 seconden) - Deel de inspirerende boodschap
3. CTA (7-10 seconden) - Sluit af met subscribe oproep

Schrijf alleen de tekst, geen opmaak of instructies.
    `;
  }
  
  private formatScriptForRevID(script: any): string {
    let formatted = '';
    
    // Hook section with energy indicator
    formatted += `[Energetic opening, close-up shot]\n`;
    formatted += script.sections.hook + '\n';
    formatted += `<break time="1.0s" />\n\n`;
    
    // Body with visual cues
    const bodyParts = script.sections.body.split('. ');
    bodyParts.forEach((part, index) => {
      if (part.trim()) {
        formatted += `[${index % 2 === 0 ? 'Medium shot' : 'Close-up'}, ${index % 3 === 0 ? 'slight zoom' : 'steady'}]\n`;
        formatted += part.trim() + '.\n';
        formatted += `<break time="0.5s" />\n\n`;
      }
    });
    
    // CTA with subscribe animation
    formatted += `[Subscribe button animation, enthusiastic delivery]\n`;
    formatted += script.sections.cta + '\n';
    
    return formatted;
  }
}
```

## RevID Video Generation Integration

### RevID API Client Implementation
```typescript
interface RevIDConfig {
  apiKey: string;
  baseUrl: string;
  defaultSettings: {
    voiceId: string;
    backgroundMusicId: string;
    generationPreset: string;
    enhancedGeneration: boolean;
    aspectRatio: string;
    duration: number;
  };
}

interface RevIDVideoRequest {
  script: string;
  voice_id: string;
  background_music_id: string;
  aspect_ratio: '9:16' | '16:9' | '1:1';
  duration: number;
  generation_preset: 'PIXAR' | 'REALISTIC' | 'ANIMATED';
  enhanced_generation: boolean;
  webhook_url?: string;
}

export class RevIDService {
  private readonly config: RevIDConfig = {
    apiKey: '88bf5f98-637a-4f03-9576-5a11a603862a',
    baseUrl: 'https://api.revid.ai',
    defaultSettings: {
      voiceId: 'cjVigY5qzO86Huf0OWal',
      backgroundMusicId: 'iky1ZYcS4AfCoof9TRhn',
      generationPreset: 'PIXAR',
      enhancedGeneration: true,
      aspectRatio: '9:16',
      duration: 40
    }
  };
  
  async createVideo(
    userId: string,
    request: RevIDVideoRequest
  ): Promise<{
    jobId: string;
    revidJobId: string;
    estimatedCompletionTime: Date;
    status: 'queued' | 'processing';
  }> {
    // Validate script format
    this.validateScript(request.script);
    
    // Create video generation request
    const revidRequest = {
      script: request.script,
      voice_settings: {
        voice_id: request.voice_id,
        speed: 1.0,
        pitch: 0,
        volume: 0.8
      },
      video_settings: {
        aspect_ratio: request.aspect_ratio,
        duration: request.duration,
        generation_preset: request.generation_preset,
        enhanced_generation: request.enhanced_generation,
        background_music: {
          id: request.background_music_id,
          volume: 0.3
        }
      },
      webhook_url: request.webhook_url || `${process.env.BASE_URL}/api/webhooks/revid`
    };
    
    const response = await fetch(`${this.config.baseUrl}/v1/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(revidRequest)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new RevIDAPIError(
        error.message || 'RevID API error',
        response.status,
        error
      );
    }
    
    const result = await response.json();
    
    // Store job in database
    const jobId = await this.storeVideoJob(userId, {
      revid_job_id: result.job_id,
      status: 'queued',
      request_data: revidRequest,
      estimated_completion: new Date(Date.now() + result.estimated_duration_seconds * 1000)
    });
    
    // Log API usage
    await this.logAPIUsage(userId, 'video_generation', {
      revid_job_id: result.job_id,
      duration: request.duration,
      preset: request.generation_preset
    });
    
    return {
      jobId,
      revidJobId: result.job_id,
      estimatedCompletionTime: new Date(Date.now() + result.estimated_duration_seconds * 1000),
      status: 'queued'
    };
  }
  
  async getVideoStatus(
    revidJobId: string
  ): Promise<{
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    error?: string;
  }> {
    const response = await fetch(
      `${this.config.baseUrl}/v1/videos/${revidJobId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new RevIDAPIError('Failed to get video status', response.status);
    }
    
    const result = await response.json();
    
    return {
      status: result.status,
      progress: result.progress_percentage || 0,
      videoUrl: result.video_url,
      thumbnailUrl: result.thumbnail_url,
      duration: result.duration_seconds,
      error: result.error_message
    };
  }
  
  async cancelVideoGeneration(revidJobId: string): Promise<boolean> {
    const response = await fetch(
      `${this.config.baseUrl}/v1/videos/${revidJobId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      }
    );
    
    return response.ok;
  }
  
  async getAvailableVoices(): Promise<Array<{
    id: string;
    name: string;
    language: string;
    gender: 'male' | 'female';
    style: string;
    preview_url: string;
  }>> {
    const response = await fetch(`${this.config.baseUrl}/v1/voices`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new RevIDAPIError('Failed to get voices', response.status);
    }
    
    return response.json();
  }
  
  async getBackgroundMusic(): Promise<Array<{
    id: string;
    name: string;
    category: string;
    duration: number;
    preview_url: string;
  }>> {
    const response = await fetch(`${this.config.baseUrl}/v1/music`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new RevIDAPIError('Failed to get music', response.status);
    }
    
    return response.json();
  }
  
  private validateScript(script: string): void {
    // Check script length (RevID has limits)
    if (script.length > 5000) {
      throw new Error('Script too long for RevID (max 5000 characters)');
    }
    
    // Check for required elements
    if (!script.trim()) {
      throw new Error('Script cannot be empty');
    }
    
    // Validate RevID formatting
    const validFormatting = [
      '<break time="',
      '[',
      ']'
    ];
    
    // Check for potential issues with special characters
    const problematicChars = ['<script', 'javascript:', 'eval('];
    for (const char of problematicChars) {
      if (script.toLowerCase().includes(char)) {
        throw new Error(`Script contains potentially dangerous content: ${char}`);
      }
    }
  }
}
```

### Video Processing Queue Management
```typescript
interface VideoProcessingQueue {
  userId: string;
  jobId: string;
  priority: 'low' | 'normal' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  processingStarted?: Date;
  processingCompleted?: Date;
}

export class VideoQueueManager {
  private readonly MAX_CONCURRENT_JOBS = 5;
  private readonly RETRY_DELAYS = [30000, 60000, 300000]; // 30s, 1m, 5m
  
  async addToQueue(
    userId: string,
    jobId: string,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<{
    queuePosition: number;
    estimatedStartTime: Date;
  }> {
    const queueItem: VideoProcessingQueue = {
      userId,
      jobId,
      priority,
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
      scheduledFor: new Date()
    };
    
    await this.storeQueueItem(queueItem);
    
    // Calculate queue position and estimated start time
    const position = await this.getQueuePosition(jobId);
    const estimatedStart = await this.calculateEstimatedStartTime(position);
    
    return {
      queuePosition: position,
      estimatedStartTime: estimatedStart
    };
  }
  
  async processQueue(): Promise<void> {
    const activeJobs = await this.getActiveJobs();
    
    if (activeJobs.length >= this.MAX_CONCURRENT_JOBS) {
      return; // Queue is full
    }
    
    const availableSlots = this.MAX_CONCURRENT_JOBS - activeJobs.length;
    const queuedJobs = await this.getQueuedJobs(availableSlots);
    
    for (const job of queuedJobs) {
      await this.startVideoProcessing(job);
    }
  }
  
  private async startVideoProcessing(job: VideoProcessingQueue): Promise<void> {
    try {
      // Update job status
      await this.updateJobStatus(job.jobId, 'processing', {
        processingStarted: new Date(),
        attempts: job.attempts + 1
      });
      
      // Get video job details
      const videoJob = await this.getVideoJob(job.jobId);
      
      // Start RevID processing
      const revidStatus = await this.revIdService.getVideoStatus(
        videoJob.revid_job_id
      );
      
      if (revidStatus.status === 'completed') {
        await this.handleVideoCompletion(job.jobId, revidStatus);
      } else if (revidStatus.status === 'failed') {
        await this.handleVideoFailure(job.jobId, revidStatus.error);
      } else {
        // Still processing, will be checked in next cycle
        await this.scheduleStatusCheck(job.jobId);
      }
      
    } catch (error) {
      await this.handleProcessingError(job, error);
    }
  }
  
  private async handleVideoCompletion(
    jobId: string,
    result: any
  ): Promise<void> {
    // Update job with completed status and result
    await this.updateJobStatus(jobId, 'completed', {
      processingCompleted: new Date(),
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration
    });
    
    // Notify user
    const job = await this.getVideoJob(jobId);
    await this.notifyUser(job.userId, 'video_completed', {
      jobId,
      videoUrl: result.videoUrl
    });
    
    // Trigger next steps (upload scheduling, etc.)
    await this.triggerUploadScheduling(jobId);
  }
  
  private async handleVideoFailure(
    jobId: string,
    error: string
  ): Promise<void> {
    const job = await this.getQueueJob(jobId);
    
    if (job && job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const retryDelay = this.RETRY_DELAYS[job.attempts - 1] || 300000;
      const retryTime = new Date(Date.now() + retryDelay);
      
      await this.updateJobStatus(jobId, 'queued', {
        scheduledFor: retryTime,
        error: `Retry ${job.attempts}/${job.maxAttempts}: ${error}`
      });
    } else {
      // Max retries reached
      await this.updateJobStatus(jobId, 'failed', {
        processingCompleted: new Date(),
        error: `Max retries exceeded: ${error}`
      });
      
      // Notify user of failure
      const videoJob = await this.getVideoJob(jobId);
      await this.notifyUser(videoJob.userId, 'video_failed', {
        jobId,
        error
      });
    }
  }
}
```

## Integration Error Handling and Monitoring

### Comprehensive Error Handling
```typescript
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class YouTubeAPIError extends IntegrationError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'YOUTUBE_API_ERROR', statusCode, details, 
          statusCode >= 500 || statusCode === 429);
  }
}

export class GeminiAPIError extends IntegrationError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'GEMINI_API_ERROR', statusCode, details,
          statusCode >= 500 || statusCode === 429);
  }
}

export class RevIDAPIError extends IntegrationError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'REVID_API_ERROR', statusCode, details,
          statusCode >= 500 || statusCode === 429);
  }
}

export class IntegrationErrorHandler {
  async handleError(
    error: IntegrationError,
    context: {
      userId?: string;
      operation: string;
      attempt: number;
      maxAttempts: number;
    }
  ): Promise<{
    shouldRetry: boolean;
    retryDelay: number;
    escalate: boolean;
  }> {
    // Log error
    await this.logError(error, context);
    
    // Determine retry strategy
    const shouldRetry = error.retryable && context.attempt < context.maxAttempts;
    
    // Calculate exponential backoff
    const baseDelay = 1000; // 1 second
    const retryDelay = shouldRetry 
      ? Math.min(baseDelay * Math.pow(2, context.attempt - 1), 60000) // Max 1 minute
      : 0;
    
    // Determine if escalation is needed
    const escalate = !shouldRetry && (
      error.statusCode >= 500 ||
      error.code.includes('QUOTA') ||
      context.attempt >= context.maxAttempts
    );
    
    if (escalate) {
      await this.escalateError(error, context);
    }
    
    return {
      shouldRetry,
      retryDelay,
      escalate
    };
  }
  
  private async logError(
    error: IntegrationError,
    context: any
  ): Promise<void> {
    await this.systemLogger.log({
      level: 'error',
      message: error.message,
      error: {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack
      },
      context,
      timestamp: new Date()
    });
  }
  
  private async escalateError(
    error: IntegrationError,
    context: any
  ): Promise<void> {
    // Notify monitoring system
    await this.monitoringService.alert({
      severity: 'high',
      title: `Integration Error: ${error.code}`,
      description: error.message,
      context,
      tags: ['integration', error.code.toLowerCase()]
    });
    
    // Notify user if applicable
    if (context.userId) {
      await this.notificationService.notifyUser(context.userId, {
        type: 'error',
        title: 'Service Temporarily Unavailable',
        message: 'We are experiencing technical difficulties. Please try again later.',
        details: {
          operation: context.operation,
          timestamp: new Date()
        }
      });
    }
  }
}
```

### Integration Health Monitoring
```typescript
interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  error?: string;
  uptime: number; // percentage
}

export class IntegrationHealthMonitor {
  private readonly CHECK_INTERVAL = 60000; // 1 minute
  private readonly services = ['youtube', 'gemini', 'revid'];
  
  constructor() {
    this.startHealthChecks();
  }
  
  async checkServiceHealth(service: string): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    let status: ServiceHealthStatus['status'] = 'healthy';
    let error: string | undefined;
    
    try {
      switch (service) {
        case 'youtube':
          await this.checkYouTubeHealth();
          break;
        case 'gemini':
          await this.checkGeminiHealth();
          break;
        case 'revid':
          await this.checkRevIDHealth();
          break;
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    } catch (err) {
      status = 'unhealthy';
      error = err instanceof Error ? err.message : 'Unknown error';
    }
    
    const responseTime = Date.now() - startTime;
    
    // Calculate uptime
    const uptime = await this.calculateUptime(service);
    
    // Determine status based on response time and recent errors
    if (status === 'healthy' && responseTime > 10000) { // 10 seconds
      status = 'degraded';
    }
    
    const healthStatus: ServiceHealthStatus = {
      service,
      status,
      responseTime,
      lastChecked: new Date(),
      error,
      uptime
    };
    
    // Store health status
    await this.storeHealthStatus(healthStatus);
    
    return healthStatus;
  }
  
  private async checkYouTubeHealth(): Promise<void> {
    const response = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=test&key=' + process.env.YOUTUBE_API_KEY);
    if (!response.ok) {
      throw new Error(`YouTube API health check failed: ${response.status}`);
    }
  }
  
  private async checkGeminiHealth(): Promise<void> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Health check' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Gemini API health check failed: ${response.status}`);
    }
  }
  
  private async checkRevIDHealth(): Promise<void> {
    const response = await fetch('https://api.revid.ai/v1/voices', {
      headers: { 'Authorization': `Bearer ${process.env.REVID_API_KEY}` }
    });
    if (!response.ok) {
      throw new Error(`RevID API health check failed: ${response.status}`);
    }
  }
  
  async getOverallHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealthStatus[];
    summary: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  }> {
    const serviceStatuses = await Promise.all(
      this.services.map(service => this.getLatestHealthStatus(service))
    );
    
    const summary = {
      healthy: serviceStatuses.filter(s => s.status === 'healthy').length,
      degraded: serviceStatuses.filter(s => s.status === 'degraded').length,
      unhealthy: serviceStatuses.filter(s => s.status === 'unhealthy').length
    };
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      services: serviceStatuses,
      summary
    };
  }
  
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const service of this.services) {
        try {
          await this.checkServiceHealth(service);
        } catch (error) {
          console.error(`Health check failed for ${service}:`, error);
        }
      }
    }, this.CHECK_INTERVAL);
  }
}
```

**[ ] TASK**: Implement comprehensive integration testing suite with mock services
**[ ] TASK**: Create monitoring dashboards for all external API integrations
**[ ] TASK**: Set up automated alerts for integration failures and degraded performance
**[ ] TASK**: Build integration documentation with API examples and troubleshooting guides
**[ ] TASK**: Implement integration performance optimization and caching strategies