import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, notificationType = 'video_published' } = await request.json()

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required'
      }, { status: 400 })
    }

    let testData;
    let type = 'success';

    switch (notificationType) {
      case 'video_published':
        testData = {
          title: 'Test Video - De Kracht van Positief Denken',
          description: 'Dit is een test video om de notificatie functionaliteit te testen.',
          status: 'published',
          youtubeVideoId: 'dQw4w9WgXcQ',
          performanceScore: 87,
          scheduledDate: Date.now()
        };
        break;

      case 'video_failed':
        type = 'error';
        testData = {
          title: 'Test Video - Mislukte Upload',
          status: 'failed',
          error: 'API quota exceeded - test error',
          retryCount: 2,
          lastAttempt: Date.now()
        };
        break;

      case 'bulk_operation_completed':
        testData = {
          operation: 'bulk_approve',
          successful: 8,
          failed: 2,
          total: 10
        };
        break;

      case 'system_alert':
        type = 'warning';
        testData = {
          title: 'Test System Alert',
          message: 'Dit is een test systeem waarschuwing om de notificatie functionaliteit te verifiëren.',
          details: 'Alle systemen functioneren normaal. Dit is alleen een test.'
        };
        break;

      case 'weekly_summary':
        type = 'info';
        testData = {
          week: `${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL')} - ${new Date().toLocaleDateString('nl-NL')}`,
          videosCreated: 12,
          videosPublished: 8,
          totalViews: 45620,
          avgPerformance: 82,
          topVideo: {
            title: 'Test Top Video - Spirituele Groei',
            views: 18950,
            likes: 1205
          }
        };
        break;

      default:
        return NextResponse.json({
          error: 'Invalid notification type. Supported: video_published, video_failed, bulk_operation_completed, system_alert, weekly_summary'
        }, { status: 400 })
    }

    // Send test notification
    const result = await convex.action(api.notifications.sendNotification, {
      userId: userId as any,
      type: type as any,
      event: notificationType,
      data: testData,
      sendEmail: true
    });

    return NextResponse.json({
      success: true,
      message: `Test ${notificationType} notification sent successfully`,
      notificationId: result.notificationId,
      testData
    })

  } catch (error) {
    console.error('Test notification error:', error)
    
    return NextResponse.json({
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'Email notification test endpoint',
      availableTypes: [
        'video_published',
        'video_failed', 
        'bulk_operation_completed',
        'system_alert',
        'weekly_summary'
      ],
      usage: 'POST with { userId, notificationType }',
      environment: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.FROM_EMAIL || 'noreply@contentcatalyst.com',
        appUrl: process.env.NEXT_PUBLIC_APP_URL
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Health check failed'
    }, { status: 500 })
  }
}