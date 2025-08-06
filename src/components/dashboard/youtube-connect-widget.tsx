'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Youtube, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'

interface YouTubeConnectWidgetProps {
  user: any
  onConnectionUpdate: (connected: boolean, channelData?: any) => void
}

export function YouTubeConnectWidget({ user, onConnectionUpdate }: YouTubeConnectWidgetProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Check if user is already connected (has YouTube channel data)
  const isConnected = user?.youtubeChannelId && user?.youtubeConnected

  const handleAnalyzeChannel = async () => {
    if (!user?.youtubeChannelId) return
    
    setIsConnecting(true)
    try {
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          channelId: user.youtubeChannelId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze channel')
      }

      const result = await response.json()
      alert(`Kanaal geanalyseerd! ${result.videoCount || 0} video's gevonden.`)
      
    } catch (error) {
      console.error('Channel analysis error:', error)
      alert('Er ging iets mis bij het analyseren van het kanaal')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleYouTubeConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID
    
    if (!clientId || clientId === 'your-actual-youtube-client-id') {
      alert('YouTube Client ID is nog niet geconfigureerd. Stel eerst de environment variables in.')
      return
    }
    
    setIsConnecting(true)
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectUri = `${appUrl}/api/auth/callback`
    const scope = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly'
    
    const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`

    window.location.href = authUrl
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-600" />
          YouTube Kanaal Verbinding
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Verbonden</div>
                <div className="text-sm text-green-700">
                  {user.youtubeChannelTitle || user.name}
                </div>
                {user.youtubeChannelId && (
                  <div className="text-xs text-green-600 mt-1">
                    ID: {user.youtubeChannelId}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyzeChannel}
                disabled={isConnecting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {isConnecting ? 'Analyseren...' : 'Analyseer Kanaal'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleYouTubeConnect}
                className="text-gray-600"
              >
                Herverbinden
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Youtube className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-800">YouTube Kanaal Koppelen</div>
                <div className="text-sm text-blue-700">
                  Koppel je YouTube kanaal om video's te kunnen analyseren en automatisch content te genereren
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleYouTubeConnect}
              disabled={isConnecting}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Youtube className="w-4 h-4 mr-2" />
              {isConnecting ? 'Verbinden...' : 'Koppel YouTube Kanaal'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}