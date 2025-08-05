import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const userSession = cookieStore.get('user_session')

    if (!userSession) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userData = JSON.parse(userSession.value)
    
    // Check if token is expired
    if (userData.tokenExpiry && Date.now() > userData.tokenExpiry) {
      // Token expired, remove session
      cookieStore.delete('user_session')
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Remove sensitive data before sending to client
    const { accessToken, refreshToken, ...safeUserData } = userData

    return NextResponse.json(safeUserData)
    
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 })
  }
}