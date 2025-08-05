import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendNotification: any = action({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("success"), v.literal("warning"), v.literal("error"), v.literal("info")),
    event: v.string(),
    data: v.any(),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, type, event, data, sendEmail = true }) => {
    try {
      // Get user data
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Store notification in database
      const notificationId = await ctx.db.insert("notifications", {
        userId,
        type,
        event,
        data,
        read: false,
        createdAt: Date.now(),
      });

      // Send email if enabled and user has email notifications enabled
      if (sendEmail && 
          user.email && 
          user.preferences?.emailNotifications !== false) {
        
        try {
          // Call API to send email
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              userEmail: user.email,
              userName: user.name || user.email,
              type,
              event,
              data,
            }),
          });

          if (!response.ok) {
            console.error('Failed to send email notification:', await response.text());
          }
        } catch (emailError) {
          console.error('Email notification error:', emailError);
          // Don't fail the entire notification if email fails
        }
      }

      // Log the notification
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "notification_sent",
        status: "success",
        message: `Notification sent: ${event}`,
        metadata: {
          notificationId,
          type,
          event,
          emailSent: sendEmail,
        },
      });

      return { success: true, notificationId };

    } catch (error) {
      console.error('Notification error:', error);
      
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "notification_failed",
        status: "error",
        message: `Failed to send notification: ${event}`,
        metadata: {
          error: error.message,
          type,
          event,
        },
      });

      throw error;
    }
  },
});

export const sendBulkNotifications: any = action({
  args: {
    notifications: v.array(v.object({
      userId: v.id("users"),
      type: v.union(v.literal("success"), v.literal("warning"), v.literal("error"), v.literal("info")),
      event: v.string(),
      data: v.any(),
    })),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, { notifications, sendEmail = true }) => {
    const results = {
      successful: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    for (const notification of notifications) {
      try {
        const result = await ctx.runAction(internal.notifications.sendNotification, {
          ...notification,
          sendEmail,
        });
        
        results.successful.push(notification.userId);
      } catch (error) {
        results.failed.push({
          userId: notification.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  },
});

export const getUserNotifications: any = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, limit = 50, unreadOnly = false }) => {
    let query = ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (unreadOnly) {
      query = query.filter((q) => q.eq(q.field("read"), false));
    }

    const notifications = await query
      .order("desc")
      .take(limit);

    return notifications;
  },
});

export const markNotificationAsRead: any = mutation({
  args: {
    notificationId: v.id("notifications"),
    userId: v.id("users"),
  },
  handler: async (ctx, { notificationId, userId }) => {
    const notification = await ctx.db.get(notificationId);
    
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or access denied");
    }

    await ctx.db.patch(notificationId, {
      read: true,
      readAt: Date.now(),
    });

    return { success: true };
  },
});

export const markAllNotificationsAsRead: any = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: Date.now(),
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

export const getNotificationSettings: any = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      emailNotifications: user.preferences?.emailNotifications !== false,
      pushNotifications: user.preferences?.pushNotifications !== false,
      notificationTypes: user.preferences?.notificationTypes || {
        videoPublished: true,
        videoFailed: true,
        bulkOperations: true,
        systemAlerts: true,
        weeklyReports: true,
        quotaWarnings: true,
      },
    };
  },
});

export const updateNotificationSettings: any = mutation({
  args: {
    userId: v.id("users"),
    settings: v.object({
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
    }),
  },
  handler: async (ctx, { userId, settings }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentPreferences = user.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...settings,
      notificationTypes: {
        ...currentPreferences.notificationTypes,
        ...settings.notificationTypes,
      },
    };

    await ctx.db.patch(userId, {
      preferences: updatedPreferences,
    });

    await ctx.runMutation(internal.systemLogs.create, {
      userId,
      action: "notification_settings_updated",
      status: "success",
      message: "Updated notification preferences",
      metadata: { settings },
    });

    return { success: true };
  },
});

// Automated notification triggers
export const triggerVideoPublishedNotification: any = action({
  args: {
    ideaId: v.id("videoIdeas"),
  },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) return;

    const user = await ctx.db.get(idea.userId);
    if (!user) return;

    // Check if user wants video published notifications
    const settings = user.preferences?.notificationTypes;
    if (settings?.videoPublished === false) return;

    await ctx.runAction(internal.notifications.sendNotification, {
      userId: idea.userId,
      type: "success",
      event: "video_published",
      data: {
        title: idea.title,
        description: idea.description,
        status: idea.status,
        youtubeVideoId: idea.youtubeVideoId,
        performanceScore: idea.performanceScore,
        scheduledDate: idea.scheduledDate,
      },
    });
  },
});

export const triggerVideoFailedNotification: any = action({
  args: {
    ideaId: v.id("videoIdeas"),
  },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) return;

    const user = await ctx.db.get(idea.userId);
    if (!user) return;

    // Check if user wants video failed notifications
    const settings = user.preferences?.notificationTypes;
    if (settings?.videoFailed === false) return;

    await ctx.runAction(internal.notifications.sendNotification, {
      userId: idea.userId,
      type: "error",
      event: "video_failed",
      data: {
        title: idea.title,
        status: idea.status,
        error: idea.error,
        retryCount: idea.retryCount,
        lastAttempt: Date.now(),
      },
    });
  },
});

export const triggerBulkOperationNotification: any = action({
  args: {
    userId: v.id("users"),
    operation: v.string(),
    results: v.object({
      successful: v.array(v.string()),
      failed: v.array(v.object({
        ideaId: v.string(),
        error: v.string(),
      })),
    }),
  },
  handler: async (ctx, { userId, operation, results }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    // Check if user wants bulk operation notifications
    const settings = user.preferences?.notificationTypes;
    if (settings?.bulkOperations === false) return;

    await ctx.runAction(internal.notifications.sendNotification, {
      userId,
      type: results.failed.length === 0 ? "success" : "warning",
      event: "bulk_operation_completed",
      data: {
        operation,
        successful: results.successful.length,
        failed: results.failed.length,
        total: results.successful.length + results.failed.length,
      },
    });
  },
});

export const triggerWeeklySummaryNotifications: any = action({
  args: {},
  handler: async (ctx) => {
    // Get all active users
    const users = await ctx.db.query("users").collect();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const user of users) {
      try {
        // Check if user wants weekly reports
        const settings = user.preferences?.notificationTypes;
        if (settings?.weeklyReports === false) continue;

        // Get user's video stats for the past week
        const userVideos = await ctx.db
          .query("videoIdeas")
          .filter((q) => 
            q.and(
              q.eq(q.field("userId"), user._id),
              q.gte(q.field("createdAt"), oneWeekAgo)
            )
          )
          .collect();

        const publishedVideos = userVideos.filter(v => v.status === "published");
        const totalViews = publishedVideos.reduce((sum, v) => sum + (v.views || 0), 0);
        const avgPerformance = publishedVideos.length > 0 
          ? publishedVideos.reduce((sum, v) => sum + (v.performanceScore || 0), 0) / publishedVideos.length
          : 0;

        // Find top performing video
        const topVideo = publishedVideos
          .sort((a, b) => (b.views || 0) - (a.views || 0))[0];

        await ctx.runAction(internal.notifications.sendNotification, {
          userId: user._id,
          type: "info",
          event: "weekly_summary",
          data: {
            week: `${new Date(oneWeekAgo).toLocaleDateString('nl-NL')} - ${new Date().toLocaleDateString('nl-NL')}`,
            videosCreated: userVideos.length,
            videosPublished: publishedVideos.length,
            totalViews,
            avgPerformance: Math.round(avgPerformance),
            topVideo: topVideo ? {
              title: topVideo.title,
              views: topVideo.views || 0,
              likes: topVideo.likes || 0,
            } : null,
          },
        });

      } catch (error) {
        console.error(`Failed to send weekly summary to user ${user._id}:`, error);
      }
    }
  },
});

export const triggerSystemAlert: any = action({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    details: v.optional(v.string()),
    adminOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, { title, message, type, details, adminOnly = false }) => {
    // Get target users (admins only or all users)
    let targetUsers;
    if (adminOnly) {
      targetUsers = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();
    } else {
      targetUsers = await ctx.db.query("users").collect();
    }

    // Send notifications to all target users
    for (const user of targetUsers) {
      try {
        // Check if user wants system alerts
        const settings = user.preferences?.notificationTypes;
        if (settings?.systemAlerts === false) continue;

        await ctx.runAction(internal.notifications.sendNotification, {
          userId: user._id,
          type,
          event: "system_alert",
          data: {
            title,
            message,
            details,
            adminOnly,
          },
        });
      } catch (error) {
        console.error(`Failed to send system alert to user ${user._id}:`, error);
      }
    }
  },
});