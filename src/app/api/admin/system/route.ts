import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

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

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      switch (action) {
        case 'cleanup-logs':
          const olderThanDays = params.olderThanDays || 30
          const cleanupResult = await client.query(
            `DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'`
          )
          result = {
            deletedRows: cleanupResult.rowCount || 0,
            olderThanDays
          }
          break

        case 'database-stats':
          const statsResult = await client.query(`
            SELECT 
              (SELECT COUNT(*) FROM users) as total_users,
              (SELECT COUNT(*) FROM video_ideas) as total_video_ideas,
              (SELECT COUNT(*) FROM notifications) as total_notifications,
              (SELECT COUNT(*) FROM system_logs) as total_logs
          `)
          result = statsResult.rows[0]
          break

        case 'user-activity':
          const timeRange = params.timeRange || '24h'
          let interval = '24 hours'
          switch (timeRange) {
            case '1h': interval = '1 hour'; break
            case '7d': interval = '7 days'; break
            case '30d': interval = '30 days'; break
          }
          
          const activityResult = await client.query(`
            SELECT user_id, COUNT(*) as activity_count, MAX(created_at) as last_activity
            FROM system_logs 
            WHERE created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY user_id 
            ORDER BY activity_count DESC 
            LIMIT ${params.limit || 20}
          `)
          result = activityResult.rows
          break

        case 'restart-services':
          // Simulate service restart (in a real app, you'd implement actual service management)
          result = {
            success: true,
            message: 'Service restart initiated',
            services: ['postgres', 'api-server', 'cron-jobs'],
            timestamp: Date.now()
          }
          break

        case 'system-config':
          // Get system configuration
          result = {
            environment: process.env.NODE_ENV,
            version: '1.0.0',
            services: {
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
    } finally {
      await client.end()
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