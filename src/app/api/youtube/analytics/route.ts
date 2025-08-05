import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const youtube = google.youtube('v3')
const youtubeAnalytics = google.youtubeAnalytics('v2')

export async function POST(request: NextRequest) {
  try {
    const { 
      videoId, 
      refreshToken, 
      channelId,
      startDate,
      endDate 
    } = await request.json()

    if (!videoId || !refreshToken) {
      return NextResponse.json(
        { error: 'Video ID and refresh token are required' },
        { status: 400 }
      )
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    // Set date range (default to last 30 days)
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const startDateStr = start.toISOString().split('T')[0]
    const endDateStr = end.toISOString().split('T')[0]

    try {
      // Get basic video info
      const videoResponse = await youtube.videos.list({
        auth: oauth2Client,
        part: ['statistics', 'snippet'],
        id: [videoId],
      })

      const video = videoResponse.data.items?.[0]
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }

      // Get analytics data
      const analyticsResponse = await youtubeAnalytics.reports.query({
        auth: oauth2Client,
        ids: `channel==${channelId}`,
        startDate: startDateStr,
        endDate: endDateStr,
        metrics: [
          'views',
          'likes',
          'comments',
          'shares',
          'estimatedMinutesWatched',
          'averageViewDuration',
          'subscribersGained',
          'cardImpressions',
          'cardClicks'
        ].join(','),
        dimensions: 'video',
        filters: `video==${videoId}`,
        sort: '-views'
      })

      const analyticsData = analyticsResponse.data.rows?.[0] || []
      const statistics = video.statistics || {}

      // Parse analytics data
      const analytics = {
        views: parseInt(analyticsData[0] || statistics.viewCount || '0'),
        likes: parseInt(analyticsData[1] || statistics.likeCount || '0'),
        comments: parseInt(analyticsData[2] || statistics.commentCount || '0'),
        shares: parseInt(analyticsData[3] || '0'),
        watchTime: parseInt(analyticsData[4] || '0'), // in minutes
        avgViewDuration: parseInt(analyticsData[5] || '0'), // in seconds
        subscribersGained: parseInt(analyticsData[6] || '0'),
        impressions: parseInt(analyticsData[7] || '0'),
        cardClicks: parseInt(analyticsData[8] || '0'),
        ctr: analyticsData[7] && analyticsData[0] ? 
          (parseInt(analyticsData[0]) / parseInt(analyticsData[7])) * 100 : 0,
        revenue: 0, // YouTube Revenue API requires special permissions
        videoTitle: video.snippet?.title || '',
        publishedAt: video.snippet?.publishedAt || '',
      }

      return NextResponse.json({
        success: true,
        videoId,
        analytics,
        dateRange: {
          start: startDateStr,
          end: endDateStr
        }
      })

    } catch (apiError: any) {
      console.error('YouTube API error:', apiError)
      
      // Handle specific API errors
      if (apiError.code === 403) {
        return NextResponse.json({
          error: 'Insufficient permissions to access analytics data',
          details: 'Make sure the OAuth scope includes youtube.readonly and yt-analytics.readonly'
        }, { status: 403 })
      }

      if (apiError.code === 404) {
        return NextResponse.json({
          error: 'Video or channel not found',
          details: 'The video may have been deleted or made private'
        }, { status: 404 })
      }

      throw apiError
    }

  } catch (error) {
    console.error('Analytics API error:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}