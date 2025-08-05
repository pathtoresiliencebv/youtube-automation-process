import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const generateSmartCalendar: any = action({
  args: {
    userId: v.id("users"),
    weeks: v.optional(v.number()), // Number of weeks to plan
    videosPerWeek: v.optional(v.number()),
    preferences: v.optional(v.object({
      optimalDays: v.optional(v.array(v.string())), // ["monday", "wednesday", "friday"]
      optimalHours: v.optional(v.array(v.number())), // [9, 14, 18]
      contentMix: v.optional(v.object({
        spiritual: v.optional(v.number()), // percentage
        motivation: v.optional(v.number()),
        personal_growth: v.optional(v.number()),
        general: v.optional(v.number())
      }))
    }))
  },
  handler: async (ctx, { userId, weeks = 4, videosPerWeek = 3, preferences }) => {
    try {
      // Get user's optimal timing analysis
      const timingAnalysis = await ctx.db
        .query("contentAnalysis")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("analysisType"), "optimal_timing")
          )
        )
        .order("desc")
        .first();

      // Get topic analysis
      const topicAnalysis = await ctx.db
        .query("contentAnalysis")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), userId),
            q.eq(q.field("analysisType"), "trending_topics")
          )
        )
        .order("desc")
        .first();

      // Generate calendar based on analysis and preferences
      const calendar = await generateCalendarPlan(
        ctx, 
        userId, 
        weeks, 
        videosPerWeek, 
        preferences,
        timingAnalysis?.results,
        topicAnalysis?.results
      );

      // Store the calendar
      const calendarId = await ctx.db.insert("contentCalendars", {
        userId,
        weeks,
        videosPerWeek,
        preferences: preferences || {},
        calendar,
        basedOnAnalysis: {
          timing: timingAnalysis?._id,
          topics: topicAnalysis?._id
        },
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "generate_smart_calendar",
        status: "success",
        message: `Generated ${weeks}-week content calendar with ${videosPerWeek} videos per week`,
        metadata: { calendarId, weeks, videosPerWeek },
      });

      return {
        success: true,
        calendarId,
        calendar,
        totalVideos: weeks * videosPerWeek,
        summary: generateCalendarSummary(calendar)
      };

    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "generate_smart_calendar",
        status: "error",
        message: `Calendar generation failed: ${error.message}`,
        metadata: { error: error.message },
      });
      
      throw error;
    }
  },
});

async function generateCalendarPlan(
  ctx: any,
  userId: string,
  weeks: number,
  videosPerWeek: number,
  preferences: any,
  timingAnalysis: any,
  topicAnalysis: any
) {
  const calendar = [];
  const now = new Date();
  
  // Default optimal times if no analysis available
  const optimalHours = preferences?.optimalHours || 
    timingAnalysis?.data?.bestHours?.map((h: any) => h.hour) || 
    [9, 14, 18];
  
  // Default optimal days
  const optimalDays = preferences?.optimalDays || 
    ['tuesday', 'thursday', 'saturday'];

  // Content mix ratios
  const contentMix = preferences?.contentMix || {
    spiritual: 40,
    motivation: 25,
    personal_growth: 25,
    general: 10
  };

  // Get trending topics
  const trendingTopics = topicAnalysis?.data?.topPerformingTopics || [
    { topic: 'spiritualiteit', averageScore: 85 },
    { topic: 'motivatie', averageScore: 82 },
    { topic: 'persoonlijke groei', averageScore: 79 }
  ];

  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + (week * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekPlan = {
      week: week + 1,
      startDate: weekStart.getTime(),
      endDate: weekStart.getTime() + (7 * 24 * 60 * 60 * 1000) - 1,
      videos: []
    };

    // Distribute videos across the week
    for (let videoIndex = 0; videoIndex < videosPerWeek; videoIndex++) {
      const dayIndex = Math.floor((videoIndex / videosPerWeek) * optimalDays.length);
      const targetDay = optimalDays[dayIndex % optimalDays.length];
      const targetHour = optimalHours[videoIndex % optimalHours.length];
      
      // Calculate publish date
      const publishDate = new Date(weekStart);
      publishDate.setDate(weekStart.getDate() + getDayOffset(targetDay));
      publishDate.setHours(targetHour, 0, 0, 0);

      // Select content type based on mix
      const contentType = selectContentType(contentMix, videoIndex, videosPerWeek);
      const topic = selectTopic(trendingTopics, contentType);

      // Generate video concept
      const videoConcept = await generateVideoConcept(ctx, contentType, topic, week, videoIndex);

      weekPlan.videos.push({
        slot: videoIndex + 1,
        scheduledDate: publishDate.getTime(),
        dayOfWeek: targetDay,
        hour: targetHour,
        contentType,
        topic: topic.topic,
        concept: videoConcept,
        status: 'planned',
        priority: calculatePriority(contentType, topic.averageScore, targetHour, optimalHours),
        estimatedPerformance: estimateVideoPerformance(topic.averageScore, targetHour, optimalHours)
      });
    }

    calendar.push(weekPlan);
  }

  return calendar;
}

function getDayOffset(dayName: string): number {
  const days = {
    'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
    'friday': 5, 'saturday': 6, 'sunday': 0
  };
  return days[dayName.toLowerCase()] || 1;
}

function selectContentType(contentMix: any, videoIndex: number, totalVideos: number): string {
  const rand = (videoIndex / totalVideos) * 100;
  let cumulative = 0;
  
  for (const [type, percentage] of Object.entries(contentMix)) {
    cumulative += percentage as number;
    if (rand <= cumulative) {
      return type;
    }
  }
  
  return 'spiritual'; // fallback
}

function selectTopic(trendingTopics: any[], contentType: string) {
  // Filter topics by content type or return best performing
  const relevantTopics = trendingTopics.filter(t => 
    t.topic.toLowerCase().includes(contentType.toLowerCase()) ||
    contentType === 'general'
  );
  
  return relevantTopics[0] || trendingTopics[0] || { topic: 'spiritualiteit', averageScore: 80 };
}

async function generateVideoConcept(ctx: any, contentType: string, topic: any, week: number, videoIndex: number) {
  const concepts = {
    spiritual: [
      'Spirituele doorbraak technieken',
      'Chakra healing en balans',
      'Meditatie voor beginners',
      'Innerlijke wijsheid ontdekken',
      'Energetische bescherming'
    ],
    motivation: [
      'Doelen bereiken in 30 dagen',
      'Mindset transformatie',
      'Succes gewoontes opbouwen',
      'Obstakels overwinnen',
      'Zelfvertrouwen boost'
    ],
    personal_growth: [
      'Persoonlijke ontwikkeling stappen',
      'Emotionele intelligentie verbeteren',
      'Relaties verdiepen',
      'Angsten overwinnen',
      'Authentiek leven'
    ],
    general: [
      'Dagelijkse inspiratie',
      'Leven in balans',
      'Positief denken',
      'Stress management',
      'Geluk vinden'
    ]
  };

  const conceptList = concepts[contentType as keyof typeof concepts] || concepts.spiritual;
  const conceptIndex = (week + videoIndex) % conceptList.length;
  
  return {
    title: conceptList[conceptIndex],
    description: `Een inspirerende video over ${topic.topic} - ${conceptList[conceptIndex].toLowerCase()}`,
    estimatedLength: '45-60 seconden',
    keyPoints: [
      'Krachtige opening hook',
      'Praktische tips en inzichten',  
      'Emotionele connectie',
      'Duidelijke call-to-action'
    ]
  };
}

function calculatePriority(contentType: string, topicScore: number, hour: number, optimalHours: number[]): string {
  let score = 0;
  
  // Content type priority
  if (contentType === 'spiritual') score += 30;
  else if (contentType === 'motivation') score += 25;
  else if (contentType === 'personal_growth') score += 20;
  else score += 10;
  
  // Topic performance
  score += topicScore * 0.5;
  
  // Timing optimization
  if (optimalHours.includes(hour)) score += 20;
  
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function estimateVideoPerformance(topicScore: number, hour: number, optimalHours: number[]) {
  let baseScore = topicScore;
  
  // Time bonus
  if (optimalHours.includes(hour)) {
    baseScore *= 1.2; // 20% bonus for optimal timing
  }
  
  return {
    expectedViews: Math.round(baseScore * 100 + Math.random() * 500),
    expectedEngagement: Number((baseScore * 0.05).toFixed(2)),
    confidence: baseScore > 85 ? 'high' : baseScore > 70 ? 'medium' : 'low'
  };
}

function generateCalendarSummary(calendar: any[]) {
  const totalVideos = calendar.reduce((sum, week) => sum + week.videos.length, 0);
  const highPriorityVideos = calendar.reduce((sum, week) => 
    sum + week.videos.filter((v: any) => v.priority === 'high').length, 0
  );
  
  const contentTypes = calendar.reduce((acc, week) => {
    week.videos.forEach((video: any) => {
      acc[video.contentType] = (acc[video.contentType] || 0) + 1;
    });
    return acc;
  }, {});
  
  const avgExpectedViews = calendar.reduce((sum, week) => 
    sum + week.videos.reduce((weekSum: number, video: any) => 
      weekSum + video.estimatedPerformance.expectedViews, 0
    ), 0
  ) / totalVideos;

  return {
    totalVideos,
    highPriorityVideos,
    contentDistribution: contentTypes,
    expectedAverageViews: Math.round(avgExpectedViews),
    totalWeeks: calendar.length,
    firstPublishDate: calendar[0]?.videos[0]?.scheduledDate,
    lastPublishDate: calendar[calendar.length - 1]?.videos[calendar[calendar.length - 1].videos.length - 1]?.scheduledDate
  };
}

export const getContentCalendar: any = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { userId, status }) => {
    let query = ctx.db
      .query("contentCalendars")
      .filter((q) => q.eq(q.field("userId"), userId));

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    const calendar = await query
      .order("desc")
      .first();

    return calendar;
  },
});

export const updateCalendarStatus: any = mutation({
  args: {
    calendarId: v.id("contentCalendars"),
    status: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { calendarId, status, userId }) => {
    const calendar = await ctx.db.get(calendarId);
    
    if (!calendar || calendar.userId !== userId) {
      throw new Error("Calendar not found or access denied");
    }

    await ctx.db.patch(calendarId, {
      status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const createVideoFromCalendarSlot: any = action({
  args: {
    calendarId: v.id("contentCalendars"),
    weekIndex: v.number(),
    videoIndex: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, { calendarId, weekIndex, videoIndex, userId }) => {
    try {
      const calendar = await ctx.db.get(calendarId);
      
      if (!calendar || calendar.userId !== userId) {
        throw new Error("Calendar not found or access denied");
      }

      const videoSlot = calendar.calendar[weekIndex]?.videos[videoIndex];
      if (!videoSlot) {
        throw new Error("Video slot not found");
      }

      // Create video idea from calendar slot
      const ideaId = await ctx.runMutation(internal.content.createVideoIdea, {
        userId,
        title: videoSlot.concept.title,
        description: videoSlot.concept.description,
        analysisData: {
          calendarGenerated: true,
          contentType: videoSlot.contentType,
          topic: videoSlot.topic,
          scheduledDate: videoSlot.scheduledDate,
          priority: videoSlot.priority
        },
      });

      // Update calendar to mark slot as created
      const updatedCalendar = { ...calendar.calendar };
      updatedCalendar[weekIndex].videos[videoIndex].status = 'created';
      updatedCalendar[weekIndex].videos[videoIndex].ideaId = ideaId;

      await ctx.db.patch(calendarId, {
        calendar: updatedCalendar,
        updatedAt: Date.now(),
      });

      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "create_video_from_calendar",
        status: "success",
        message: `Created video idea from calendar: ${videoSlot.concept.title}`,
        metadata: { ideaId, calendarId, weekIndex, videoIndex },
      });

      return {
        success: true,
        ideaId,
        videoSlot
      };

    } catch (error) {
      await ctx.runMutation(internal.systemLogs.create, {
        userId,
        action: "create_video_from_calendar",
        status: "error",
        message: `Failed to create video from calendar: ${error.message}`,
        metadata: { error: error.message, calendarId },
      });
      
      throw error;
    }
  },
});