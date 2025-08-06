import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Get top performing videos from youtube_analytics table
      const topVideosResult = await client.query(
        `SELECT * FROM youtube_analytics 
         WHERE user_id = $1 
         ORDER BY performance_score DESC 
         LIMIT 5`,
        [userId]
      )

      // Get recent video ideas performance
      const recentIdeasResult = await client.query(
        `SELECT status, COUNT(*) as count 
         FROM video_ideas 
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY status`,
        [userId]
      )

      // Calculate summary stats
      const totalViews = topVideosResult.rows.reduce((sum, video) => sum + parseInt(video.views || 0), 0)
      const totalWatchTime = topVideosResult.rows.reduce((sum, video) => sum + parseInt(video.watch_time || 0), 0)
      const avgPerformanceScore = topVideosResult.rows.length > 0 
        ? topVideosResult.rows.reduce((sum, video) => sum + (video.performance_score || 0), 0) / topVideosResult.rows.length 
        : 0

      const analytics = {
        topVideos: topVideosResult.rows,
        recentIdeasStats: recentIdeasResult.rows,
        summary: {
          totalViews,
          totalWatchTime,
          avgPerformanceScore,
          totalVideos: topVideosResult.rows.length
        }
      }

      return NextResponse.json(analytics)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}