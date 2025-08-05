'use client'

import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('youtube_automation_user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('youtube_automation_user')
      }
    }

    // Check for YouTube OAuth success
    const urlParams = new URLSearchParams(window.location.search)
    const youtubeSuccess = urlParams.get('youtube_success')
    const channelId = urlParams.get('channel_id')
    const channelName = urlParams.get('channel_name')
    const refreshToken = urlParams.get('refresh_token')

    if (youtubeSuccess === 'true' && channelId && channelName && user) {
      // Update user with YouTube data
      const updatedUser = {
        ...user,
        youtubeChannelId: channelId,
        youtubeChannelTitle: decodeURIComponent(channelName.replace(/\+/g, ' ')),
        youtubeRefreshToken: refreshToken,
        youtubeConnected: true
      }
      
      setUser(updatedUser)
      localStorage.setItem('youtube_automation_user', JSON.stringify(updatedUser))
      
      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    setIsLoading(false)
  }, [])

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

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <AuthForm onSuccess={handleAuthSuccess} />
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('youtube_automation_user')
    setUser(null)
  }

  const handleUpdateUser = (userData: any) => {
    setUser(userData)
    localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
    </div>
  )
}