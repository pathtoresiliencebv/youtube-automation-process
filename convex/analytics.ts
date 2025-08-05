import { v } from "convex/values";
import { action, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const trackVideoPerformance: any = action({
  args: {
    userId: v.id("users"),
    youtubeVideoId: v.string(),
  },
  handler: async (ctx, { userId, youtubeVideoId }) => {
    try {
      // Get user YouTube credentials
      const user = await ctx.db.get(userId);
      if (!user?.youtubeRefreshToken) {
        throw new Error("User YouTube credentials not found");
      }

      // Call YouTube Analytics API to get performance data
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: youtubeVideoId,
          refreshToken: user.youtubeRefreshToken,
          channelId: user.youtubeChannelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.statusText}`);
      }

      const analyticsData = await response.json();

      // Store analytics data
      await ctx.runMutation(internal.analytics.storeAnalytics, {
        userId,
        youtubeVideoId,
        analyticsData: {
          views: analyticsData.views || 0,
          likes: analyticsData.likes || 0,
          comments: analyticsData.comments || 0,
          shares: analyticsData.shares || 0,
          watchTime: analyticsData.watchTime || 0,
          ctr: analyticsData.ctr || 0,
          avgViewDuration: analyticsData.avgViewDuration || 0,
          subscribersGained: analyticsData.subscribersGained || 0,
          revenue: analyticsData.revenue || 0,
          impressions: analyticsData.impressions || 0,
          timestamp: Date.now(),
        },
      });

      // Calculate performance score
      const performanceScore = calculatePerformanceScore(analyticsData);
      
      // Update video idea with performance data
      const videoIdea = await ctx.db
        .query("videoIdeas")
        .filter((q) => q.eq(q.field("youtubeVideoId"), youtubeVideoId))
        .unique();

      if (videoIdea) {
        await ctx.db.patch(videoIdea._id, {
          performanceScore,
          views: analyticsData.views || 0,
          updatedAt: Date.now(),
        });
      }

      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "track_video_performance",
        status: "success",
        message: `Performance tracked for video: ${youtubeVideoId}`,
        metadata: { youtubeVideoId, performanceScore, analyticsData },
      });

      return { performanceScore, analyticsData };
    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "track_video_performance",
        status: "error",
        message: `Performance tracking failed: ${error.message}`,
        metadata: { youtubeVideoId, error: error.message },
      });

      throw error;
    }
  },
});

export const storeAnalytics: any = internalMutation({
  args: {
    userId: v.id("users"),
    youtubeVideoId: v.string(),
    analyticsData: v.object({
      views: v.number(),
      likes: v.number(),
      comments: v.number(),
      shares: v.number(),
      watchTime: v.number(),
      ctr: v.number(),
      avgViewDuration: v.number(),
      subscribersGained: v.number(),
      revenue: v.number(),
      impressions: v.number(),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, { userId, youtubeVideoId, analyticsData }) => {
    // Check if analytics entry already exists for this time period
    const existingEntry = await ctx.db
      .query("videoAnalytics")
      .filter((q) => 
        q.and(
          q.eq(q.field("youtubeVideoId"), youtubeVideoId),
          q.gt(q.field("timestamp"), analyticsData.timestamp - 24 * 60 * 60 * 1000) // Within 24 hours
        )
      )
      .unique();

    if (existingEntry) {
      // Update existing entry
      await ctx.db.patch(existingEntry._id, {
        ...analyticsData,
        updatedAt: Date.now(),
      });
      return existingEntry._id;
    } else {
      // Create new entry
      return await ctx.db.insert("videoAnalytics", {
        userId,
        youtubeVideoId,
        ...analyticsData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getVideoAnalytics: any = query({
  args: {
    userId: v.id("users"),
    youtubeVideoId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, youtubeVideoId, limit = 50 }) => {
    let query = ctx.db
      .query("videoAnalytics")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (youtubeVideoId) {
      query = query.filter((q) => q.eq(q.field("youtubeVideoId"), youtubeVideoId));
    }

    return await query
      .order("desc")
      .take(limit);
  },
});

export const getAnalyticsSummary: any = query({
  args: {
    userId: v.id("users"),
    timeframe: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"))),
  },
  handler: async (ctx, { userId, timeframe = "30d" }) => {
    const now = Date.now();
    const timeframes = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    const cutoffTime = now - timeframes[timeframe];

    const analytics = await ctx.db
      .query("videoAnalytics")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.gt(q.field("timestamp"), cutoffTime)
        )
      )
      .collect();

    if (analytics.length === 0) {
      return {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalWatchTime: 0,
        avgCTR: 0,
        avgViewDuration: 0,
        totalSubscribersGained: 0,
        totalRevenue: 0,
        videoCount: 0,
        topPerformingVideos: [],
        growthTrend: [],
      };
    }

    // Aggregate data
    const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);
    const totalLikes = analytics.reduce((sum, a) => sum + a.likes, 0);
    const totalComments = analytics.reduce((sum, a) => sum + a.comments, 0);
    const totalWatchTime = analytics.reduce((sum, a) => sum + a.watchTime, 0);
    const avgCTR = analytics.reduce((sum, a) => sum + a.ctr, 0) / analytics.length;
    const avgViewDuration = analytics.reduce((sum, a) => sum + a.avgViewDuration, 0) / analytics.length;
    const totalSubscribersGained = analytics.reduce((sum, a) => sum + a.subscribersGained, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);

    // Get top performing videos
    const topPerformingVideos = analytics
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map(a => ({
        youtubeVideoId: a.youtubeVideoId,
        views: a.views,
        likes: a.likes,
        ctr: a.ctr,
        watchTime: a.watchTime,
      }));

    // Calculate growth trend (weekly aggregates)
    const growthTrend = calculateGrowthTrend(analytics, timeframe);

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTime,
      avgCTR: Math.round(avgCTR * 100) / 100,
      avgViewDuration: Math.round(avgViewDuration),
      totalSubscribersGained,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      videoCount: analytics.length,
      topPerformingVideos,
      growthTrend,
    };
  },
});

export const generatePerformanceInsights: any = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    try {
      // Get recent analytics data
      const summary = await ctx.runQuery(internal.analytics.getAnalyticsSummary, {
        userId,
        timeframe: "30d",
      });

      // Get video ideas for comparison
      const videoIdeas = await ctx.db
        .query("videoIdeas")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("status"), "published")
          )
        )
        .collect();

      // Generate insights using AI
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gemini/generate-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyticsSummary: summary,
          publishedVideos: videoIdeas.slice(0, 10), // Last 10 published videos
        }),
      });

      if (!response.ok) {
        throw new Error(`Insights generation failed: ${response.statusText}`);
      }

      const insights = await response.json();

      // Store insights
      await ctx.db.insert("performanceInsights", {
        userId,
        insights: insights.insights,
        recommendations: insights.recommendations,
        trendsAnalysis: insights.trends,
        generatedAt: Date.now(),
        dataTimeframe: "30d",
      });

      return insights;
    } catch (error) {
      console.error('Generate insights error:', error);
      throw error;
    }
  },
});

// Helper function to calculate performance score
function calculatePerformanceScore(data: any): number {
  const metrics = {
    views: Math.min(data.views / 10000, 1), // Normalize to max 10k views = 1.0
    ctr: Math.min(data.ctr / 10, 1), // Normalize to max 10% CTR = 1.0
    avgViewDuration: Math.min(data.avgViewDuration / 300, 1), // Normalize to max 5 min = 1.0
    likes: Math.min(data.likes / (data.views * 0.05), 1), // 5% like rate = 1.0
    comments: Math.min(data.comments / (data.views * 0.02), 1), // 2% comment rate = 1.0
  };

  const weights = {
    views: 0.3,
    ctr: 0.25,
    avgViewDuration: 0.25,
    likes: 0.1,
    comments: 0.1,
  };

  const score = Object.entries(metrics).reduce((sum, [key, value]) => {
    return sum + (value * weights[key as keyof typeof weights]);
  }, 0);

  return Math.round(score * 100); // Convert to 0-100 scale
}

// Helper function to calculate growth trend
function calculateGrowthTrend(analytics: any[], timeframe: string): any[] {
  const buckets = timeframe === "7d" ? 7 : timeframe === "30d" ? 4 : 12;
  const bucketSize = timeframe === "7d" ? 24 * 60 * 60 * 1000 : // 1 day
                    timeframe === "30d" ? 7 * 24 * 60 * 60 * 1000 : // 1 week
                    7 * 24 * 60 * 60 * 1000; // 1 week for 90d too

  const now = Date.now();
  const trend = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const bucketEnd = now - (i * bucketSize);
    const bucketStart = bucketEnd - bucketSize;

    const bucketData = analytics.filter(a => 
      a.timestamp >= bucketStart && a.timestamp < bucketEnd
    );

    const bucketViews = bucketData.reduce((sum, a) => sum + a.views, 0);
    const bucketWatchTime = bucketData.reduce((sum, a) => sum + a.watchTime, 0);

    trend.push({
      period: new Date(bucketStart).toISOString().split('T')[0],
      views: bucketViews,
      watchTime: bucketWatchTime,
      videoCount: bucketData.length,
    });
  }

  return trend;
}