import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const youtube = google.youtube('v3');
const analytics = google.youtubeAnalytics('v2');

export async function POST(request: NextRequest) {
  try {
    const { channelId, refreshToken } = await request.json();

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    // Get channel videos from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const videosResponse = await youtube.search.list({
      auth: oauth2Client,
      part: ['id', 'snippet'],
      channelId: channelId,
      maxResults: 50,
      order: 'date',
      publishedAfter: thirtyDaysAgo.toISOString(),
      type: 'video'
    });

    if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
      return NextResponse.json({ topVideos: [] });
    }

    const videoIds = videosResponse.data.items
      .map(item => item.id?.videoId)
      .filter(Boolean) as string[];

    // Get video statistics
    const statsResponse = await youtube.videos.list({
      auth: oauth2Client,
      part: ['statistics', 'snippet'],
      id: videoIds,
    });

    // Get analytics data for performance metrics
    const analyticsData = await analytics.reports.query({
      auth: oauth2Client,
      ids: `channel==${channelId}`,
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      metrics: 'views,estimatedMinutesWatched,subscribersGained',
      dimensions: 'video',
      filters: `video==${videoIds.join(',')}`,
      sort: '-views',
      maxResults: 10,
    });

    // Process and calculate performance scores
    const topVideos = statsResponse.data.items?.map(video => {
      const stats = video.statistics!;
      const analytics = analyticsData.data.rows?.find(row => row[0] === video.id);
      
      const views = parseInt(stats.viewCount || '0');
      const watchTime = analytics ? parseInt(analytics[2] as string) : 0;
      const subscribers = analytics ? parseInt(analytics[3] as string) : 0;
      
      // Calculate CTR approximation (likes + comments / views)
      const likes = parseInt(stats.likeCount || '0');
      const comments = parseInt(stats.commentCount || '0');
      const ctr = views > 0 ? ((likes + comments) / views) * 100 : 0;

      // Calculate weighted performance score
      const maxViews = Math.max(...(statsResponse.data.items?.map(v => parseInt(v.statistics?.viewCount || '0')) || [1]));
      const maxWatchTime = Math.max(...(analyticsData.data.rows?.map(r => parseInt(r[2] as string)) || [1]));
      const maxCTR = Math.max(...(statsResponse.data.items?.map(v => {
        const s = v.statistics!;
        const vws = parseInt(s.viewCount || '0');
        const lks = parseInt(s.likeCount || '0');
        const cmts = parseInt(s.commentCount || '0');
        return vws > 0 ? ((lks + cmts) / vws) * 100 : 0;
      }) || [1]));
      const maxSubs = Math.max(...(analyticsData.data.rows?.map(r => parseInt(r[3] as string)) || [1]));

      const normalizedViews = views / maxViews;
      const normalizedWatchTime = watchTime / maxWatchTime;
      const normalizedCTR = ctr / maxCTR;
      const normalizedSubs = Math.abs(subscribers) / maxSubs;

      const performanceScore = (
        normalizedViews * 0.4 +
        normalizedWatchTime * 0.3 +
        normalizedCTR * 0.2 +
        normalizedSubs * 0.1
      ) * 100;

      return {
        videoId: video.id!,
        title: video.snippet?.title || '',
        views,
        watchTime,
        ctr,
        subscribers,
        performanceScore: Math.round(performanceScore * 100) / 100,
        publishedAt: new Date(video.snippet?.publishedAt || '').getTime(),
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 10) || [];

    return NextResponse.json({ 
      topVideos,
      totalVideos: videoIds.length,
      analysisDate: Date.now()
    });

  } catch (error) {
    console.error('YouTube analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze YouTube data' },
      { status: 500 }
    );
  }
}