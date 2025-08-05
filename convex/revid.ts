import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const createVideo: any = action({
  args: {
    ideaId: v.id("videoIdeas"),
  },
  handler: async (ctx, { ideaId }) => {
    const idea = await ctx.runQuery(internal.content.getVideoIdea, { ideaId });
    
    if (!idea || !idea.script) {
      throw new Error("Video idea or script not found");
    }

    try {
      await ctx.runMutation(internal.content.updateIdeaStatus, {
        ideaId,
        status: "video_creating",
      });

      // Format script for RevID
      const formattedScript = formatScriptForRevID(idea.script);

      const response = await fetch('https://api.revid.ai/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REVID_API_KEY}`,
        },
        body: JSON.stringify({
          webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/revid`,
          creationParams: {
            mediaType: "movingImage",
            inputText: "",
            flowType: "text-to-video",
            slug: "create-tiktok-video",
            slugNew: "ai-tiktok-video-generator",
            isCopiedFrom: false,
            hasToGenerateVoice: true,
            hasToTranscript: false,
            hasToSearchMedia: true,
            hasAvatar: false,
            hasWebsiteRecorder: false,
            hasTextSmallAtBottom: false,
            ratio: "9 / 16",
            selectedAudio: "iky1ZYcS4AfCoof9TRhn",
            selectedVoice: "cjVigY5qzO86Huf0OWal",
            selectedAvatarType: "",
            websiteToRecord: "",
            hasToGenerateCover: false,
            nbGenerations: 1,
            disableCaptions: false,
            mediaMultiplier: "medium",
            characters: [],
            imageGenerationModel: "ultra",
            videoGenerationModel: "base",
            hasEnhancedGeneration: true,
            hasEnhancedGenerationPro: true,
            captionPresetName: "Wrap 1",
            captionPositionName: "bottom",
            sourceType: "contentScraping",
            selectedStoryStyle: {
              value: "custom",
              label: "General"
            },
            durationSeconds: 40,
            generationPreset: "PIXAR",
            hasToGenerateMusic: false,
            isOptimizedForChinese: false,
            generationUserPrompt: formattedScript,
            enableNsfwFilter: true,
            addStickers: false,
            typeMovingImageAnim: "dynamic",
            hasToGenerateSoundEffects: false,
            selectedCharacters: [
              "ff58b7fa-e0ea-4f50-a9d8-6f5cf0616815"
            ],
            lang: "",
            voiceSpeed: 1,
            disableAudio: false,
            disableVoice: false,
            inputMedias: [],
            hasToGenerateVideos: true,
            audioUrl: "https://cdn.revid.ai/generated_music/Usk2DH6C9.mp3",
            watermark: null,
            estimatedCreditsToConsume: 10
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`RevID API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Store RevID job ID
      await ctx.runMutation(internal.revid.updateVideoJob, {
        ideaId,
        jobId: data.jobId,
        status: "video_creating",
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "revid_create_video",
        status: "success",
        message: `Video creation started for: ${idea.title}`,
        metadata: { jobId: data.jobId, ideaId },
      });

      return data;
    } catch (error) {
      await ctx.runMutation(internal.content.updateIdeaStatus, {
        ideaId,
        status: "failed",
        error: error.message,
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "revid_create_video",
        status: "error",
        message: `Video creation failed: ${error.message}`,
        metadata: { error: error.message, ideaId },
      });

      throw error;
    }
  },
});

export const updateVideoJob: any = internalMutation({
  args: {
    ideaId: v.id("videoIdeas"),
    jobId: v.string(),
    status: v.string(),
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { ideaId, jobId, status, videoUrl }) => {
    const updateData: any = {
      revidJobId: jobId,
      status,
      updatedAt: Date.now(),
    };

    if (videoUrl) {
      updateData.videoUrl = videoUrl;
    }

    await ctx.db.patch(ideaId, updateData);
  },
});

export const handleWebhook: any = action({
  args: {
    jobId: v.string(),
    status: v.string(),
    videoUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, videoUrl, error }) => {
    // Find the video idea by RevID job ID
    const idea = await ctx.db
      .query("videoIdeas")
      .filter((q) => q.eq(q.field("revidJobId"), jobId))
      .unique();

    if (!idea) {
      throw new Error(`Video idea not found for job ID: ${jobId}`);
    }

    if (status === "completed" && videoUrl) {
      // Update video idea status
      await ctx.runMutation(internal.revid.updateVideoJob, {
        ideaId: idea._id,
        jobId,
        status: "video_completed",
        videoUrl,
      });

      // Generate SEO content
      await ctx.scheduler.runAfter(0, internal.content.generateSEOContent, { ideaId: idea._id });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "revid_webhook",
        status: "success",
        message: `Video completed: ${idea.title}`,
        metadata: { jobId, videoUrl },
      });
    } else if (status === "failed" || error) {
      await ctx.runMutation(internal.content.updateIdeaStatus, {
        ideaId: idea._id,
        status: "failed",
        error: error || "Video creation failed",
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId: idea.userId,
        action: "revid_webhook",
        status: "error",
        message: `Video creation failed: ${error || 'Unknown error'}`,
        metadata: { jobId, error },
      });
    }

    return { success: true };
  },
});

function formatScriptForRevID(script: string): string {
  // Split script into sentences and add media hints and breaks
  const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let formattedScript = "";
  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    if (trimmed) {
      // Add media hint for visual variety
      const mediaHints = [
        "[close-up of person speaking emotionally]",
        "[motivational scene with sunrise]",
        "[person overcoming challenge]",
        "[inspiring nature scene]",
        "[person achieving success]",
        "[calm meditation scene]",
        "[powerful transformation moment]"
      ];
      
      const hint = mediaHints[index % mediaHints.length];
      formattedScript += `${hint} ${trimmed}.\n`;
      
      // Add pause between sentences for dramatic effect
      if (index < sentences.length - 1) {
        formattedScript += `<break time="0.5s" />\n`;
      }
    }
  });
  
  return formattedScript;
}