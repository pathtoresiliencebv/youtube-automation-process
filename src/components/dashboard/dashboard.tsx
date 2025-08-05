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
import { PlayCircle, Lightbulb, Calendar, BarChart3 } from 'lucide-react'

export function Dashboard() {
  const [isGenerating, setIsGenerating] = useState(false)
  const user = useQuery(api.users.getCurrentUser)

  const handleGenerateIdeas = async () => {
    if (!user) return
    
    setIsGenerating(true)
    try {
      // This would trigger the idea generation workflow
      console.log('Generating ideas for user:', user._id)
      // The actual implementation would call the Convex action
    } catch (error) {
      console.error('Failed to generate ideas:', error)
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
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Actief</span>
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
              <div className="text-2xl font-bold">8</div>
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
              <div className="text-2xl font-bold">3</div>
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
              <div className="text-2xl font-bold">12</div>
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
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                Gemiddelde succes score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VideoIdeasWidget />
          <ProductionPipelineWidget />
          <PublicationCalendarWidget />
          <AnalyticsWidget />
        </div>
      </main>
    </div>
  )
}