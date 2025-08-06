import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Build query with optional status filter
      let query = 'SELECT * FROM video_ideas WHERE user_id = $1'
      let params = [userId]

      if (status) {
        query += ' AND status = $2'
        params.push(status)
      }

      query += ' ORDER BY created_at DESC'

      const result = await client.query(query, params)

      return NextResponse.json(result.rows)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Video ideas fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video ideas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, status = 'pending_approval' } = await request.json()

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query(
        `INSERT INTO video_ideas (user_id, title, description, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
        [userId, title, description, status]
      )

      return NextResponse.json({ success: true, idea: result.rows[0] })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Video idea creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create video idea' },
      { status: 500 }
    )
  }
}