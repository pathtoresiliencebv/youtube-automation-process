import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    // Create content_calendars table
    await client.query(`
      CREATE TABLE IF NOT EXISTS content_calendars (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        weeks INTEGER NOT NULL,
        videos_per_week INTEGER NOT NULL,
        calendar JSONB,
        preferences JSONB,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_content_calendars_user_id ON content_calendars(user_id);
      CREATE INDEX IF NOT EXISTS idx_content_calendars_status ON content_calendars(status);
      CREATE INDEX IF NOT EXISTS idx_content_calendars_created ON content_calendars(created_at);
    `)

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Content calendar table created successfully' 
    })

  } catch (error) {
    console.error('Error creating content calendar table:', error)
    return NextResponse.json(
      { error: 'Failed to create content calendar table', details: error.message },
      { status: 500 }
    )
  }
}