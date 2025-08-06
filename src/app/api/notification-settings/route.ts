import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query(
        `SELECT * FROM notification_settings WHERE user_id = $1`,
        [userId]
      )

      if (result.rows.length === 0) {
        // Return default settings if none exist
        const defaultSettings = {
          emailNotifications: true,
          pushNotifications: true,
          notificationTypes: {
            videoPublished: true,
            videoFailed: true,
            bulkOperations: true,
            systemAlerts: true,
            weeklyReports: true,
            quotaWarnings: true
          }
        }
        
        return NextResponse.json(defaultSettings)
      }

      const settings = result.rows[0]
      // Parse JSON fields
      const parsedSettings = {
        ...settings,
        notification_types: typeof settings.notification_types === 'string' 
          ? JSON.parse(settings.notification_types) 
          : settings.notification_types,
        // Map database fields to frontend structure
        emailNotifications: settings.email_notifications,
        pushNotifications: settings.push_notifications,
        notificationTypes: typeof settings.notification_types === 'string' 
          ? JSON.parse(settings.notification_types) 
          : settings.notification_types
      }

      return NextResponse.json(parsedSettings)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Notification settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, settings } = await request.json()

    if (!userId || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Check if settings exist
      const existingResult = await client.query(
        `SELECT id FROM notification_settings WHERE user_id = $1`,
        [userId]
      )

      if (existingResult.rows.length === 0) {
        // Insert new settings
        await client.query(
          `INSERT INTO notification_settings (user_id, email_notifications, push_notifications, notification_types, updated_at) 
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, settings.emailNotifications, settings.pushNotifications, JSON.stringify(settings.notificationTypes)]
        )
      } else {
        // Update existing settings
        await client.query(
          `UPDATE notification_settings 
           SET email_notifications = $2, push_notifications = $3, notification_types = $4, updated_at = NOW() 
           WHERE user_id = $1`,
          [userId, settings.emailNotifications, settings.pushNotifications, JSON.stringify(settings.notificationTypes)]
        )
      }

      return NextResponse.json({ success: true })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Notification settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}