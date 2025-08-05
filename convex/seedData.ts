import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDatabase: any = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Starting database seeding...");

    // Create demo user
    const userId = await ctx.db.insert("users", {
      email: "demo@youtube-automation.com",
      name: "Demo User",
      youtubeChannelId: "UCdemoChannel123",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("👤 Demo user created:", userId);

    // Create sample video ideas
    const videoIdeas = [
      {
        userId,
        title: "🌟 De Kracht van Positief Denken",
        description: "Uitleg over hoe positieve gedachten je leven kunnen transformeren",
        status: "approved" as const,
        generatedFromAnalysis: {
          topVideos: [{
            videoId: "sample1",
            title: "Sample Video",
            views: 10000,
            watchTime: 300,
            ctr: 5.2,
            subscribers: 50,
            performanceScore: 88.5,
          }],
          analysisDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        userId,
        title: "💼 Entrepreneurship Tips voor Beginners",
        description: "Praktische tips voor startende ondernemers",
        status: "pending_approval" as const,
        generatedFromAnalysis: {
          topVideos: [{
            videoId: "sample2",
            title: "Sample Video 2",
            views: 8000,
            watchTime: 250,
            ctr: 4.8,
            subscribers: 35,
            performanceScore: 85.2,
          }],
          analysisDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        userId,
        title: "🏃‍♂️ Discipline vs Motivatie: Wat Werkt?",
        description: "Het verschil tussen discipline en motivatie uitgelegd",
        status: "approved" as const,
        generatedFromAnalysis: {
          topVideos: [{
            videoId: "sample3",
            title: "Sample Video 3",
            views: 12000,
            watchTime: 320,
            ctr: 6.1,
            subscribers: 65,
            performanceScore: 90.1,
          }],
          analysisDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        userId,
        title: "📚 Boeken die Mijn Leven Veranderden",
        description: "Top 5 boeken voor persoonlijke ontwikkeling",
        status: "pending_approval" as const,
        generatedFromAnalysis: {
          topVideos: [{
            videoId: "sample4",
            title: "Sample Video 4",
            views: 7500,
            watchTime: 280,
            ctr: 4.5,
            subscribers: 30,
            performanceScore: 83.7,
          }],
          analysisDate: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    for (const idea of videoIdeas) {
      await ctx.db.insert("videoIdeas", idea);
    }

    console.log("💡 Video ideas created:", videoIdeas.length);

    // Create sample YouTube analytics
    const youtubeAnalytics = [
      {
        userId,
        videoId: "dQw4w9WgXcQ",
        title: "🔥 Motivatie voor Elke Dag - Transform Je Leven!",
        views: 125000,
        watchTime: 450,
        ctr: 8.5,
        subscribers: 120,
        performanceScore: 87.5,
        publishedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        analyzedAt: Date.now(),
      },
      {
        userId,
        videoId: "oHg5SJYRHA0",
        title: "💪 5 Gewoonten van Succesvolle Mensen",
        views: 89000,
        watchTime: 380,
        ctr: 7.2,
        subscribers: 85,
        performanceScore: 82.3,
        publishedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        analyzedAt: Date.now(),
      },
      {
        userId,
        videoId: "ScMzIvxBSi4",
        title: "🚀 Van Falen naar Succes: Mijn Verhaal",
        views: 156000,
        watchTime: 520,
        ctr: 9.1,
        subscribers: 145,
        performanceScore: 91.2,
        publishedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        analyzedAt: Date.now(),
      },
      {
        userId,
        videoId: "astISOttCQ0",
        title: "⚡ Morning Routine die Alles Verandert",
        views: 78000,
        watchTime: 320,
        ctr: 6.8,
        subscribers: 65,
        performanceScore: 76.8,
        publishedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        analyzedAt: Date.now(),
      },
      {
        userId,
        videoId: "SQoA_wjmE9w",
        title: "🧠 Mindset Shift: Think Like a Winner",
        views: 203000,
        watchTime: 580,
        ctr: 10.2,
        subscribers: 180,
        performanceScore: 94.7,
        publishedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        analyzedAt: Date.now(),
      },
    ];

    for (const analytics of youtubeAnalytics) {
      await ctx.db.insert("youtubeAnalytics", analytics);
    }

    console.log("📊 YouTube analytics created:", youtubeAnalytics.length);

    // Create system logs
    const systemLogs = [
      {
        userId,
        action: "user_registered",
        status: "success" as const,
        message: "Demo user registered successfully",
        metadata: { channel: "Motivational Content Channel" },
        timestamp: Date.now(),
      },
      {
        userId,
        action: "video_analysis_completed",
        status: "success" as const,
        message: "YouTube analytics analysis completed",
        metadata: { videosAnalyzed: 5, avgPerformance: 86.5 },
        timestamp: Date.now(),
      },
      {
        userId,
        action: "content_generated",
        status: "success" as const,
        message: "AI-generated video ideas created",
        metadata: { type: "video_ideas", count: 4 },
        timestamp: Date.now(),
      },
      {
        userId: null,
        action: "system_startup",
        status: "info" as const,
        message: "YouTube Automation System started",
        metadata: { version: "1.0.0", environment: "production" },
        timestamp: Date.now(),
      },
    ];

    for (const log of systemLogs) {
      await ctx.db.insert("systemLogs", log);
    }

    console.log("📝 System logs created:", systemLogs.length);

    console.log("✅ Database seeding completed successfully!");
    
    return {
      success: true,
      data: {
        userId,
        videoIdeas: videoIdeas.length,
        youtubeAnalytics: youtubeAnalytics.length,
        systemLogs: systemLogs.length,
      },
    };
  },
});