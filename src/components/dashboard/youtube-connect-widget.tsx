'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Youtube, CheckCircle, AlertCircle } from 'lucide-react'

interface YouTubeConnectWidgetProps {
  user: any
  onConnectionUpdate: (connected: boolean, channelData?: any) => void
}

export function YouTubeConnectWidget({ user, onConnectionUpdate }: YouTubeConnectWidgetProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleGoogleAuth = () => {
    // Check if client ID is configured
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID
    
    if (!clientId || clientId === 'your-actual-youtube-client-id') {
      alert('YouTube Client ID is nog niet geconfigureerd. Ga naar Vercel Dashboard → Settings → Environment Variables om de echte waarden in te stellen.')
      return
    }
    
    setIsConnecting(true)
    
    // Use environment variable for app URL or fallback to window.location.origin
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
        {user?.youtubeChannelId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">Verbonden</div>
                <div className="text-sm text-green-700">
                  {user.youtubeChannelTitle || user.name}
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnectionUpdate(false)}
              className="text-gray-600"
            >
              Verbinding verbreken
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="font-semibold text-orange-800">Niet verbonden</div>
                <div className="text-sm text-orange-700">
                  Verbind je YouTube kanaal voor automatisering
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleGoogleAuth}
              disabled={isConnecting}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Youtube className="w-4 h-4 mr-2" />
              {isConnecting ? 'Verbinden...' : 'Verbind YouTube Kanaal'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}