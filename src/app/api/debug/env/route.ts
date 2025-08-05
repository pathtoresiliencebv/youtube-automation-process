import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Only show this in development or with a secret parameter
    const secret = request.nextUrl.searchParams.get('secret')
    
    if (process.env.NODE_ENV === 'production' && secret !== 'debug-env-check') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
    }

    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasYouTubeClientId: !!process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID,
      hasYouTubeClientSecret: !!process.env.YOUTUBE_CLIENT_SECRET,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasRevidKey: !!process.env.REVID_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasCronSecret: !!process.env.CRON_SECRET,
      
      // Show partial values (masked for security)
      youtubeClientIdPreview: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID?.substring(0, 20) + '...',
      appUrlValue: process.env.NEXT_PUBLIC_APP_URL,
      convexUrlValue: process.env.NEXT_PUBLIC_CONVEX_URL,
      
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      status: 'Environment check completed',
      environment: envCheck,
      missingVariables: Object.entries(envCheck)
        .filter(([key, value]) => key.startsWith('has') && !value)
        .map(([key]) => key.replace('has', '').toLowerCase()),
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}