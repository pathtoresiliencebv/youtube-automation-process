import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const bulkApproveIdeas: any = action({
  args: {
    ideaIds: v.array(v.id("videoIdeas")),
    userId: v.id("users"),
  },
  handler: async (ctx, { ideaIds, userId }) => {
    const results = {
      successful: [] as string[],
      failed: [] as { ideaId: string; error: string }[],
    };

    for (const ideaId of ideaIds) {
      try {
        // Verify ownership
        const idea = await ctx.db.get(ideaId);
        if (!idea || idea.userId !== userId) {
          results.failed.push({ 
            ideaId, 
            error: "Video idea not found or access denied" 
          });
          continue;
        }

        if (idea.status !== "pending_approval") {
          results.failed.push({ 
            ideaId, 
            error: `Cannot approve idea with status: ${idea.status}` 
          });
          continue;
        }

        // Approve the idea
        await ctx.db.patch(ideaId, {
          status: "approved",
          updatedAt: Date.now(),
        });

        // Start script generation
        await ctx.scheduler.runAfter(0, internal.content.generateScript, { ideaId });
        
        results.successful.push(ideaId);

        await ctx.runMutation(internal.systemLogs.create, {
          userId,
          action: "bulk_approve_idea",
          status: "success",
          message: `Bulk approved idea: ${idea.title}`,
          metadata: { ideaId, bulkOperation: true },
        });

      } catch (error) {
        results.failed.push({ 
          ideaId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});

export const bulkRejectIdeas: any = action({
  args: {
    ideaIds: v.array(v.id("videoIdeas")),
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { ideaIds, userId, reason = "Bulk rejection" }) => {
    const results = {
      successful: [] as string[],
      failed: [] as { ideaId: string; error: string }[],
    };

    for (const ideaId of ideaIds) {
      try {
        const idea = await ctx.db.get(ideaId);
        if (!idea || idea.userId !== userId) {
          results.failed.push({ 
            ideaId, 
            error: "Video idea not found or access denied" 
          });
          continue;
        }

        await ctx.db.patch(ideaId, {
          status: "rejected",
          error: reason,
          updatedAt: Date.now(),
        });

        results.successful.push(ideaId);

        await ctx.runMutation(internal.systemLogs.create, {
          userId,
          action: "bulk_reject_idea",
          status: "success",
          message: `Bulk rejected idea: ${idea.title}`,
          metadata: { ideaId, reason, bulkOperation: true },
        });

      } catch (error) {
        results.failed.push({ 
          ideaId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});

export const bulkDeleteIdeas: any = action({
  args: {
    ideaIds: v.array(v.id("videoIdeas")),
    userId: v.id("users"),
  },
  handler: async (ctx, { ideaIds, userId }) => {
    const results = {
      successful: [] as string[],
      failed: [] as { ideaId: string; error: string }[],
    };

    for (const ideaId of ideaIds) {
      try {
        const idea = await ctx.db.get(ideaId);
        if (!idea || idea.userId !== userId) {
          results.failed.push({ 
            ideaId, 
            error: "Video idea not found or access denied" 
          });
          continue;
        }

        // Only allow deletion of rejected, failed, or unrecoverable ideas
        if (!["rejected", "failed", "unrecoverable"].includes(idea.status)) {
          results.failed.push({ 
            ideaId, 
            error: `Cannot delete idea with status: ${idea.status}` 
          });
          continue;
        }

        await ctx.db.delete(ideaId);
        results.successful.push(ideaId);

        await ctx.runMutation(internal.systemLogs.create, {
          userId,
          action: "bulk_delete_idea",
          status: "success",
          message: `Bulk deleted idea: ${idea.title}`,
          metadata: { ideaId, bulkOperation: true },
        });

      } catch (error) {
        results.failed.push({ 
          ideaId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});

export const bulkUpdateSchedule: any = action({
  args: {
    ideaIds: v.array(v.id("videoIdeas")),
    userId: v.id("users"),
    scheduledDate: v.number(),
    distributeHours: v.optional(v.number()), // Hours to spread videos apart
  },
  handler: async (ctx, { ideaIds, userId, scheduledDate, distributeHours = 24 }) => {
    const results = {
      successful: [] as string[],
      failed: [] as { ideaId: string; error: string }[],
    };

    for (let i = 0; i < ideaIds.length; i++) {
      const ideaId = ideaIds[i];
      try {
        const idea = await ctx.db.get(ideaId);
        if (!idea || idea.userId !== userId) {
          results.failed.push({ 
            ideaId, 
            error: "Video idea not found or access denied" 
          });
          continue;
        }

        // Only allow scheduling of completed videos
        if (!["video_completed", "scheduled"].includes(idea.status)) {
          results.failed.push({ 
            ideaId, 
            error: `Cannot schedule idea with status: ${idea.status}` 
          });
          continue;
        }

        // Calculate distributed schedule time
        const distributedTime = scheduledDate + (i * distributeHours * 60 * 60 * 1000);

        await ctx.db.patch(ideaId, {
          scheduledDate: distributedTime,
          status: "scheduled",
          updatedAt: Date.now(),
        });

        results.successful.push(ideaId);

        await ctx.runMutation(internal.systemLogs.create, {
          userId,
          action: "bulk_schedule_update",
          status: "success",
          message: `Bulk scheduled idea: ${idea.title}`,
          metadata: { 
            ideaId, 
            scheduledDate: distributedTime,
            bulkOperation: true 
          },
        });

      } catch (error) {
        results.failed.push({ 
          ideaId, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});

export const bulkExportData: any = action({
  args: {
    userId: v.id("users"),
    format: v.union(v.literal("csv"), v.literal("json")),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { userId, format, status, startDate, endDate }) => {
    try {
      // Get video ideas with filters
      let query = ctx.db
        .query("videoIdeas")
        .filter((q) => q.eq(q.field("userId"), userId));

      if (status) {
        query = query.filter((q) => q.eq(q.field("status"), status));
      }

      if (startDate) {
        query = query.filter((q) => q.gte(q.field("createdAt"), startDate));
      }

      if (endDate) {
        query = query.filter((q) => q.lte(q.field("createdAt"), endDate));
      }

      const ideas = await query.collect();

      // Get analytics data for published videos
      const analyticsData = await Promise.all(
        ideas
          .filter(idea => idea.youtubeVideoId)
          .map(async (idea) => {
            const analytics = await ctx.db
              .query("videoAnalytics")
              .filter((q) => q.eq(q.field("youtubeVideoId"), idea.youtubeVideoId!))
              .order("desc")
              .first();
            return { ideaId: idea._id, analytics };
          })
      );

      const analyticsMap = new Map(
        analyticsData.map(({ ideaId, analytics }) => [ideaId, analytics])
      );

      // Format data for export
      const exportData = ideas.map(idea => {
        const analytics = analyticsMap.get(idea._id);
        return {
          id: idea._id,
          title: idea.title,
          description: idea.description,
          status: idea.status,
          createdAt: new Date(idea.createdAt).toISOString(),
          updatedAt: new Date(idea.updatedAt).toISOString(),
          scheduledDate: idea.scheduledDate ? new Date(idea.scheduledDate).toISOString() : null,
          youtubeVideoId: idea.youtubeVideoId || null,
          performanceScore: idea.performanceScore || 0,
          views: analytics?.views || 0,
          likes: analytics?.likes || 0,
          comments: analytics?.comments || 0,
          watchTime: analytics?.watchTime || 0,
          ctr: analytics?.ctr || 0,
          revidJobId: idea.revidJobId || null,
          error: idea.error || null,
          retryCount: idea.retryCount || 0,
        };
      });

      if (format === "csv") {
        // Convert to CSV
        const headers = Object.keys(exportData[0] || {});
        const csvData = [
          headers.join(","),
          ...exportData.map(row => 
            headers.map(header => {
              const value = row[header as keyof typeof row];
              return typeof value === "string" && value.includes(",") 
                ? `"${value}"` : value;
            }).join(",")
          )
        ].join("\n");

        return {
          format: "csv",
          data: csvData,
          filename: `video_ideas_export_${Date.now()}.csv`,
          count: exportData.length
        };
      } else {
        return {
          format: "json",
          data: JSON.stringify(exportData, null, 2),
          filename: `video_ideas_export_${Date.now()}.json`,
          count: exportData.length
        };
      }

    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  },
});

export const getBulkOperationStatus: any = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 50 }) => {
    const logs = await ctx.db
      .query("systemLogs")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.or(
            q.eq(q.field("action"), "bulk_approve_idea"),
            q.eq(q.field("action"), "bulk_reject_idea"),
            q.eq(q.field("action"), "bulk_delete_idea"),
            q.eq(q.field("action"), "bulk_schedule_update")
          )
        )
      )
      .order("desc")
      .take(limit);

    return logs;
  },
});

export const getVideoIdeasWithFilters: any = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.array(v.string())),
    hasYouTubeVideo: v.optional(v.boolean()),
    hasError: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { 
    userId, 
    status, 
    hasYouTubeVideo, 
    hasError, 
    limit = 50, 
    offset = 0 
  }) => {
    let query = ctx.db
      .query("videoIdeas")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (status && status.length > 0) {
      query = query.filter((q) => 
        status.some(s => q.eq(q.field("status"), s))
      );
    }

    if (hasYouTubeVideo !== undefined) {
      if (hasYouTubeVideo) {
        query = query.filter((q) => q.neq(q.field("youtubeVideoId"), undefined));
      } else {
        query = query.filter((q) => q.eq(q.field("youtubeVideoId"), undefined));
      }
    }

    if (hasError !== undefined) {
      if (hasError) {
        query = query.filter((q) => q.neq(q.field("error"), undefined));
      } else {
        query = query.filter((q) => q.eq(q.field("error"), undefined));
      }
    }

    const ideas = await query
      .order("desc")
      .collect();

    // Manual pagination since Convex doesn't have native offset/limit
    const paginatedIdeas = ideas.slice(offset, offset + limit);

    return {
      ideas: paginatedIdeas,
      total: ideas.length,
      hasMore: offset + limit < ideas.length,
    };
  },
});