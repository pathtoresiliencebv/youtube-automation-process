'use client'

import { useEffect, useState } from 'react'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // First check localStorage
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        if (userData.id) {
          setUser(userData)
          setLoading(false)
          return
        }
      }

      // Fallback to server-side check
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        // Store in localStorage for next time
        localStorage.setItem('user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('user')
      
      // Clear server session
      await fetch('/api/auth/logout', { method: 'POST' })
      
      setUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleUpdateUser = (userData: any) => {
    setUser(userData)
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(userData))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Sessie verlopen
            </h1>
            <p className="text-gray-600">
              Log opnieuw in om verder te gaan
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={handleLogout}
      onUpdateUser={handleUpdateUser}
    />
  )
}