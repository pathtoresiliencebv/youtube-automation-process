import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Find user by email and check password from preferences
      const result = await client.query(
        'SELECT id, email, full_name, created_at, youtube_channel_id, youtube_channel_title, preferences FROM users WHERE email = $1',
        [email]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      const user = result.rows[0]
      
      // Check password from preferences
      const preferences = user.preferences || {}
      if (preferences.password !== password) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          createdAt: user.created_at,
          youtubeChannelId: user.youtube_channel_id,
          youtubeChannelTitle: user.youtube_channel_title,
          youtubeConnected: !!user.youtube_channel_id
        }
      })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}