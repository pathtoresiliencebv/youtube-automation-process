import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const adminUserId = searchParams.get('adminUserId')
    const timeRange = searchParams.get('timeRange') || '24h'

    if (!adminUserId) {
      return NextResponse.json({ error: 'Missing adminUserId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Calculate time range
      let timeFilter = "created_at >= NOW() - INTERVAL '24 hours'"
      switch (timeRange) {
        case '1h':
          timeFilter = "created_at >= NOW() - INTERVAL '1 hour'"
          break
        case '7d':
          timeFilter = "created_at >= NOW() - INTERVAL '7 days'"
          break
        case '30d':
          timeFilter = "created_at >= NOW() - INTERVAL '30 days'"
          break
      }

      // Get active users count
      const activeUsersResult = await client.query(
        `SELECT COUNT(DISTINCT user_id) as count FROM system_logs WHERE ${timeFilter}`
      )

      // Get videos created count
      const videosCreatedResult = await client.query(
        `SELECT COUNT(*) as count FROM video_ideas WHERE ${timeFilter}`
      )

      const stats = {
        activeUsers: parseInt(activeUsersResult.rows[0]?.count || '0'),
        videosCreated: parseInt(videosCreatedResult.rows[0]?.count || '0'),
        timeRange
      }

      return NextResponse.json(stats)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}