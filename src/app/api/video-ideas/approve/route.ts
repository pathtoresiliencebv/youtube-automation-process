import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json()

    if (!ideaId) {
      return NextResponse.json({ error: 'Missing ideaId' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Update the video idea status to approved
      const result = await client.query(
        `UPDATE video_ideas 
         SET status = 'approved', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [ideaId]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Video idea not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, idea: result.rows[0] })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Video idea approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve video idea' },
      { status: 500 }
    )
  }
}