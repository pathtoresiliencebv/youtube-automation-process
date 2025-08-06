import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const { notificationId, userId, markAll } = await request.json()

    if (!userId || (!notificationId && !markAll)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      let result
      
      if (markAll) {
        // Mark all notifications as read for user
        result = await client.query(
          `UPDATE notifications 
           SET read = true, read_at = NOW() 
           WHERE user_id = $1 AND read = false
           RETURNING *`,
          [userId]
        )
      } else {
        // Mark specific notification as read
        result = await client.query(
          `UPDATE notifications 
           SET read = true, read_at = NOW() 
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [notificationId, userId]
        )
      }

      return NextResponse.json({ 
        success: true, 
        updatedCount: result.rowCount,
        notifications: result.rows 
      })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Mark notification as read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}