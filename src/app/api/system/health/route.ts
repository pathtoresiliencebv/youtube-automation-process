import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export async function GET(request: NextRequest) {
  try {
    // Run health check
    const healthStatus = await convex.action(api.errorHandling.healthCheck, {})

    return NextResponse.json({
      success: true,
      health: healthStatus,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'retry_failed') {
      // Retry failed jobs
      const retryResult = await convex.action(api.errorHandling.retryFailedJobs, {})
      
      return NextResponse.json({
        success: true,
        message: `Retried ${retryResult.retriedCount} out of ${retryResult.totalFailed} failed jobs`,
        result: retryResult
      })
    } else if (action === 'health_check') {
      // Manual health check
      const healthStatus = await convex.action(api.errorHandling.healthCheck, {})
      
      return NextResponse.json({
        success: true,
        health: healthStatus
      })
    } else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: retry_failed, health_check'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('System operation error:', error)
    
    return NextResponse.json({
      error: 'System operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}