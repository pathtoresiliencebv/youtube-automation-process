import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

async function handleRevIdWebhook(jobId: string, status: string, data: any) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  await client.connect()

  try {
    if (status === 'completed') {
      // Update video idea with completed video
      await client.query(
        `UPDATE video_ideas 
         SET video_url = $1, status = 'video_completed', updated_at = NOW() 
         WHERE revid_job_id = $2`,
        [data.videoUrl, jobId]
      )
    } else if (status === 'failed') {
      // Mark video as failed
      await client.query(
        `UPDATE video_ideas 
         SET status = 'failed', error_message = $1, updated_at = NOW() 
         WHERE revid_job_id = $2`,
        [data.error, jobId]
      )
    }

    // Log the webhook event
    await client.query(
      `INSERT INTO system_logs (action, level, message, metadata, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        'revid_webhook',
        status === 'failed' ? 'error' : 'info',
        `RevID job ${jobId} ${status}`,
        JSON.stringify({ jobId, status, ...data })
      ]
    )
  } finally {
    await client.end()
  }
}

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
        await handleRevIdWebhook(jobId, 'completed', { videoUrl });

        console.log(`RevID job ${jobId} completed successfully. Video URL: ${videoUrl}`);
        break;

      case 'failed':
      case 'error':
        // Handle failed video creation
        await handleRevIdWebhook(jobId, 'failed', { error: error || 'Video creation failed' });

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