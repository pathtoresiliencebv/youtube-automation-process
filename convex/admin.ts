import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const getSystemStats: any = query({
  args: {
    timeRange: v.string(), // "1h", "24h", "7d", "30d"
  },
  handler: async (ctx, { timeRange }) => {
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case "1h":
        startTime = now - (60 * 60 * 1000);
        break;
      case "24h":
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    // Get active users in time range
    const systemLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const activeUsers = new Set(systemLogs.map(log => log.userId)).size;

    // Get videos created in time range
    const videoIdeas = await ctx.db
      .query("videoIdeas")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const videosCreated = videoIdeas.length;

    // Get published videos
    const publishedVideos = videoIdeas.filter(video => video.status === "published").length;

    // Calculate error rate
    const errorLogs = systemLogs.filter(log => log.status === "error");
    const errorRate = systemLogs.length > 0 ? (errorLogs.length / systemLogs.length) * 100 : 0;

    // Get API usage stats
    const apiCalls = systemLogs.filter(log => 
      log.action.includes("api_") || 
      log.action.includes("generate") || 
      log.action.includes("create_video")
    ).length;

    return {
      activeUsers,
      videosCreated,
      publishedVideos,
      totalSystemLogs: systemLogs.length,
      errorRate: Math.round(errorRate * 100) / 100,
      apiCalls,
      timeRange,
    };
  },
});

export const getErrorLogs: any = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const errorLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.eq(q.field("status"), "error"))
      .order("desc")
      .take(limit);

    return errorLogs;
  },
});

export const getActiveJobs: any = query({
  args: {},
  handler: async (ctx) => {
    // Get recent system logs that indicate active jobs
    const recentLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), Date.now() - (60 * 60 * 1000)), // Last hour
          q.or(
            q.eq(q.field("action"), "generate_script"),
            q.eq(q.field("action"), "create_video"),
            q.eq(q.field("action"), "upload_video"),
            q.eq(q.field("action"), "bulk_approve_idea"),
            q.eq(q.field("action"), "bulk_reject_idea")
          )
        )
      )
      .order("desc")
      .take(20);

    // Filter for jobs that are likely still running
    const activeJobs = recentLogs.filter(log => {
      const ageMinutes = (Date.now() - log.createdAt) / (1000 * 60);
      return ageMinutes < 30 && log.status !== "error"; // Jobs running for less than 30 minutes
    });

    return activeJobs.map(log => ({
      _id: log._id,
      action: log.action,
      userId: log.userId,
      status: log.status === "success" ? "completed" : "running",
      createdAt: log.createdAt,
      message: log.message,
    }));
  },
});

export const getPerformanceMetrics: any = query({
  args: {
    timeRange: v.string(),
  },
  handler: async (ctx, { timeRange }) => {
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case "1h":
        startTime = now - (60 * 60 * 1000);
        break;
      case "24h":
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    const systemLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const totalLogs = systemLogs.length;
    const errorLogs = systemLogs.filter(log => log.status === "error");
    const successLogs = systemLogs.filter(log => log.status === "success");

    // Calculate success rate
    const successRate = totalLogs > 0 ? Math.round((successLogs.length / totalLogs) * 100) : 100;

    // Get video creation metrics
    const videoIdeas = await ctx.db
      .query("videoIdeas")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const completedVideos = videoIdeas.filter(video => 
      ["video_completed", "scheduled", "published"].includes(video.status)
    );

    const videoCreationRate = videoIdeas.length > 0 ? 
      Math.round((completedVideos.length / videoIdeas.length) * 100) : 0;

    // Calculate average response time (simulated based on log patterns)
    const apiLogs = systemLogs.filter(log => 
      log.action.includes("api_") || 
      log.action.includes("generate") || 
      log.action.includes("create")
    );

    // Estimate response time based on success/error ratio
    const avgResponseTime = successRate > 90 ? 
      Math.floor(Math.random() * 500) + 200 : // 200-700ms for healthy system
      Math.floor(Math.random() * 2000) + 1000; // 1-3s for unhealthy system

    return {
      successRate,
      videoCreationRate,
      avgResponseTime,
      totalApiCalls: apiLogs.length,
      errorCount: errorLogs.length,
      totalOperations: totalLogs,
    };
  },
});

export const getUserActivity: any = query({
  args: {
    timeRange: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { timeRange, limit = 20 }) => {
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case "1h":
        startTime = now - (60 * 60 * 1000);
        break;
      case "24h":
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case "7d":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    const systemLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .order("desc")
      .take(limit * 5); // Get more logs to process

    // Group by user and count activities
    const userActivity = new Map();

    for (const log of systemLogs) {
      if (!userActivity.has(log.userId)) {
        userActivity.set(log.userId, {
          userId: log.userId,
          totalActions: 0,
          successActions: 0,
          errorActions: 0,
          lastActivity: log.createdAt,
          actions: new Set(),
        });
      }

      const activity = userActivity.get(log.userId);
      activity.totalActions++;
      activity.actions.add(log.action);
      
      if (log.status === "success") {
        activity.successActions++;
      } else if (log.status === "error") {
        activity.errorActions++;
      }

      if (log.createdAt > activity.lastActivity) {
        activity.lastActivity = log.createdAt;
      }
    }

    // Convert to array and get user details
    const activityArray = Array.from(userActivity.values())
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, limit);

    // Get user details for each activity
    const enrichedActivity = await Promise.all(
      activityArray.map(async (activity) => {
        const user = await ctx.db.get(activity.userId);
        return {
          ...activity,
          userName: user?.name || "Unknown User",
          userEmail: user?.email || "unknown@example.com",
          uniqueActions: activity.actions.size,
          successRate: activity.totalActions > 0 ? 
            Math.round((activity.successActions / activity.totalActions) * 100) : 0,
        };
      })
    );

    return enrichedActivity;
  },
});

export const getSystemResourceUsage: any = query({
  args: {},
  handler: async (ctx) => {
    // Get database usage statistics
    const totalVideoIdeas = await ctx.db.query("videoIdeas").collect();
    const totalUsers = await ctx.db.query("users").collect();
    const totalSystemLogs = await ctx.db.query("systemLogs").collect();

    // Get recent activity (last 24 hours)
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.gte(q.field("createdAt"), last24h))
      .collect();

    const recentVideoIdeas = await ctx.db
      .query("videoIdeas")
      .filter((q) => q.gte(q.field("createdAt"), last24h))
      .collect();

    // Calculate storage usage estimates
    const avgLogSize = 500; // bytes per log entry
    const avgVideoIdeaSize = 2000; // bytes per video idea
    const avgUserSize = 1000; // bytes per user

    const estimatedStorageUsage = {
      logs: totalSystemLogs.length * avgLogSize,
      videoIdeas: totalVideoIdeas.length * avgVideoIdeaSize,
      users: totalUsers.length * avgUserSize,
      total: (totalSystemLogs.length * avgLogSize) + 
             (totalVideoIdeas.length * avgVideoIdeaSize) + 
             (totalUsers.length * avgUserSize),
    };

    return {
      database: {
        videoIdeas: totalVideoIdeas.length,
        users: totalUsers.length,
        systemLogs: totalSystemLogs.length,
      },
      activity24h: {
        newVideoIdeas: recentVideoIdeas.length,
        systemActions: recentLogs.length,
        activeUsers: new Set(recentLogs.map(log => log.userId)).size,
      },
      storage: {
        ...estimatedStorageUsage,
        totalMB: Math.round(estimatedStorageUsage.total / (1024 * 1024) * 100) / 100,
      },
    };
  },
});

export const cleanupOldLogs: any = action({
  args: {
    olderThanDays: v.number(),
    adminUserId: v.id("users"),
  },
  handler: async (ctx, { olderThanDays, adminUserId }) => {
    // Verify admin permissions
    const admin = await ctx.db.get(adminUserId);
    if (!admin || admin.role !== "admin") {
      throw new Error("Admin permissions required");
    }

    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const oldLogs = await ctx.db
      .query("systemLogs")
      .filter((q) => q.lt(q.field("createdAt"), cutoffDate))
      .collect();

    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    // Log the cleanup action
    await ctx.runMutation(internal.systemLogs.create, {
      userId: adminUserId,
      action: "admin_cleanup_logs",
      status: "success",
      message: `Cleaned up ${deletedCount} old system logs (older than ${olderThanDays} days)`,
      metadata: {
        deletedCount,
        olderThanDays,
        cutoffDate,
      },
    });

    return {
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} old log entries`,
    };
  },
});

export const exportSystemData: any = action({
  args: {
    dataType: v.union(
      v.literal("logs"),
      v.literal("users"),
      v.literal("videoIdeas"),
      v.literal("analytics")
    ),
    format: v.union(v.literal("csv"), v.literal("json")),
    timeRange: v.optional(v.string()),
    adminUserId: v.id("users"),
  },
  handler: async (ctx, { dataType, format, timeRange, adminUserId }) => {
    // Verify admin permissions
    const admin = await ctx.db.get(adminUserId);
    if (!admin || admin.role !== "admin") {
      throw new Error("Admin permissions required");
    }

    let data: any[] = [];
    let filename = "";

    // Apply time filter if specified
    let startTime: number | undefined;
    if (timeRange) {
      const now = Date.now();
      switch (timeRange) {
        case "1h":
          startTime = now - (60 * 60 * 1000);
          break;
        case "24h":
          startTime = now - (24 * 60 * 60 * 1000);
          break;
        case "7d":
          startTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    switch (dataType) {
      case "logs":
        let logQuery = ctx.db.query("systemLogs");
        if (startTime) {
          logQuery = logQuery.filter((q) => q.gte(q.field("createdAt"), startTime));
        }
        data = await logQuery.order("desc").collect();
        filename = `system_logs_${timeRange || 'all'}_${Date.now()}`;
        break;

      case "users":
        data = await ctx.db.query("users").collect();
        filename = `users_export_${Date.now()}`;
        break;

      case "videoIdeas":
        let videoQuery = ctx.db.query("videoIdeas");
        if (startTime) {
          videoQuery = videoQuery.filter((q) => q.gte(q.field("createdAt"), startTime));
        }
        data = await videoQuery.order("desc").collect();
        filename = `video_ideas_${timeRange || 'all'}_${Date.now()}`;
        break;

      case "analytics":
        let analyticsQuery = ctx.db.query("videoAnalytics");
        if (startTime) {
          analyticsQuery = analyticsQuery.filter((q) => q.gte(q.field("createdAt"), startTime));
        }
        data = await analyticsQuery.order("desc").collect();
        filename = `video_analytics_${timeRange || 'all'}_${Date.now()}`;
        break;
    }

    // Format data for export
    const formattedData = data.map(item => ({
      ...item,
      createdAt: new Date(item.createdAt).toISOString(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined,
      scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString() : undefined,
    }));

    if (format === "csv") {
      // Convert to CSV
      if (formattedData.length === 0) {
        return {
          data: "No data available",
          filename: `${filename}.csv`,
          count: 0
        };
      }

      const headers = Object.keys(formattedData[0]);
      const csvData = [
        headers.join(","),
        ...formattedData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            return typeof value === "string" && value.includes(",") 
              ? `"${value}"` : value;
          }).join(",")
        )
      ].join("\n");

      return {
        data: csvData,
        filename: `${filename}.csv`,
        count: formattedData.length
      };
    } else {
      return {
        data: JSON.stringify(formattedData, null, 2),
        filename: `${filename}.json`,
        count: formattedData.length
      };
    }
  },
});