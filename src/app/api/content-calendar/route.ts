import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active'

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query(
        `SELECT * FROM content_calendars 
         WHERE user_id = $1 AND status = $2 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, status]
      )

      const calendar = result.rows[0]
      if (calendar) {
        // Parse JSON fields
        const parsedCalendar = {
          ...calendar,
          calendar: typeof calendar.calendar === 'string' ? JSON.parse(calendar.calendar) : calendar.calendar,
          preferences: typeof calendar.preferences === 'string' ? JSON.parse(calendar.preferences) : calendar.preferences
        }
        return NextResponse.json(parsedCalendar)
      }

      return NextResponse.json(null)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Content calendar fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content calendar' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action, data } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      if (action === 'generate') {
        // Generate mock calendar - in production this would use AI
        const mockCalendar = generateMockCalendar(data.weeks, data.videosPerWeek, data.preferences)
        
        // Deactivate any existing active calendars
        await client.query(
          `UPDATE content_calendars SET status = 'inactive' WHERE user_id = $1 AND status = 'active'`,
          [userId]
        )

        // Create new calendar
        const result = await client.query(
          `INSERT INTO content_calendars (user_id, weeks, videos_per_week, calendar, preferences, status, created_at) 
           VALUES ($1, $2, $3, $4, $5, 'active', NOW()) RETURNING *`,
          [userId, data.weeks, data.videosPerWeek, JSON.stringify(mockCalendar), JSON.stringify(data.preferences)]
        )

        return NextResponse.json({ 
          success: true, 
          calendarId: result.rows[0].id,
          totalVideos: data.weeks * data.videosPerWeek
        })
      }

      if (action === 'update_status') {
        await client.query(
          `UPDATE content_calendars SET status = $1 WHERE id = $2 AND user_id = $3`,
          [data.status, data.calendarId, userId]
        )

        return NextResponse.json({ success: true })
      }

      if (action === 'create_video') {
        // This would create a video idea from a calendar slot
        // For now, just return success
        return NextResponse.json({ 
          success: true,
          videoSlot: { concept: { title: 'Mock video title' } }
        })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Content calendar action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform content calendar action' },
      { status: 500 }
    )
  }
}

function generateMockCalendar(weeks: number, videosPerWeek: number, preferences: any) {
  const calendar = []
  const contentTypes = ['spiritual', 'motivation', 'personal_growth', 'general']
  
  for (let week = 1; week <= weeks; week++) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + (week - 1) * 7)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    
    const videos = []
    for (let i = 0; i < videosPerWeek; i++) {
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)]
      const scheduledDate = new Date(startDate)
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 7))
      scheduledDate.setHours(preferences.optimalHours?.[Math.floor(Math.random() * preferences.optimalHours.length)] || 18, 0, 0)
      
      videos.push({
        contentType,
        priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
        concept: {
          title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Video ${week}-${i + 1}`
        },
        topic: `${contentType} onderwerp`,
        scheduledDate: scheduledDate.getTime(),
        estimatedPerformance: {
          expectedViews: Math.floor(Math.random() * 10000) + 1000
        },
        status: 'planned'
      })
    }
    
    calendar.push({
      week,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      videos
    })
  }
  
  return calendar
}