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
    // Check for stored user session first
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

    // Check for OAuth success in URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const channelId = urlParams.get('channel_id')
    const channelName = urlParams.get('channel_name')

    if (success === 'true' && channelId && channelName) {
      // OAuth success - create user session
      const userData = {
        id: channelId,
        name: decodeURIComponent(channelName.replace(/\+/g, ' ')),
        channelId: channelId,
        email: null, // Will be filled later if needed
        authenticatedAt: Date.now()
      }
      
      // Store in localStorage
      localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
      
      setUser(userData)
      setIsAuthenticated(true)
      setIsLoading(false)
      
      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Check for errors
    const error = urlParams.get('error')
    if (error) {
      console.error('OAuth error:', error)
      alert('Er ging iets mis met de authenticatie. Probeer het opnieuw.')
      // Clean URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Default loading behavior
    const timer = setTimeout(() => {
      setIsLoading(false)
      // No OAuth success and no stored session, show auth form
      if (!success && !storedUser) {
        setUser(null)
        setIsAuthenticated(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard user={user} onLogout={handleLogout} />
    </div>
  )
}