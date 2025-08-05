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
      youtubeChannelTitle: "Motivational Content Channel",
      subscriptionTier: "pro",
      createdAt: Date.now(),
    });

    console.log("👤 Demo user created:", userId);

    // Create sample video ideas
    const videoIdeas = [
      {
        userId,
        title: "🌟 De Kracht van Positief Denken",
        description: "Uitleg over hoe positieve gedachten je leven kunnen transformeren",
        status: "approved" as const,
        performancePrediction: 88.5,
        keywords: ["motivatie", "positief denken", "mindset"],
        aiGenerated: true,
        createdAt: Date.now(),
      },
      {
        userId,
        title: "💼 Entrepreneurship Tips voor Beginners",
        description: "Praktische tips voor startende ondernemers",
        status: "pending" as const,
        performancePrediction: 85.2,
        keywords: ["business", "ondernemen", "tips"],
        aiGenerated: true,
        createdAt: Date.now(),
      },
      {
        userId,
        title: "🏃‍♂️ Discipline vs Motivatie: Wat Werkt?",
        description: "Het verschil tussen discipline en motivatie uitgelegd",
        status: "approved" as const,
        performancePrediction: 90.1,
        keywords: ["discipline", "motivatie", "gewoontes"],
        aiGenerated: true,
        createdAt: Date.now(),
      },
      {
        userId,
        title: "📚 Boeken die Mijn Leven Veranderden",
        description: "Top 5 boeken voor persoonlijke ontwikkeling",
        status: "pending" as const,
        performancePrediction: 83.7,
        keywords: ["boeken", "lezen", "ontwikkeling"],
        aiGenerated: true,
        createdAt: Date.now(),
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
        youtubeVideoId: "dQw4w9WgXcQ",
        title: "🔥 Motivatie voor Elke Dag - Transform Je Leven!",
        viewCount: 125000,
        likeCount: 3400,
        commentCount: 280,
        performanceScore: 87.5,
        publishedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      },
      {
        userId,
        youtubeVideoId: "oHg5SJYRHA0",
        title: "💪 5 Gewoonten van Succesvolle Mensen",
        viewCount: 89000,
        likeCount: 2100,
        commentCount: 150,
        performanceScore: 82.3,
        publishedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      },
      {
        userId,
        youtubeVideoId: "ScMzIvxBSi4",
        title: "🚀 Van Falen naar Succes: Mijn Verhaal",
        viewCount: 156000,
        likeCount: 4200,
        commentCount: 320,
        performanceScore: 91.2,
        publishedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      },
      {
        userId,
        youtubeVideoId: "astISOttCQ0",
        title: "⚡ Morning Routine die Alles Verandert",
        viewCount: 78000,
        likeCount: 1800,
        commentCount: 95,
        performanceScore: 76.8,
        publishedAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      },
      {
        userId,
        youtubeVideoId: "SQoA_wjmE9w",
        title: "🧠 Mindset Shift: Think Like a Winner",
        viewCount: 203000,
        likeCount: 5600,
        commentCount: 450,
        performanceScore: 94.7,
        publishedAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
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
        createdAt: Date.now(),
      },
      {
        userId,
        action: "video_analysis_completed",
        status: "success" as const,
        message: "YouTube analytics analysis completed",
        metadata: { videosAnalyzed: 5, avgPerformance: 86.5 },
        createdAt: Date.now(),
      },
      {
        userId,
        action: "content_generated",
        status: "success" as const,
        message: "AI-generated video ideas created",
        metadata: { type: "video_ideas", count: 4 },
        createdAt: Date.now(),
      },
      {
        userId: null,
        action: "system_startup",
        status: "info" as const,
        message: "YouTube Automation System started",
        metadata: { version: "1.0.0", environment: "production" },
        createdAt: Date.now(),
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