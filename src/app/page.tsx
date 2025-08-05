'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthForm } from '@/components/auth/auth-form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const user = useQuery(api.users.getCurrentUser)

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard />
    </div>
  )
}