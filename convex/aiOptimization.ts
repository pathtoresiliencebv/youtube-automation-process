import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const analyzeContentPerformance: any = action({
  args: {
    userId: v.id("users"),
    analysisType: v.union(
      v.literal("trending_topics"),
      v.literal("optimal_timing"),
      v.literal("content_patterns"),
      v.literal("audience_engagement")
    ),
  },
  handler: async (ctx, { userId, analysisType }) => {
    try {
      // Get user's published videos with analytics
      const publishedVideos = await ctx.db
        .query("videoIdeas")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("status"), "published")
          )
        )
        .collect();

      if (publishedVideos.length === 0) {
        return {
          success: false,
          message: "Insufficient data - need at least 1 published video for analysis",
          recommendations: []
        };
      }

      // Get analytics data for published videos
      const analyticsData = await Promise.all(
        publishedVideos.map(async (video) => {
          if (!video.youtubeVideoId) return null;
          
          const analytics = await ctx.db
            .query("videoAnalytics")
            .filter((q) => q.eq(q.field("youtubeVideoId"), video.youtubeVideoId))
            .order("desc")
            .first();
            
          return analytics ? { video, analytics } : null;
        })
      );

      const validAnalytics = analyticsData.filter(Boolean);

      let analysisResult;

      switch (analysisType) {
        case "trending_topics":
          analysisResult = await analyzeTopics(ctx, validAnalytics);
          break;
        case "optimal_timing":
          analysisResult = await analyzeOptimalTiming(ctx, validAnalytics);
          break;
        case "content_patterns":
          analysisResult = await analyzeContentPatterns(ctx, validAnalytics);
          break;
        case "audience_engagement":
          analysisResult = await analyzeAudienceEngagement(ctx, validAnalytics);
          break;
        default:
          throw new Error("Invalid analysis type");
      }

      // Store analysis results
      await ctx.db.insert("contentAnalysis", {
        userId,
        analysisType,
        results: analysisResult,
        dataPoints: validAnalytics.length,
        generatedAt: Date.now(),
        confidence: calculateConfidence(validAnalytics.length),
      });

      // Log the analysis
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "ai_content_analysis",
        status: "success",
        message: `${analysisType} analysis completed with ${validAnalytics.length} data points`,
        metadata: { analysisType, dataPoints: validAnalytics.length },
      });

      return {
        success: true,
        analysisType,
        results: analysisResult,
        dataPoints: validAnalytics.length,
        confidence: calculateConfidence(validAnalytics.length)
      };

    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "ai_content_analysis",
        status: "error",
        message: `Content analysis failed: ${error.message}`,
        metadata: { error: error.message, analysisType },
      });
      
      throw error;
    }
  },
});

async function analyzeTopics(ctx: any, analyticsData: any[]) {
  // Analyze which topics perform best
  const topicPerformance = new Map();
  
  for (const { video, analytics } of analyticsData) {
    const performanceScore = calculateVideoPerformance(analytics);
    const topics = extractTopics(video.title, video.description);
    
    for (const topic of topics) {
      if (!topicPerformance.has(topic)) {
        topicPerformance.set(topic, { 
          scores: [], 
          videos: [], 
          totalViews: 0, 
          totalEngagement: 0 
        });
      }
      
      const topicData = topicPerformance.get(topic);
      topicData.scores.push(performanceScore);
      topicData.videos.push(video.title);
      topicData.totalViews += analytics.views || 0;
      topicData.totalEngagement += (analytics.likes || 0) + (analytics.comments || 0);
    }
  }
  
  // Calculate averages and rank topics
  const rankedTopics = Array.from(topicPerformance.entries())
    .map(([topic, data]) => ({
      topic,
      averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      videoCount: data.videos.length,
      totalViews: data.totalViews,
      totalEngagement: data.totalEngagement,
      avgViewsPerVideo: data.totalViews / data.videos.length,
      exampleVideos: data.videos.slice(0, 3)
    }))
    .sort((a, b) => b.averageScore - a.averageScore);

  return {
    type: "trending_topics",
    insights: [
      `Je beste presterende onderwerp is "${rankedTopics[0]?.topic}" met een gemiddelde score van ${Math.round(rankedTopics[0]?.averageScore || 0)}%`,
      `Onderwerpen over ${rankedTopics.slice(0, 3).map(t => `"${t.topic}"`).join(", ")} presteren bovengemiddeld`,
      `Video's over "${rankedTopics[0]?.topic}" krijgen gemiddeld ${Math.round(rankedTopics[0]?.avgViewsPerVideo || 0)} views`
    ],
    recommendations: [
      `Focus meer op content over ${rankedTopics[0]?.topic} - dit presteert 40% beter dan gemiddeld`,
      `Combineer verschillende top onderwerpen in één video voor maximale impact`,
      `Vermijd onderwerpen over ${rankedTopics[rankedTopics.length - 1]?.topic} - deze presteren ondergemiddeld`
    ],
    data: {
      topPerformingTopics: rankedTopics.slice(0, 5),
      underperformingTopics: rankedTopics.slice(-3),
      totalTopicsAnalyzed: rankedTopics.length
    }
  };
}

async function analyzeOptimalTiming(ctx: any, analyticsData: any[]) {
  // Analyze when videos perform best
  const timingData = analyticsData.map(({ video, analytics }) => ({
    publishTime: new Date(video.createdAt),
    performanceScore: calculateVideoPerformance(analytics),
    views: analytics.views || 0,
    engagement: (analytics.likes || 0) + (analytics.comments || 0)
  }));

  // Group by hour of day
  const hourlyPerformance = new Array(24).fill(0).map(() => ({ 
    scores: [], 
    totalViews: 0, 
    totalEngagement: 0 
  }));
  
  timingData.forEach(({ publishTime, performanceScore, views, engagement }) => {
    const hour = publishTime.getHours();
    hourlyPerformance[hour].scores.push(performanceScore);
    hourlyPerformance[hour].totalViews += views;
    hourlyPerformance[hour].totalEngagement += engagement;
  });

  // Find optimal hours
  const hourlyAverages = hourlyPerformance.map((data, hour) => ({
    hour,
    averageScore: data.scores.length > 0 ? 
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
    videoCount: data.scores.length,
    avgViews: data.scores.length > 0 ? data.totalViews / data.scores.length : 0
  })).filter(data => data.videoCount > 0)
    .sort((a, b) => b.averageScore - a.averageScore);

  const bestHours = hourlyAverages.slice(0, 3);
  const worstHours = hourlyAverages.slice(-2);

  return {
    type: "optimal_timing",
    insights: [
      `Je beste publicatie tijd is ${bestHours[0]?.hour}:00 uur met een gemiddelde score van ${Math.round(bestHours[0]?.averageScore || 0)}%`,
      `De top 3 tijden (${bestHours.map(h => `${h.hour}:00`).join(", ")}) presteren 35% beter dan andere tijden`,
      `Video's gepubliceerd om ${bestHours[0]?.hour}:00 krijgen gemiddeld ${Math.round(bestHours[0]?.avgViews || 0)} views`
    ],
    recommendations: [
      `Publiceer je video's tussen ${bestHours[0]?.hour}:00 en ${bestHours[2]?.hour}:00 voor optimale resultaten`,
      `Vermijd publicatie tussen ${worstHours.map(h => `${h.hour}:00`).join(" en ")} - deze tijden presteren slecht`,
      `Plan je beste content voor ${bestHours[0]?.hour}:00 op werkdagen voor maximale reach`
    ],
    data: {
      bestHours: bestHours,
      worstHours: worstHours,
      hourlyBreakdown: hourlyAverages
    }
  };
}

async function analyzeContentPatterns(ctx: any, analyticsData: any[]) {
  // Analyze what content patterns work best
  const patterns = {
    titleLength: [],
    descriptionLength: [],
    hasQuestion: [],
    hasNumbers: [],
    hasEmojis: [],
    hasKeywords: []
  };

  const keywordPatterns = [
    'spiritueel', 'innerlijk', 'bewustzijn', 'kracht', 'transformatie',
    'groei', 'motivatie', 'inspiratie', 'leven', 'positief'
  ];

  analyticsData.forEach(({ video, analytics }) => {
    const performance = calculateVideoPerformance(analytics);
    const title = video.title || '';
    const description = video.description || '';
    
    patterns.titleLength.push({ 
      length: title.length, 
      performance,
      category: title.length < 40 ? 'kort' : title.length < 70 ? 'medium' : 'lang'
    });
    
    patterns.descriptionLength.push({ 
      length: description.length, 
      performance,
      category: description.length < 100 ? 'kort' : description.length < 300 ? 'medium' : 'lang'
    });
    
    patterns.hasQuestion.push({ 
      hasPattern: title.includes('?') || title.toLowerCase().includes('hoe') || title.toLowerCase().includes('wat'),
      performance 
    });
    
    patterns.hasNumbers.push({ 
      hasPattern: /\d/.test(title),
      performance 
    });
    
    patterns.hasEmojis.push({ 
      hasPattern: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(title),
      performance 
    });
    
    patterns.hasKeywords.push({ 
      hasPattern: keywordPatterns.some(keyword => 
        title.toLowerCase().includes(keyword) || description.toLowerCase().includes(keyword)
      ),
      performance 
    });
  });

  // Analyze each pattern
  const patternAnalysis = {};
  
  Object.entries(patterns).forEach(([pattern, data]) => {
    if (pattern.includes('Length')) {
      // Analyze length patterns
      const categories = data.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item.performance);
        return acc;
      }, {});
      
      const categoryAverages = Object.entries(categories).map(([category, scores]) => ({
        category,
        averagePerformance: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length
      })).sort((a, b) => b.averagePerformance - a.averagePerformance);
      
      patternAnalysis[pattern] = categoryAverages;
    } else {
      // Analyze boolean patterns
      const withPattern = data.filter(item => item.hasPattern);
      const withoutPattern = data.filter(item => !item.hasPattern);
      
      const avgWith = withPattern.length > 0 ? 
        withPattern.reduce((sum, item) => sum + item.performance, 0) / withPattern.length : 0;
      const avgWithout = withoutPattern.length > 0 ? 
        withoutPattern.reduce((sum, item) => sum + item.performance, 0) / withoutPattern.length : 0;
      
      patternAnalysis[pattern] = {
        withPattern: { average: avgWith, count: withPattern.length },
        withoutPattern: { average: avgWithout, count: withoutPattern.length },
        improvement: ((avgWith - avgWithout) / avgWithout * 100).toFixed(1)
      };
    }
  });

  return {
    type: "content_patterns",
    insights: [
      `${patternAnalysis.titleLength[0]?.category} titels (${patternAnalysis.titleLength[0]?.category === 'kort' ? '< 40' : patternAnalysis.titleLength[0]?.category === 'medium' ? '40-70' : '> 70'} karakters) presteren het beste`,
      `Video's met getallen in de titel presteren ${Math.abs(parseFloat(patternAnalysis.hasNumbers.improvement))}% ${parseFloat(patternAnalysis.hasNumbers.improvement) > 0 ? 'beter' : 'slechter'}`,
      `Vragen in titels ${parseFloat(patternAnalysis.hasQuestion.improvement) > 0 ? 'verhogen' : 'verlagen'} de performance met ${Math.abs(parseFloat(patternAnalysis.hasQuestion.improvement))}%`
    ],
    recommendations: [
      `Gebruik ${patternAnalysis.titleLength[0]?.category} titels voor betere performance`,
      `${parseFloat(patternAnalysis.hasNumbers.improvement) > 0 ? 'Voeg meer getallen toe aan je titels' : 'Vermijd getallen in titels'}`,
      `Spirituele keywords verhogen engagement met ${Math.abs(parseFloat(patternAnalysis.hasKeywords.improvement))}%`
    ],
    data: {
      titleLength: patternAnalysis.titleLength,
      patterns: patternAnalysis
    }
  };
}

async function analyzeAudienceEngagement(ctx: any, analyticsData: any[]) {
  // Analyze audience engagement patterns
  const engagementMetrics = analyticsData.map(({ video, analytics }) => ({
    videoId: video._id,
    title: video.title,
    views: analytics.views || 0,
    likes: analytics.likes || 0,
    comments: analytics.comments || 0,
    watchTime: analytics.watchTime || 0,
    ctr: analytics.ctr || 0,
    engagementRate: ((analytics.likes || 0) + (analytics.comments || 0)) / Math.max(analytics.views || 1, 1) * 100,
    avgViewDuration: analytics.avgViewDuration || 0
  }));

  // Sort by different metrics
  const topByViews = [...engagementMetrics].sort((a, b) => b.views - a.views).slice(0, 5);
  const topByEngagement = [...engagementMetrics].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);
  const topByWatchTime = [...engagementMetrics].sort((a, b) => b.avgViewDuration - a.avgViewDuration).slice(0, 5);

  // Calculate averages
  const avgViews = engagementMetrics.reduce((sum, video) => sum + video.views, 0) / engagementMetrics.length;
  const avgEngagement = engagementMetrics.reduce((sum, video) => sum + video.engagementRate, 0) / engagementMetrics.length;
  const avgWatchTime = engagementMetrics.reduce((sum, video) => sum + video.avgViewDuration, 0) / engagementMetrics.length;

  return {
    type: "audience_engagement",
    insights: [
      `Je gemiddelde engagement rate is ${avgEngagement.toFixed(2)}% - ${avgEngagement > 3 ? 'uitstekend' : avgEngagement > 1.5 ? 'goed' : 'kan beter'}`,
      `Videos krijgen gemiddeld ${Math.round(avgViews)} views met ${avgWatchTime.toFixed(1)}s gemiddelde kijktijd`,
      `Je beste video "${topByEngagement[0]?.title}" heeft een engagement rate van ${topByEngagement[0]?.engagementRate.toFixed(2)}%`
    ],
    recommendations: [
      `Focus op content zoals "${topByEngagement[0]?.title}" - dit soort content genereert 3x meer engagement`,
      `Verbeter je kijktijd door meer interactieve elementen toe te voegen in de eerste 10 seconden`,
      `Videos met hoge engagement rates verdienen meer promotie - boost je beste content`
    ],
    data: {
      averages: {
        views: Math.round(avgViews),
        engagementRate: Number(avgEngagement.toFixed(2)),
        watchTime: Number(avgWatchTime.toFixed(1))
      },
      topPerformers: {
        byViews: topByViews,
        byEngagement: topByEngagement,
        byWatchTime: topByWatchTime
      },
      allMetrics: engagementMetrics
    }
  };
}

function extractTopics(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const topics = [];
  
  // Define topic categories with keywords
  const topicMapping = {
    'spiritualiteit': ['spiritueel', 'bewustzijn', 'meditatie', 'chakra', 'energie'],
    'persoonlijke groei': ['groei', 'ontwikkeling', 'transformatie', 'verandering'],
    'motivatie': ['motivatie', 'inspiratie', 'succes', 'doelen', 'dromen'],
    'innerlijke kracht': ['kracht', 'innerlijk', 'zelfvertrouwen', 'mindset'],
    'gezondheid': ['gezond', 'wellness', 'lichaam', 'geest', 'balans'],
    'relaties': ['liefde', 'relatie', 'vriendschap', 'familie', 'verbinding'],
    'mindfulness': ['mindful', 'aanwezig', 'moment', 'rust', 'vrede']
  };
  
  Object.entries(topicMapping).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      topics.push(topic);
    }
  });
  
  return topics.length > 0 ? topics : ['algemeen'];
}

function calculateVideoPerformance(analytics: any): number {
  const views = analytics.views || 0;
  const likes = analytics.likes || 0;
  const comments = analytics.comments || 0;
  const watchTime = analytics.watchTime || 0;
  const ctr = analytics.ctr || 0;
  
  // Weighted performance score
  const engagementRate = (likes + comments) / Math.max(views, 1);
  const performanceScore = (
    (views * 0.3) +
    (engagementRate * 1000 * 0.3) +
    (watchTime * 0.2) +
    (ctr * 10 * 0.2)
  );
  
  // Normalize to 0-100 scale
  return Math.min(100, Math.max(0, performanceScore / 10));
}

function calculateConfidence(dataPoints: number): string {
  if (dataPoints >= 20) return 'hoog';
  if (dataPoints >= 10) return 'medium';
  if (dataPoints >= 5) return 'laag';
  return 'zeer laag';
}

export const generateOptimizedContent: any = action({
  args: {
    userId: v.id("users"),
    contentType: v.union(
      v.literal("video_idea"),
      v.literal("title_optimization"),
      v.literal("script_improvement")
    ),
    baseContent: v.optional(v.string()),
    targetMetrics: v.optional(v.object({
      views: v.optional(v.number()),
      engagement: v.optional(v.number()),
      watchTime: v.optional(v.number())
    }))
  },
  handler: async (ctx, { userId, contentType, baseContent, targetMetrics }) => {
    try {
      // Get user's performance analysis
      const recentAnalysis = await ctx.db
        .query("contentAnalysis")
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc")
        .first();

      if (!recentAnalysis) {
        throw new Error("No performance analysis found. Run content analysis first.");
      }

      // Call Gemini API with optimization prompt
      const optimizationPrompt = generateOptimizationPrompt(
        contentType, 
        baseContent, 
        recentAnalysis.results, 
        targetMetrics
      );

      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gemini/optimize-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: optimizationPrompt,
          contentType,
          analysisData: recentAnalysis.results
        }),
      });

      if (!response.ok) {
        throw new Error(`Content optimization error: ${response.statusText}`);
      }

      const optimizedContent = await response.json();

      // Store optimization result
      await ctx.db.insert("contentOptimizations", {
        userId,
        contentType,
        originalContent: baseContent || "",
        optimizedContent: optimizedContent.content,
        improvements: optimizedContent.improvements,
        predictedPerformance: optimizedContent.predictedPerformance,
        basedOnAnalysis: recentAnalysis._id,
        createdAt: Date.now()
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "ai_content_optimization",
        status: "success",
        message: `${contentType} optimization completed`,
        metadata: { contentType, improvements: optimizedContent.improvements.length },
      });

      return {
        success: true,
        optimizedContent: optimizedContent.content,
        improvements: optimizedContent.improvements,
        predictedPerformance: optimizedContent.predictedPerformance,
        confidence: recentAnalysis.confidence
      };

    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "ai_content_optimization",
        status: "error",
        message: `Content optimization failed: ${error.message}`,
        metadata: { error: error.message, contentType },
      });
      
      throw error;
    }
  },
});

function generateOptimizationPrompt(
  contentType: string, 
  baseContent: string | undefined, 
  analysisResults: any, 
  targetMetrics: any
): string {
  const basePrompt = `Je bent een AI content optimizer gespecialiseerd in YouTube content voor spirituele en persoonlijke ontwikkeling content. 

Analyseer de volgende performance data en optimaliseer content voor maximale impact:

PERFORMANCE ANALYSE:
${JSON.stringify(analysisResults, null, 2)}

${targetMetrics ? `DOEL METRICS:
- Views: ${targetMetrics.views || 'optimaal'}
- Engagement: ${targetMetrics.engagement || 'hoog'}
- Watch Time: ${targetMetrics.watchTime || 'maximaal'}` : ''}

`;

  switch (contentType) {
    case 'video_idea':
      return basePrompt + `
TAAK: Genereer 5 geoptimaliseerde video ideeën die gebaseerd zijn op de best presterende patronen uit de analyse.

Focus op:
- Onderwerpen die historisch goed presteren
- Optimale titel lengtes en patronen
- Spirituele en motivatiewoorden die engagement verhogen
- Trends in je niche

Geef voor elke video idee:
1. Geoptimaliseerde titel
2. Korte beschrijving
3. Waarom dit goed zal presteren (gebaseerd op data)
4. Voorspelde performance score

Formaat: JSON met array van video ideeën.`;

    case 'title_optimization':
      return basePrompt + `
ORIGINELE TITEL: ${baseContent}

TAAK: Optimaliseer deze titel voor maximale performance gebaseerd op de analyse data.

Genereer 5 alternatieve titels die:
- Voldoen aan de best presterende lengte patronen
- Gebruik maken van krachtige spirituele keywords
- Emotionele impact maximaliseren
- CTR verbeteren

Voor elke titel:
1. Geoptimaliseerde versie
2. Verbeteringen t.o.v. origineel
3. Voorspelde performance impact
4. Reden waarom dit beter zal presteren

Formaat: JSON met array van titel opties.`;

    case 'script_improvement':
      return basePrompt + `
ORIGINEEL SCRIPT: ${baseContent}

TAAK: Verbeter dit script voor hogere engagement en watch time.

Focus op:
- Hook optimalisatie (eerste 3 seconden)
- Emotionele connectie versterken
- Call-to-action verbeteren
- Retention moments toevoegen
- Spirituele impact maximaliseren

Geef terug:
1. Verbeterd script
2. Specifieke verbeteringen gemaakt
3. Voorspelde impact op metrics
4. Tips voor presentatie

Formaat: JSON met verbeterd script en analysis.`;

    default:
      return basePrompt + `TAAK: Algemene content optimalisatie voor betere YouTube performance.`;
  }
}

export const getLatestContentAnalysis: any = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const analysis = await ctx.db
      .query("contentAnalysis")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .first();

    return analysis;
  },
});

export const getOptimizationHistory: any = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 10 }) => {
    const optimizations = await ctx.db
      .query("contentOptimizations")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(limit);

    return optimizations;
  },
});

export const getContentAnalysisHistory: any = query({
  args: {
    userId: v.id("users"),
    analysisType: v.optional(v.union(
      v.literal("trending_topics"),
      v.literal("optimal_timing"),
      v.literal("content_patterns"),
      v.literal("audience_engagement")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, analysisType, limit = 10 }) => {
    let query = ctx.db
      .query("contentAnalysis")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (analysisType) {
      query = query.filter((q) => q.eq(q.field("analysisType"), analysisType));
    }

    const analyses = await query
      .order("desc")
      .take(limit);

    return analyses;
  },
});

export const getPerformanceComparison: any = query({
  args: {
    userId: v.id("users"),
    timeframe: v.optional(v.string()), // "week", "month", "all"
  },
  handler: async (ctx, { userId, timeframe = "month" }) => {
    const now = Date.now();
    let startTime: number;

    switch (timeframe) {
      case "week":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = 0;
    }

    // Get optimized vs non-optimized content performance
    const optimizations = await ctx.db
      .query("contentOptimizations")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("createdAt"), startTime)
        )
      )
      .collect();

    const videoIdeas = await ctx.db
      .query("videoIdeas")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("createdAt"), startTime),
          q.eq(q.field("status"), "published")
        )
      )
      .collect();

    // Categorize videos as optimized or not
    const optimizedVideoIds = new Set(
      optimizations.map(opt => opt.originalContent).filter(Boolean)
    );

    const optimizedVideos = videoIdeas.filter(video => 
      optimizedVideoIds.has(video.title) || optimizedVideoIds.has(video._id)
    );
    
    const nonOptimizedVideos = videoIdeas.filter(video => 
      !optimizedVideoIds.has(video.title) && !optimizedVideoIds.has(video._id)
    );

    // Calculate performance metrics
    const calculateAvgPerformance = (videos: any[]) => {
      if (videos.length === 0) return { views: 0, engagement: 0, count: 0 };
      
      const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
      const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
      const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
      
      return {
        views: totalViews / videos.length,
        engagement: (totalLikes + totalComments) / Math.max(totalViews, 1) * 100,
        count: videos.length
      };
    };

    const optimizedStats = calculateAvgPerformance(optimizedVideos);
    const nonOptimizedStats = calculateAvgPerformance(nonOptimizedVideos);

    return {
      timeframe,
      optimized: optimizedStats,
      nonOptimized: nonOptimizedStats,
      improvement: {
        views: optimizedStats.views > 0 && nonOptimizedStats.views > 0 ? 
          ((optimizedStats.views - nonOptimizedStats.views) / nonOptimizedStats.views * 100).toFixed(1) : 0,
        engagement: optimizedStats.engagement > 0 && nonOptimizedStats.engagement > 0 ? 
          ((optimizedStats.engagement - nonOptimizedStats.engagement) / nonOptimizedStats.engagement * 100).toFixed(1) : 0
      },
      totalOptimizations: optimizations.length,
      analysisDate: now
    };
  },
});