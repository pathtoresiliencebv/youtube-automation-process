'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface AuthFormProps {
  onSuccess: () => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('pathtoresiliencebv@gmail.com')
  const [name, setName] = useState('Path to Resilience')
  const [isLoading, setIsLoading] = useState(false)

  // Safe API usage with fallback
  const createUser = (() => {
    try {
      return useMutation(api?.users?.createUser) || (() => Promise.resolve())
    } catch (error) {
      console.warn('Convex API not available:', error)
      return () => Promise.resolve()
    }
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !name) {
      alert('Vul alle velden in')
      return
    }

    setIsLoading(true)
    
    try {
      // Create user account and store in localStorage
      const userData = {
        id: Date.now().toString(),
        email: email,
        name: name,
        authenticatedAt: Date.now(),
        youtubeConnected: false
      }
      
      localStorage.setItem('youtube_automation_user', JSON.stringify(userData))
      onSuccess()
    } catch (error) {
      console.error('Auth error:', error)
      alert('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    // Check if client ID is configured
    const clientId = process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID
    
    if (!clientId || clientId === 'your-actual-youtube-client-id') {
      alert('YouTube Client ID is nog niet geconfigureerd. Ga naar Vercel Dashboard → Settings → Environment Variables om de echte waarden in te stellen.')
      return
    }
    
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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Content Catalyst Engine
        </CardTitle>
        <CardDescription>
          YouTube automatisering voor inspirerende content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Naam
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Je naam"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="je@email.com"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="sm" /> : 'Inloggen'}
          </Button>
        </form>

      </CardContent>
    </Card>
  )
}