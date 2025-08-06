'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    handleOAuthCallback()
  }, [])

  const handleOAuthCallback = async () => {
    try {
      // Get OAuth success parameters from URL
      const youtubeSuccess = searchParams.get('youtube_success')
      const channelId = searchParams.get('channel_id')
      const channelName = searchParams.get('channel_name')
      const refreshToken = searchParams.get('refresh_token')

      if (!youtubeSuccess || !channelId) {
        setStatus('error')
        setMessage('OAuth callback parameters ontbreken')
        return
      }

      // Create or update user in PostgreSQL
      const response = await fetch('/api/auth/oauth-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          channelName,
          refreshToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to complete OAuth')
      }

      const userData = await response.json()
      
      setStatus('success')
      setMessage('Inloggen succesvol! Doorverwijzen naar dashboard...')

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (error) {
      console.error('OAuth completion error:', error)
      setStatus('error')
      setMessage('Fout bij het voltooien van inloggen')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md">
        <LoadingSpinner />
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'loading' && 'Inloggen voltooien...'}
            {status === 'success' && '✅ Succesvol ingelogd!'}
            {status === 'error' && '❌ Inloggen mislukt'}
          </h1>
          <p className="text-gray-600">
            {message || 'Bezig met verwerken van je Google account...'}
          </p>
          {status === 'error' && (
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Terug naar inloggen
            </button>
          )}
        </div>
      </div>
    </div>
  )
}