import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    // Create notification_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        notification_types JSONB DEFAULT '{
          "videoPublished": true,
          "videoFailed": true,
          "bulkOperations": true,
          "systemAlerts": true,
          "weeklyReports": true,
          "quotaWarnings": true
        }',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `)

    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
    `)

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Notification settings table created successfully' 
    })

  } catch (error) {
    console.error('Error creating notification settings table:', error)
    return NextResponse.json(
      { error: 'Failed to create notification settings table', details: error.message },
      { status: 500 }
    )
  }
}