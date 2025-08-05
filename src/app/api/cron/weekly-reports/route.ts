import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🗓️ Starting weekly reports cron job')

    // Trigger weekly summary notifications
    await convex.action(api.notifications.triggerWeeklySummaryNotifications, {})

    console.log('✅ Weekly reports sent successfully')

    return NextResponse.json({
      success: true,
      message: 'Weekly reports sent to all users',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Weekly reports cron job failed:', error)
    
    return NextResponse.json({
      error: 'Weekly reports job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'Weekly reports cron endpoint',
      schedule: 'Runs every Monday at 09:00 AM',
      lastRun: 'Check logs for execution history'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Health check failed'
    }, { status: 500 })
  }
}