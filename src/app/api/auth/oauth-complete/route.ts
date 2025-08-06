import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const { channelId, channelName, refreshToken } = await request.json()

    if (!channelId || !channelName) {
      return NextResponse.json({ error: 'Missing channel information' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Check if user exists with this channel ID
      let result = await client.query(
        'SELECT id, email, full_name FROM users WHERE youtube_channel_id = $1',
        [channelId]
      )

      let user
      if (result.rows.length === 0) {
        // Create new user with YouTube data
        const email = `${channelId}@youtube.oauth` // Temporary email for OAuth users
        result = await client.query(
          `INSERT INTO users (email, full_name, youtube_channel_id, youtube_channel_title, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, email, full_name`,
          [email, channelName, channelId, channelName]
        )
        user = result.rows[0]
      } else {
        // Update existing user
        await client.query(
          `UPDATE users SET youtube_channel_title = $1, updated_at = NOW() WHERE youtube_channel_id = $2`,
          [channelName, channelId]
        )
        user = result.rows[0]
      }

      // Create user session data
      const sessionData = {
        id: user.id,
        email: user.email,
        name: user.full_name || channelName,
        youtubeChannelId: channelId,
        youtubeChannelTitle: channelName,
        youtubeConnected: true,
        refreshToken: refreshToken,
        tokenExpiry: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }

      // Set session cookie
      const response = NextResponse.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name || channelName,
          youtubeChannelId: channelId,
          youtubeChannelTitle: channelName,
          youtubeConnected: true
        }
      })

      // Set cookie with session data
      response.cookies.set('user_session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      })

      return response

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('OAuth complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete OAuth' },
      { status: 500 }
    )
  }
}