import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json({ error: 'Missing adminUserId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Mock active jobs - in production this would come from a job queue
      const mockJobs = [
        {
          id: 1,
          action: 'video_creation',
          user_id: 'user-123',
          status: 'running',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          action: 'content_analysis',
          user_id: 'user-456',
          status: 'pending',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        }
      ]

      return NextResponse.json(mockJobs)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Admin active jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active jobs' },
      { status: 500 }
    )
  }
}