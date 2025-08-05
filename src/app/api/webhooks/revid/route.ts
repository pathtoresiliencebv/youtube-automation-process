import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('RevID webhook received:', payload);

    // Extract relevant data from RevID webhook
    const {
      jobId,
      status,
      videoUrl,
      error,
      progress,
      estimatedTimeRemaining
    } = payload;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Handle different webhook events
    switch (status) {
      case 'processing':
      case 'in_progress':
        // Update progress if available
        console.log(`RevID job ${jobId} is processing... Progress: ${progress || 'unknown'}`);
        break;

      case 'completed':
      case 'success':
        if (!videoUrl) {
          console.error('Video URL missing from completion webhook');
          return NextResponse.json(
            { error: 'Video URL missing from completion webhook' },
            { status: 400 }
          );
        }

        // Handle successful video creation
        await convex.action(api.revid.handleWebhook, {
          jobId,
          status: 'completed',
          videoUrl,
        });

        console.log(`RevID job ${jobId} completed successfully. Video URL: ${videoUrl}`);
        break;

      case 'failed':
      case 'error':
        // Handle failed video creation
        await convex.action(api.revid.handleWebhook, {
          jobId,
          status: 'failed',
          error: error || 'Video creation failed',
        });

        console.error(`RevID job ${jobId} failed:`, error);
        break;

      default:
        console.log(`RevID job ${jobId} status update:`, status);
        break;
    }

    return NextResponse.json({ 
      success: true, 
      received: true,
      jobId,
      status 
    });

  } catch (error) {
    console.error('RevID webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process RevID webhook',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check for webhook endpoint
  return NextResponse.json({
    status: 'RevID webhook endpoint is active',
    timestamp: new Date().toISOString(),
    url: request.url
  });
}