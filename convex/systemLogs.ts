import { v } from "convex/values";
import { internalMutation, query } from "convex/server";

export const create: any = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("info")),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("systemLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const getRecentLogs: any = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 50 }) => {
    let query = ctx.db.query("systemLogs");
    
    if (userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", userId));
    }
    
    return await query
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

export const getLogsByAction: any = query({
  args: {
    action: v.string(),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { action, userId, limit = 20 }) => {
    let query = ctx.db.query("systemLogs");
    
    if (userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", userId));
    }
    
    return await query
      .filter((q) => q.eq(q.field("action"), action))
      .order("desc")
      .take(limit);
  },
});