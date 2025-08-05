import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    youtubeChannelId: v.optional(v.string()),
    youtubeRefreshToken: v.optional(v.string()),
    role: v.optional(v.string()), // 'user' | 'admin'
    preferences: v.optional(v.object({
      emailNotifications: v.optional(v.boolean()),
      pushNotifications: v.optional(v.boolean()),
      notificationTypes: v.optional(v.object({
        videoPublished: v.optional(v.boolean()),
        videoFailed: v.optional(v.boolean()),
        bulkOperations: v.optional(v.boolean()),
        systemAlerts: v.optional(v.boolean()),
        weeklyReports: v.optional(v.boolean()),
        quotaWarnings: v.optional(v.boolean()),
      })),
      theme: v.optional(v.string()),
      language: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  videoIdeas: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("script_generated"),
      v.literal("video_creating"),
      v.literal("video_completed"),
      v.literal("uploading"),
      v.literal("generating_seo"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("pending_retry"),
      v.literal("unrecoverable")
    ),
    generatedFromAnalysis: v.object({
      topVideos: v.array(v.object({
        videoId: v.string(),
        title: v.string(),
        views: v.number(),
        watchTime: v.number(),
        ctr: v.number(),
        subscribers: v.number(),
        performanceScore: v.number(),
      })),
      analysisDate: v.number(),
    }),
    script: v.optional(v.string()),
    revidJobId: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    youtubeVideoId: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    seoData: v.optional(v.object({
      optimizedTitle: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
    })),
    error: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    lastRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduled_date", ["scheduledDate"]),

  youtubeAnalytics: defineTable({
    userId: v.id("users"),
    videoId: v.string(),
    title: v.string(),
    views: v.number(),
    watchTime: v.number(),
    ctr: v.number(),
    subscribers: v.number(),
    performanceScore: v.number(),
    publishedAt: v.number(),
    analyzedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_performance", ["performanceScore"])
    .index("by_published_date", ["publishedAt"]),

  systemLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("info")),
    message: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_status", ["status"]),

  videoAnalytics: defineTable({
    userId: v.id("users"),
    youtubeVideoId: v.string(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_video", ["youtubeVideoId"])
    .index("by_timestamp", ["timestamp"]),

  performanceInsights: defineTable({
    userId: v.id("users"),
    insights: v.array(v.string()),
    recommendations: v.array(v.string()),
    trendsAnalysis: v.object({
      viewsTrend: v.string(),
      engagementTrend: v.string(),
      contentPerformance: v.string(),
    }),
    generatedAt: v.number(),
    dataTimeframe: v.string(),
  }).index("by_user", ["userId"])
    .index("by_generated_at", ["generatedAt"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("success"), v.literal("warning"), v.literal("error"), v.literal("info")),
    event: v.string(),
    data: v.any(),
    read: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_read", ["read"])
    .index("by_created_at", ["createdAt"]),
});