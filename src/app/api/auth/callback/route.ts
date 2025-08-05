import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL('/?error=oauth_error', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get channel information
    const youtube = google.youtube('v3');
    const channelResponse = await youtube.channels.list({
      auth: oauth2Client,
      part: ['id', 'snippet'],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      return NextResponse.redirect(new URL('/?error=no_channel', request.url));
    }

    // Store tokens in session/database (implement based on your auth strategy)
    // For now, redirect with success and channel info
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('channel_id', channel.id!);
    redirectUrl.searchParams.set('channel_name', channel.snippet?.title || '');
    
    // In a real implementation, you would store the refresh_token securely
    // and associate it with the user account
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', request.url));
  }
}