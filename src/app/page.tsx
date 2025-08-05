'use client'

import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check for YouTube OAuth success
    const urlParams = new URLSearchParams(window.location.search)
    const youtubeSuccess = urlParams.get('youtube_success')
    const channelId = urlParams.get('channel_id')
    const channelName = urlParams.get('channel_name')
    const refreshToken = urlParams.get('refresh_token')

    if (youtubeSuccess === 'true' && channelId && channelName) {
      // Update existing user with YouTube info
      const storedUser = localStorage.getItem('youtube_automation_user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          userData.youtubeChannelId = channelId
          userData.youtubeChannelTitle = decodeURIComponent(channelName.replace(/\+/g, ' '))
          userData.youtubeRefreshToken = refreshToken
          userData.youtubeConnected = true
          
          localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
          setUser(userData)
          setIsAuthenticated(true)
          
          // Clean URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error('Error updating user with YouTube data:', error)
        }
      }
    }

    // Check for stored user session
    const storedUser = localStorage.getItem('youtube_automation_user')
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('youtube_automation_user')
      }
    }

    // Simple loading - just show auth form
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

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <AuthForm onSuccess={() => setIsAuthenticated(true)} />
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('youtube_automation_user')
    setUser(null)
    setIsAuthenticated(false)
  }

  const handleUpdateUser = (userData: any) => {
    localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
    </div>
  )
}