'use client'

import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndErrors()
  }, [])

  const checkAuthAndErrors = async () => {
    // Check for OAuth errors in URL
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    
    if (error) {
      const errorMessages: Record<string, string> = {
        'no_code': 'Geen autorisatiecode ontvangen van Google',
        'token_exchange_failed': 'Fout bij het uitwisselen van tokens',
        'user_info_failed': 'Kon YouTube kanalinformatie niet ophalen',
        'no_channel': 'Geen YouTube kanaal gevonden voor dit account',
        'callback_failed': 'Fout tijdens inlogproces',
        'access_denied': 'Toegang geweigerd door gebruiker',
      }
      
      setErrorMessage(errorMessages[error] || 'Er is een fout opgetreden tijdens het inloggen')
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
      setIsLoading(false)
      return
    }

    // Check for existing authentication
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        if (userData.id) {
          // User is authenticated, redirect to dashboard
          window.location.href = '/dashboard'
          return
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }

    setIsLoading(false)
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full">
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-600 text-sm">
                <strong>Fout:</strong> {errorMessage}
              </div>
            </div>
          </div>
        )}
        <AuthForm />
      </div>
    </div>
  )
}