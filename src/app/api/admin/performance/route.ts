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

      // Get performance metrics
      const videoSuccessResult = await client.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'published' THEN 1 END) as successful
         FROM video_ideas WHERE ${timeFilter}`
      )

      const apiCallsResult = await client.query(
        `SELECT COUNT(*) as count FROM system_logs WHERE ${timeFilter} AND action LIKE '%api%'`
      )

      const total = parseInt(videoSuccessResult.rows[0]?.total || '0')
      const successful = parseInt(videoSuccessResult.rows[0]?.successful || '0')
      const apiCalls = parseInt(apiCallsResult.rows[0]?.count || '0')

      const metrics = {
        avgResponseTime: Math.floor(Math.random() * 500 + 100), // Mock data
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        videoCreationRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        totalApiCalls: apiCalls,
        timeRange
      }

      return NextResponse.json(metrics)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Admin performance fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}