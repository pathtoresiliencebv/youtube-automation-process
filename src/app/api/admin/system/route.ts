import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { action, adminUserId, ...params } = await request.json()

    if (!adminUserId) {
      return NextResponse.json({
        error: 'Admin user ID is required'
      }, { status: 400 })
    }

    let result;

    switch (action) {
      case 'cleanup-logs':
        const olderThanDays = params.olderThanDays || 30
        result = await convex.action(api.admin.cleanupOldLogs, {
          olderThanDays,
          adminUserId: adminUserId as any,
        })
        break

      case 'database-stats':
        result = await convex.query(api.admin.getSystemResourceUsage, {})
        break

      case 'user-activity':
        result = await convex.query(api.admin.getUserActivity, {
          timeRange: params.timeRange || '24h',
          limit: params.limit || 20
        })
        break

      case 'restart-services':
        // Simulate service restart (in a real app, you'd implement actual service management)
        result = {
          success: true,
          message: 'Service restart initiated',
          services: ['convex', 'api-server', 'cron-jobs'],
          timestamp: Date.now()
        }
        break

      case 'system-config':
        // Get system configuration
        result = {
          environment: process.env.NODE_ENV,
          version: '1.0.0',
          services: {
            convex: !!process.env.NEXT_PUBLIC_CONVEX_URL,
            postgres: !!process.env.DATABASE_URL,
            gemini: !!process.env.GEMINI_API_KEY,
            revid: !!process.env.REVID_API_KEY,
            youtube: !!process.env.YOUTUBE_CLIENT_SECRET,
          },
          features: {
            bulkOperations: true,
            analytics: true,
            adminPanel: true,
            errorRecovery: true,
          }
        }
        break

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: cleanup-logs, database-stats, user-activity, restart-services, system-config'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Admin system action error:', error)
    
    return NextResponse.json({
      error: 'System action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}