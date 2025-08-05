import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const notificationData = await request.json()

    const { userId, userEmail, userName, type, event, data } = notificationData

    if (!userId || !userEmail || !userName || !type || !event) {
      return NextResponse.json({
        error: 'Missing required fields: userId, userEmail, userName, type, event'
      }, { status: 400 })
    }

    // Send email notification
    const success = await emailService.sendNotification({
      userId,
      userEmail,
      userName,
      type,
      event,
      data: data || {}
    })

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Email notification sent successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send email notification'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Email notification API error:', error)
    
    return NextResponse.json({
      error: 'Failed to send email notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    return NextResponse.json({
      status: 'Email notification service is running',
      configured: !!process.env.RESEND_API_KEY,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Email service health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}