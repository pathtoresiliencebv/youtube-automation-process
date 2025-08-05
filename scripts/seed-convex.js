#!/usr/bin/env node

// Convex seeding script
// This will populate the Convex database with sample data

const sampleData = {
  users: [
    {
      email: 'demo@youtube-automation.com',
      name: 'Demo User',
      youtubeChannelId: 'UCdemoChannel123',
      youtubeChannelTitle: 'Motivational Content Channel',
      subscriptionTier: 'pro'
    }
  ],
  
  videoIdeas: [
    {
      title: '🌟 De Kracht van Positief Denken',
      description: 'Uitleg over hoe positieve gedachten je leven kunnen transformeren',
      status: 'approved',
      performancePrediction: 88.5,
      keywords: ['motivatie', 'positief denken', 'mindset'],
      aiGenerated: true
    },
    {
      title: '💼 Entrepreneurship Tips voor Beginners', 
      description: 'Praktische tips voor startende ondernemers',
      status: 'pending',
      performancePrediction: 85.2,
      keywords: ['business', 'ondernemen', 'tips'],
      aiGenerated: true
    },
    {
      title: '🏃‍♂️ Discipline vs Motivatie: Wat Werkt?',
      description: 'Het verschil tussen discipline en motivatie uitgelegd',
      status: 'approved', 
      performancePrediction: 90.1,
      keywords: ['discipline', 'motivatie', 'gewoontes'],
      aiGenerated: true
    },
    {
      title: '📚 Boeken die Mijn Leven Veranderden',
      description: 'Top 5 boeken voor persoonlijke ontwikkeling',
      status: 'pending',
      performancePrediction: 83.7,
      keywords: ['boeken', 'lezen', 'ontwikkeling'],
      aiGenerated: true
    }
  ],

  youtubeAnalytics: [
    {
      videoId: 'dQw4w9WgXcQ',
      title: '🔥 Motivatie voor Elke Dag - Transform Je Leven!',
      viewCount: 125000,
      likeCount: 3400,
      commentCount: 280,
      performanceScore: 87.5,
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      videoId: 'oHg5SJYRHA0',
      title: '💪 5 Gewoonten van Succesvolle Mensen',
      viewCount: 89000,
      likeCount: 2100,
      commentCount: 150,
      performanceScore: 82.3,
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      videoId: 'ScMzIvxBSi4',
      title: '🚀 Van Falen naar Succes: Mijn Verhaal',
      viewCount: 156000,
      likeCount: 4200,
      commentCount: 320,
      performanceScore: 91.2,
      publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      videoId: 'astISOttCQ0',
      title: '⚡ Morning Routine die Alles Verandert',
      viewCount: 78000,
      likeCount: 1800,
      commentCount: 95,
      performanceScore: 76.8,
      publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      videoId: 'SQoA_wjmE9w',
      title: '🧠 Mindset Shift: Think Like a Winner',
      viewCount: 203000,
      likeCount: 5600,
      commentCount: 450,
      performanceScore: 94.7,
      publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],

  systemLogs: [
    {
      action: 'user_registered',
      status: 'success',
      message: 'Demo user registered successfully',
      metadata: { channel: 'Motivational Content Channel' }
    },
    {
      action: 'video_analysis_completed',
      status: 'success', 
      message: 'YouTube analytics analysis completed',
      metadata: { videosAnalyzed: 5, avgPerformance: 86.5 }
    },
    {
      action: 'content_generated',
      status: 'success',
      message: 'AI-generated video ideas created',
      metadata: { type: 'video_ideas', count: 4 }
    },
    {
      action: 'system_startup',
      status: 'info',
      message: 'YouTube Automation System started',
      metadata: { version: '1.0.0', environment: 'production' }
    }
  ]
};

console.log('📦 Convex Sample Data Package Created');
console.log('🎯 Contains:');
console.log(`   • ${sampleData.users.length} Demo user`);
console.log(`   • ${sampleData.videoIdeas.length} AI-generated video ideas`); 
console.log(`   • ${sampleData.youtubeAnalytics.length} Sample YouTube videos with analytics`);
console.log(`   • ${sampleData.systemLogs.length} System activity logs`);
console.log('');
console.log('💡 To seed Convex database:');
console.log('   1. Run: npx convex dev');
console.log('   2. Use Convex dashboard to import this data');
console.log('   3. Or create mutations to insert this data programmatically');
console.log('');
console.log('📋 Sample data structure ready for Convex deployment!');

// Export for potential programmatic use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = sampleData;
}