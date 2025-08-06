'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface SimpleAuthFormProps {
  onAuthSuccess: (user: any) => void
}

export function SimpleAuthForm({ onAuthSuccess }: SimpleAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('pathtoresiliencebv@gmail.com')
  const [password, setPassword] = useState('6fz9itxv1')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      console.log('Attempting login with:', { email, password })
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Login response status:', response.status)
      const result = await response.json()
      console.log('Login result:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Login failed')
      }
      
      if (result.success && result.user) {
        console.log('Login successful, storing user:', result.user)
        // Store user in localStorage for simple session management
        localStorage.setItem('user', JSON.stringify(result.user))
        
        // Call the success handler
        onAuthSuccess(result.user)
      } else {
        throw new Error('Invalid response format')
      }

    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Er ging iets mis bij het inloggen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Content Catalyst Engine
        </CardTitle>
        <CardDescription>
          Inloggen om je dashboard te openen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Inloggen...
              </>
            ) : (
              'Inloggen'
            )}
          </Button>
        </form>

        <div className="text-xs text-gray-500 text-center">
          Na inloggen kun je je YouTube kanaal koppelen vanaf het dashboard
        </div>
      </CardContent>
    </Card>
  )
}