'use client'

import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useUser } from '@stackframe/stack'

export default function HomePage() {
  const stackUser = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [youtubeData, setYoutubeData] = useState(null)

  useEffect(() => {
    // Check for YouTube OAuth success
    const urlParams = new URLSearchParams(window.location.search)
    const youtubeSuccess = urlParams.get('youtube_success')
    const channelId = urlParams.get('channel_id')
    const channelName = urlParams.get('channel_name')
    const refreshToken = urlParams.get('refresh_token')

    if (youtubeSuccess === 'true' && channelId && channelName && stackUser) {
      // Store YouTube data for the logged-in user
      const youtubeInfo = {
        youtubeChannelId: channelId,
        youtubeChannelTitle: decodeURIComponent(channelName.replace(/\+/g, ' ')),
        youtubeRefreshToken: refreshToken,
        youtubeConnected: true
      }
      
      setYoutubeData(youtubeInfo)
      
      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Set loading to false after Stack Auth has loaded
    setIsLoading(false)
  }, [stackUser])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">🤖 Starting YouTube Automation System...</p>
        </div>
      </div>
    )
  }

  if (!stackUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <AuthForm onSuccess={() => {}} />
      </div>
    )
  }

  const handleLogout = async () => {
    await stackUser.signOut()
    setYoutubeData(null)
  }

  const handleUpdateUser = (userData: any) => {
    setYoutubeData(userData)
  }

  // Combine Stack user with YouTube data
  const user = {
    id: stackUser.id,
    email: stackUser.primaryEmail,
    name: stackUser.displayName || stackUser.primaryEmail,
    ...youtubeData
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
    </div>
  )
}