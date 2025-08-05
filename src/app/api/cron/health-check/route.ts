import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Running scheduled health check...')

    // Run health check
    const healthStatus = await convex.action(api.errorHandling.healthCheck, {})
    
    // Run retry for failed jobs
    const retryResult = await convex.action(api.errorHandling.retryFailedJobs, {})

    const report = {
      timestamp: Date.now(),
      health: healthStatus,
      retries: retryResult,
      summary: {
        systemStatus: healthStatus.status,
        stuckJobs: healthStatus.stuckJobs || 0,
        recentFailures: healthStatus.recentFailures || 0,
        retriedJobs: retryResult.retriedCount || 0,
        totalFailedJobs: retryResult.totalFailed || 0,
      }
    }

    console.log('Health check completed:', report.summary)

    // Log significant events
    if (healthStatus.stuckJobs > 0 || retryResult.retriedCount > 0) {
      console.warn('System issues detected:', {
        stuckJobs: healthStatus.stuckJobs,
        retriedJobs: retryResult.retriedCount
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Health check and retry completed',
      report
    })

  } catch (error) {
    console.error('Cron health check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Cron health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 })
  }
}