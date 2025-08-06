import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      let query = 'SELECT * FROM notifications WHERE user_id = $1'
      let params = [userId]

      if (unreadOnly) {
        query += ' AND read = false'
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1)
      params.push(limit.toString())

      const result = await client.query(query, params)

      return NextResponse.json(result.rows)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, type, event, data } = await request.json()

    if (!userId || !type || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query(
        `INSERT INTO notifications (user_id, type, event, data, read, created_at) 
         VALUES ($1, $2, $3, $4, false, NOW()) RETURNING *`,
        [userId, type, event, JSON.stringify(data || {})]
      )

      return NextResponse.json({ success: true, notification: result.rows[0] })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Notification creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}