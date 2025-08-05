import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import axios from 'axios';

const youtube = google.youtube('v3');

export async function POST(request: NextRequest) {
  try {
    const { 
      channelId, 
      refreshToken, 
      videoUrl, 
      title, 
      description, 
      tags, 
      scheduledDate 
    } = await request.json();

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Download video from RevID URL
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'stream'
    });

    // Determine if video should be published immediately or scheduled
    const currentTime = new Date();
    const scheduledTime = new Date(scheduledDate);
    const isScheduled = scheduledTime > currentTime;

    // Upload video to YouTube
    const uploadResponse = await youtube.videos.insert({
      auth: oauth2Client,
      part: ['snippet', 'status'],
      media: {
        body: videoResponse.data,
      },
      requestBody: {
        snippet: {
          title: title,
          description: description,
          tags: tags,
          categoryId: '22', // People & Blogs category
          defaultLanguage: 'nl',
          defaultAudioLanguage: 'nl',
        },
        status: {
          privacyStatus: isScheduled ? 'private' : 'public',
          publishAt: isScheduled ? scheduledTime.toISOString() : undefined,
          selfDeclaredMadeForKids: false,
        },
      },
    });

    const videoId = uploadResponse.data.id;

    // If scheduled, set the video to be published at the specified time
    if (isScheduled && videoId) {
      await youtube.videos.update({
        auth: oauth2Client,
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: 'private',
            publishAt: scheduledTime.toISOString(),
            selfDeclaredMadeForKids: false,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      videoId: videoId,
      status: isScheduled ? 'scheduled' : 'published',
      scheduledDate: isScheduled ? scheduledTime.toISOString() : null,
      url: `https://youtube.com/watch?v=${videoId}`,
    });

  } catch (error) {
    console.error('YouTube upload error:', error);
    
    // Handle specific YouTube API errors
    if (error.response?.data?.error) {
      const youtubeError = error.response.data.error;
      return NextResponse.json(
        { 
          error: `YouTube API Error: ${youtubeError.message}`,
          code: youtubeError.code,
          details: youtubeError.errors 
        },
        { status: youtubeError.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload video to YouTube' },
      { status: 500 }
    );
  }
}