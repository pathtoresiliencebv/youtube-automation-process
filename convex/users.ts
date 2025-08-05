import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { email, name }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      email,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // For now, return a mock user. In production, this would use authentication
    const users = await ctx.db.query("users").collect();
    return users[0] || null;
  },
});

export const updateYouTubeCredentials = mutation({
  args: {
    userId: v.id("users"),
    channelId: v.string(),
    refreshToken: v.string(),
  },
  handler: async (ctx, { userId, channelId, refreshToken }) => {
    await ctx.db.patch(userId, {
      youtubeChannelId: channelId,
      youtubeRefreshToken: refreshToken,
      updatedAt: Date.now(),
    });
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});