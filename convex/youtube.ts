import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const analyzeTopVideos = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.runQuery(internal.users.getUserById, { userId });
    
    if (!user?.youtubeChannelId || !user?.youtubeRefreshToken) {
      throw new Error("YouTube credentials not found");
    }

    try {
      // Call external YouTube API
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: user.youtubeChannelId,
          refreshToken: user.youtubeRefreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store analytics data
      for (const video of data.topVideos) {
        await ctx.runMutation(internal.youtube.storeAnalytics, {
          userId,
          videoData: video,
        });
      }

      // Log the action
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "youtube_analysis",
        status: "success",
        message: `Analyzed ${data.topVideos.length} top videos`,
        metadata: { videoCount: data.topVideos.length },
      });

      return data;
    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "youtube_analysis",
        status: "error",
        message: `YouTube analysis failed: ${error.message}`,
        metadata: { error: error.message },
      });
      throw error;
    }
  },
});

export const storeAnalytics = internalMutation({
  args: {
    userId: v.id("users"),
    videoData: v.object({
      videoId: v.string(),
      title: v.string(),
      views: v.number(),
      watchTime: v.number(),
      ctr: v.number(),
      subscribers: v.number(),
      performanceScore: v.number(),
      publishedAt: v.number(),
    }),
  },
  handler: async (ctx, { userId, videoData }) => {
    // Check if analytics already exist
    const existing = await ctx.db
      .query("youtubeAnalytics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("videoId"), videoData.videoId))
      .unique();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        ...videoData,
        analyzedAt: Date.now(),
      });
    } else {
      // Create new record
      await ctx.db.insert("youtubeAnalytics", {
        userId,
        ...videoData,
        analyzedAt: Date.now(),
      });
    }
  },
});

export const getTopVideos = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 10 }) => {
    return await ctx.db
      .query("youtubeAnalytics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

export const uploadVideo = action({
  args: {
    userId: v.id("users"),
    ideaId: v.id("videoIdeas"),
    videoUrl: v.string(),
    title: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    scheduledDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getUserById, { userId: args.userId });
    
    if (!user?.youtubeChannelId || !user?.youtubeRefreshToken) {
      throw new Error("YouTube credentials not found");
    }

    try {
      const response = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: user.youtubeChannelId,
          refreshToken: user.youtubeRefreshToken,
          videoUrl: args.videoUrl,
          title: args.title,
          description: args.description,
          tags: args.tags,
          scheduledDate: new Date(args.scheduledDate).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`YouTube upload error: ${response.statusText}`);
      }

      const data = await response.json();

      // Update video idea with YouTube video ID
      await ctx.runMutation(internal.videoIdeas.updateStatus, {
        ideaId: args.ideaId,
        status: "scheduled",
        youtubeVideoId: data.videoId,
        scheduledDate: args.scheduledDate,
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: args.userId,
        action: "youtube_upload",
        status: "success",
        message: `Video uploaded and scheduled: ${args.title}`,
        metadata: { youtubeVideoId: data.videoId, scheduledDate: args.scheduledDate },
      });

      return data;
    } catch (error) {
      await ctx.runMutation(internal.videoIdeas.updateStatus, {
        ideaId: args.ideaId,
        status: "failed",
        error: error.message,
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: args.userId,
        action: "youtube_upload",
        status: "error",
        message: `YouTube upload failed: ${error.message}`,
        metadata: { error: error.message },
      });

      throw error;
    }
  },
});