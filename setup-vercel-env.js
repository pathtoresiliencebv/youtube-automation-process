#!/usr/bin/env node

// Environment variables setup for Vercel deployment
const envVars = {
  // Convex Configuration
  'CONVEX_DEPLOYMENT': 'your-deployment-name',
  'NEXT_PUBLIC_CONVEX_URL': 'https://your-deployment-name.convex.cloud',
  
  // Database
  'DATABASE_URL': 'postgresql://neondb_owner:npg_ThNue72ifvPW@ep-billowing-meadow-aeydp78q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  
  // YouTube API
  'YOUTUBE_CLIENT_ID': 'your-actual-youtube-client-id',
  'YOUTUBE_CLIENT_SECRET': 'your-actual-youtube-client-secret', 
  
  // Google AI (Gemini)
  'GEMINI_API_KEY': 'your-actual-gemini-api-key',
  
  // RevID API
  'REVID_API_KEY': 'your-actual-revid-api-key',
  
  // App Configuration - will be updated after deployment
  'NEXT_PUBLIC_APP_URL': 'https://youtube-automation.vercel.app',
  'NEXTAUTH_URL': 'https://youtube-automation.vercel.app',
  'NEXTAUTH_SECRET': 'generated-secret-key-here'
};

console.log('🚀 YouTube Automation - Environment Variables Template');
console.log('='.repeat(60));
console.log('\n📋 Set these environment variables in Vercel Dashboard:');
console.log('   https://vercel.com/dashboard → Project → Settings → Environment Variables\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n🔧 Setup Instructions:');
console.log('1. Go to Vercel Dashboard');
console.log('2. Select your project: youtube-automation'); 
console.log('3. Go to Settings → Environment Variables');
console.log('4. Add each variable above with your actual values');
console.log('5. Redeploy the project');

console.log('\n⚠️  Important: Replace placeholder values with your actual API keys!');