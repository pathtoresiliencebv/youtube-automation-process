import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "convex/server";

// Mock internal API for build
const internal = {
  youtube: { getTopVideos: null },
  users: { getUserById: null },
  content: { getVideoIdea: null, updateIdeaStatus: null, updateIdeaScript: null },
  systemLogs: { create: null }
} as any;

export const generateVideoIdeas: any = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    try {
      // Get top performing videos
      const topVideos = await ctx.runQuery(internal.youtube.getTopVideos, { userId, limit: 10 });
      
      if (topVideos.length === 0) {
        throw new Error("No video analytics data found. Please analyze your YouTube channel first.");
      }

      // Call Gemini API to generate new ideas
      const response = await fetch('/api/gemini/generate-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topVideos: topVideos,
          analysisPrompt: `Analyseer deze top 10 YouTube video's van de afgelopen 28 dagen. Kijk naar SEO, wat goed presteert, en genereer nieuwe onderwerpen die het hoogste goed dienen en mensen daadwerkelijk verder helpen in deze wereld. Focus op bewustzijn, innerlijke kracht, motivatie en spirituele groei.`
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store generated ideas
      const ideaIds = [];
      for (const idea of data.ideas) {
        const ideaId = await ctx.runMutation(internal.content.createVideoIdea, {
          userId,
          title: idea.title,
          description: idea.description,
          analysisData: {
            topVideos: topVideos,
            analysisDate: Date.now(),
          },
        });
        ideaIds.push(ideaId);
      }

      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "generate_ideas",
        status: "success",
        message: `Generated ${data.ideas.length} new video ideas`,
        metadata: { ideaCount: data.ideas.length },
      });

      return { ideaIds, ideas: data.ideas };
    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "generate_ideas",
        status: "error",
        message: `Idea generation failed: ${error.message}`,
        metadata: { error: error.message },
      });
      throw error;
    }
  },
});

export const createVideoIdea: any = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    analysisData: v.object({
      topVideos: v.array(v.any()),
      analysisDate: v.number(),
    }),
  },
  handler: async (ctx, { userId, title, description, analysisData }) => {
    return await ctx.db.insert("videoIdeas", {
      userId,
      title,
      description,
      status: "pending_approval",
      generatedFromAnalysis: analysisData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const approveVideoIdea: any = mutation({
  args: {
    ideaId: v.id("videoIdeas"),
  },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.db.get(ideaId);
    if (!idea) {
      throw new Error("Video idea not found");
    }

    await ctx.db.patch(ideaId, {
      status: "approved",
      updatedAt: Date.now(),
    });

    // Trigger script generation
    await ctx.scheduler.runAfter(0, internal.content.generateScript, { ideaId });

    return ideaId;
  },
});

export const generateScript: any = action({
  args: {
    ideaId: v.id("videoIdeas"),
  },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.runQuery(internal.content.getVideoIdea, { ideaId });
    
    if (!idea) {
      throw new Error("Video idea not found");
    }

    try {
      await ctx.runMutation(internal.content.updateIdeaStatus, {
        ideaId,
        status: "script_generated",
      });

      const response = await fetch('/api/gemini/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          description: idea.description,
          scriptPrompt: `Je bent een uitzonderlijk getalenteerde script schrijver, gespecialiseerd in het maken van YouTube Shorts die mensen diep raken. Je schrijft krachtige, motiverende scripts met een onweerstaanbare hook in de eerste 3 seconden die direct de aandacht grijpt. Je teksten zitten vol emotionele lading, persoonlijke doorbraakmomenten, levenslessen, innerlijke kracht en inspiratie. Je gebruikt taal die het hart raakt, mensen kippenvel geeft en aanzet tot actie of reflectie. Elk script neemt de kijker mee op een korte, intense reis van herkenning naar motivatie. Je schrijft in spreektaal, kort, bondig en met impact — perfect getimed voor een video van 30 tot 60 seconden. Structuur: Hook (3 seconden) → Body (motivational story/insight) → Close: "Wil je meer van dit soort video's zien? Like, deel het en abonneer op mijn YouTube kanaal." Geef alleen de tekst zonder formatting.`
        }),
      });

      if (!response.ok) {
        throw new Error(`Script generation error: ${response.statusText}`);
      }

      const data = await response.json();

      // Update idea with generated script
      await ctx.runMutation(internal.content.updateIdeaScript, {
        ideaId,
        script: data.script,
      });

      // Trigger video creation with RevID
      await ctx.scheduler.runAfter(0, internal.revid.createVideo, { ideaId });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "generate_script",
        status: "success",
        message: `Script generated for: ${idea.title}`,
        metadata: { ideaId },
      });

      return data.script;
    } catch (error) {
      await ctx.runMutation(internal.content.updateIdeaStatus, {
        ideaId,
        status: "failed",
        error: error.message,
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "generate_script",
        status: "error",
        message: `Script generation failed: ${error.message}`,
        metadata: { error: error.message, ideaId },
      });

      throw error;
    }
  },
});

export const getVideoIdea: any = query({
  args: { ideaId: v.id("videoIdeas") },
  handler: async (ctx, { ideaId }) => {
    return await ctx.db.get(ideaId);
  },
});

export const getVideoIdeasByUser: any = query({
  args: { 
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { userId, status }) => {
    let query = ctx.db.query("videoIdeas").withIndex("by_user", (q) => q.eq("userId", userId));
    
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }
    
    return await query.order("desc").collect();
  },
});

export const updateIdeaStatus: any = internalMutation({
  args: {
    ideaId: v.id("videoIdeas"),
    status: v.string(),
    error: v.optional(v.string()),
    youtubeVideoId: v.optional(v.string()),
    scheduledDate: v.optional(v.number()),
  },
  handler: async (ctx, { ideaId, status, error, youtubeVideoId, scheduledDate }) => {
    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };

    if (error) updateData.error = error;
    if (youtubeVideoId) updateData.youtubeVideoId = youtubeVideoId;
    if (scheduledDate) updateData.scheduledDate = scheduledDate;

    await ctx.db.patch(ideaId, updateData);
  },
});

export const updateIdeaScript: any = internalMutation({
  args: {
    ideaId: v.id("videoIdeas"),
    script: v.string(),
  },
  handler: async (ctx, { ideaId, script }) => {
    await ctx.db.patch(ideaId, {
      script,
      status: "script_generated",
      updatedAt: Date.now(),
    });
  },
});