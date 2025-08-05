import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get user session from cookie
    const userSessionCookie = request.cookies.get('user_session')

    if (!userSessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userData = JSON.parse(userSessionCookie.value)
    
    // Check if token is expired
    if (userData.tokenExpiry && Date.now() > userData.tokenExpiry) {
      // Token expired
      const response = NextResponse.json({ error: 'Token expired' }, { status: 401 })
      response.cookies.delete('user_session')
      return response
    }

    // Remove sensitive data before sending to client
    const { accessToken, refreshToken, ...safeUserData } = userData

    return NextResponse.json(safeUserData)
    
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 })
  }
}