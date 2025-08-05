import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url))
  }

  // Verify we have an authorization code
  if (!code) {
    console.error('No authorization code received')
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()
    
    // Get user info from YouTube API
    const userResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to get user info')
      return NextResponse.redirect(new URL('/?error=user_info_failed', request.url))
    }

    const userData = await userResponse.json()
    const channel = userData.items?.[0]

    if (!channel) {
      console.error('No YouTube channel found')
      return NextResponse.redirect(new URL('/?error=no_channel', request.url))
    }

    // Create user session object
    const userSession = {
      id: channel.id,
      name: channel.snippet.title,
      channelId: channel.id,
      channelName: channel.snippet.title,
      thumbnailUrl: channel.snippet.thumbnails?.default?.url || '',
      youtubeConnected: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
    }

    // Create redirect response and set session cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.set('user_session', JSON.stringify(userSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url))
  }
}