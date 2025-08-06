'use client'

import { useState, useEffect } from 'react'
import { SimpleAuthForm } from '@/components/auth/simple-auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

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
        'token_exchange_failed': 'Fout bij het uitwisselen van tokens - controleer OAuth configuratie',
        'user_info_failed': 'Kon YouTube kanalinformatie niet ophalen',
        'no_channel': 'Geen YouTube kanaal gevonden voor dit account',
        'callback_failed': 'Fout tijdens inlogproces',
        'access_denied': 'Toegang geweigerd door gebruiker',
        'missing_config': 'OAuth configuratie ontbreekt - stel environment variables in',
      }
      
      setErrorMessage(errorMessages[error] || 'Er is een fout opgetreden tijdens het inloggen')
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
      setIsLoading(false)
      return
    }

    // Check for existing authentication in localStorage first
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        if (userData && userData.id) {
          console.log('Found user in localStorage:', userData)
          // User is authenticated, redirect to dashboard immediately
          router.push('/dashboard')
          return
        }
      }
    } catch (error) {
      console.error('localStorage check failed:', error)
    }

    // Check server-side authentication as fallback
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        if (userData && userData.id) {
          console.log('Found user via API:', userData)
          // User is authenticated, redirect to dashboard immediately
          router.push('/dashboard')
          return
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    }

    // No authentication found, show login form immediately
    setIsLoading(false)
  }

  const handleAuthSuccess = (userData: any) => {
    setUser(userData)
    router.push('/dashboard')
  }

  if (isLoading) {
    return null // Geen laadscherm, direct doorsturen
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
        <SimpleAuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    </div>
  )
}