import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Add mock analytics data
      const mockAnalytics = [
        {
          userId: '553612d4-4979-4e47-b6d3-c48ab88077a0',
          videoId: 'abc123',
          title: '7 Dagelijkse Gewoontes Die Je Leven Veranderen',
          views: 15420,
          watchTime: 8640,
          ctr: 4.2,
          subscribers: 485,
          performanceScore: 82
        },
        {
          userId: '553612d4-4979-4e47-b6d3-c48ab88077a0',
          videoId: 'def456', 
          title: 'Waarom Falen De Beste Leraar Is',
          views: 22105,
          watchTime: 12450,
          ctr: 5.8,
          subscribers: 672,
          performanceScore: 91
        },
        {
          userId: '553612d4-4979-4e47-b6d3-c48ab88077a0',
          videoId: 'ghi789',
          title: 'De Kracht van Small Steps',
          views: 8950,
          watchTime: 5220,
          ctr: 3.4,
          subscribers: 298,
          performanceScore: 75
        }
      ]

      for (const analytics of mockAnalytics) {
        await client.query(
          `INSERT INTO youtube_analytics (user_id, video_id, title, views, watch_time, ctr, subscribers, performance_score, published_at, analyzed_at, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '7 days', NOW(), NOW())`,
          [analytics.userId, analytics.videoId, analytics.title, analytics.views, analytics.watchTime, analytics.ctr, analytics.subscribers, analytics.performanceScore]
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Mock analytics data added successfully',
        count: mockAnalytics.length
      })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Debug seed analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to seed analytics', details: error.message },
      { status: 500 }
    )
  }
}