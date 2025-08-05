'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { VideoIdeasWidget } from './video-ideas-widget'
import { ProductionPipelineWidget } from './production-pipeline-widget'
import { PublicationCalendarWidget } from './publication-calendar-widget'
import { AnalyticsWidget } from './analytics-widget'
import { YouTubeConnectWidget } from './youtube-connect-widget'
import { PlayCircle, Lightbulb, Calendar, BarChart3, LogOut, User } from 'lucide-react'

interface DashboardProps {
  user: any
  onLogout: () => void
  onUpdateUser?: (userData: any) => void
}

export function Dashboard({ user, onLogout, onUpdateUser }: DashboardProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  // Get real data from Convex
  const allVideoIdeas = useQuery(
    api.content.getVideoIdeasByUser,
    user ? { userId: user.id } : 'skip'
  )

  // Calculate metrics from real data
  const pendingIdeas = allVideoIdeas?.filter(idea => idea.status === 'pending_approval') || []
  const inProduction = allVideoIdeas?.filter(idea => 
    ['approved', 'script_generated', 'video_creating', 'video_completed', 'uploading'].includes(idea.status)
  ) || []
  const scheduled = allVideoIdeas?.filter(idea => idea.status === 'scheduled') || []
  const published = allVideoIdeas?.filter(idea => idea.status === 'published') || []
  
  // Calculate average performance score
  const publishedWithScores = published.filter(idea => idea.performanceScore > 0)
  const avgPerformance = publishedWithScores.length > 0 
    ? publishedWithScores.reduce((sum, idea) => sum + idea.performanceScore, 0) / publishedWithScores.length
    : 0

  const handleGenerateIdeas = async () => {
    if (!user) return
    
    setIsGenerating(true)
    try {
      // Call the Convex action to generate ideas
      const response = await fetch('/api/convex/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate ideas: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Generated ideas:', result)
      
      // Show success message
      alert(`Succesvol ${result.count || 'meerdere'} nieuwe video ideeën gegenereerd!`)
      
    } catch (error) {
      console.error('Failed to generate ideas:', error)
      alert('Er ging iets mis bij het genereren van ideeën. Probeer het opnieuw.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Content Catalyst Engine
              </h1>
              <p className="text-gray-600 mt-1">
                YouTube automatisering dashboard
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleGenerateIdeas}
                disabled={isGenerating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isGenerating ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Lightbulb className="w-4 h-4 mr-2" />
                )}
                Genereer Nieuwe Ideeën
              </Button>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{user?.name || 'User'}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Uitloggen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Nieuwe Ideeën
              </CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allVideoIdeas === undefined ? '...' : pendingIdeas.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Wacht op goedkeuring
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                In Productie
              </CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allVideoIdeas === undefined ? '...' : inProduction.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Video's worden gemaakt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ingepland
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allVideoIdeas === undefined ? '...' : scheduled.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Klaar voor publicatie
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prestaties
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allVideoIdeas === undefined ? '...' : Math.round(avgPerformance)}
                {allVideoIdeas !== undefined && avgPerformance > 0 && '%'}
              </div>
              <p className="text-xs text-muted-foreground">
                Gemiddelde succes score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* YouTube Connection */}
        <div className="mb-6">
          <YouTubeConnectWidget 
            user={user} 
            onConnectionUpdate={(connected, channelData) => {
              if (onUpdateUser) {
                const updatedUser = { ...user, youtubeConnected: connected, ...channelData }
                onUpdateUser(updatedUser)
              }
            }} 
          />
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VideoIdeasWidget user={user} />
          <ProductionPipelineWidget user={user} />
          <PublicationCalendarWidget user={user} />
          <AnalyticsWidget user={user} />
        </div>
      </main>
    </div>
  )
}