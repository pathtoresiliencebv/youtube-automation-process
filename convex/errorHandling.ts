import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

export const retryFailedJobs: any = action({
  args: {},
  handler: async (ctx) => {
    try {
      // Find failed video ideas that can be retried
      const failedIdeas = await ctx.db
        .query("videoIdeas")
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "failed"),
            q.or(
              q.eq(q.field("retryCount"), undefined),
              q.lt(q.field("retryCount"), RETRY_CONFIG.maxRetries)
            )
          )
        )
        .collect();

      let retriedCount = 0;

      for (const idea of failedIdeas) {
        const currentRetryCount = idea.retryCount || 0;
        
        if (currentRetryCount < RETRY_CONFIG.maxRetries) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, currentRetryCount),
            RETRY_CONFIG.maxDelay
          );

          // Update retry count
          await ctx.db.patch(idea._id, {
            retryCount: currentRetryCount + 1,
            lastRetryAt: Date.now(),
            status: "pending_retry",
            updatedAt: Date.now(),
          });

          // Schedule retry based on the last failed step
          if (idea.error?.includes('script')) {
            // Retry script generation
            await ctx.scheduler.runAfter(delay, internal.content.generateScript, { 
              ideaId: idea._id 
            });
          } else if (idea.error?.includes('RevID') || idea.error?.includes('video')) {
            // Retry video creation
            await ctx.scheduler.runAfter(delay, internal.revid.createVideo, { 
              ideaId: idea._id 
            });
          } else if (idea.error?.includes('SEO')) {
            // Retry SEO generation
            await ctx.scheduler.runAfter(delay, internal.content.generateSEOContent, { 
              ideaId: idea._id 
            });
          } else if (idea.error?.includes('YouTube') || idea.error?.includes('upload')) {
            // Retry YouTube upload
            await ctx.scheduler.runAfter(delay, internal.content.uploadToYouTube, { 
              ideaId: idea._id 
            });
          } else {
            // Generic retry - restart from script generation
            await ctx.scheduler.runAfter(delay, internal.content.generateScript, { 
              ideaId: idea._id 
            });
          }

          retriedCount++;

          await ctx.runMutation(internal.systemLogs.create, {
            userId: idea.userId,
            action: "retry_failed_job",
            status: "info",
            message: `Retrying failed job for: ${idea.title} (attempt ${currentRetryCount + 1}/${RETRY_CONFIG.maxRetries})`,
            metadata: { 
              ideaId: idea._id, 
              retryCount: currentRetryCount + 1,
              delay,
              error: idea.error 
            },
          });
        }
      }

      return { retriedCount, totalFailed: failedIdeas.length };
    } catch (error) {
      console.error('Error in retry failed jobs:', error);
      throw error;
    }
  },
});

export const markJobAsUnrecoverable: any = internalMutation({
  args: {
    ideaId: v.id("videoIdeas"),
    reason: v.string(),
  },
  handler: async (ctx, { ideaId, reason }) => {
    await ctx.db.patch(ideaId, {
      status: "unrecoverable",
      error: `Max retries exceeded: ${reason}`,
      updatedAt: Date.now(),
    });
  },
});

export const healthCheck: any = action({
  args: {},
  handler: async (ctx) => {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      // Check for stuck jobs (in progress for more than 1 hour)
      const stuckJobs = await ctx.db
        .query("videoIdeas")
        .filter((q) => 
          q.and(
            q.or(
              q.eq(q.field("status"), "video_creating"),
              q.eq(q.field("status"), "uploading"),
              q.eq(q.field("status"), "generating_seo")
            ),
            q.lt(q.field("updatedAt"), oneHourAgo)
          )
        )
        .collect();

      // Check for failed jobs in the last 24 hours
      const recentFailures = await ctx.db
        .query("videoIdeas")
        .filter((q) => 
          q.and(
            q.eq(q.field("status"), "failed"),
            q.gt(q.field("updatedAt"), oneDayAgo)
          )
        )
        .collect();

      // Check for unrecoverable jobs
      const unrecoverableJobs = await ctx.db
        .query("videoIdeas")
        .filter((q) => q.eq(q.field("status"), "unrecoverable"))
        .collect();

      // Recovery actions for stuck jobs
      for (const job of stuckJobs) {
        await ctx.db.patch(job._id, {
          status: "failed",
          error: `Job stuck in ${job.status} status for over 1 hour`,
          updatedAt: now,
        });

        await ctx.runMutation(internal.systemLogs.create, {
          userId: job.userId,
          action: "health_check_recovery",
          status: "info",
          message: `Marked stuck job as failed: ${job.title}`,
          metadata: { ideaId: job._id, previousStatus: job.status },
        });
      }

      return {
        status: "healthy",
        stuckJobs: stuckJobs.length,
        recentFailures: recentFailures.length,
        unrecoverableJobs: unrecoverableJobs.length,
        recoveredJobs: stuckJobs.length,
        timestamp: now,
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: Date.now(),
      };
    }
  },
});

// Wrapper function for actions with automatic retry logic
export const withRetry = async (
  ctx: any,
  operation: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};