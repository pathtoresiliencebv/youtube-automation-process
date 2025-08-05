'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getStatusColor, getStatusText, formatDate } from '@/lib/utils'
import { Play, FileText, Video, Upload, Calendar, AlertCircle } from 'lucide-react'

const statusIcons = {
  approved: FileText,
  script_generated: FileText,
  video_creating: Video,
  video_completed: Video,
  uploading: Upload,
  scheduled: Calendar,
  failed: AlertCircle,
}

export function ProductionPipelineWidget() {
  const user = useQuery(api.users.getCurrentUser)
  const videoIdeas = useQuery(
    api.content.getVideoIdeasByUser,
    user ? { userId: user._id } : 'skip'
  )

  // Filter ideas that are in production (not pending approval or published)
  const inProduction = videoIdeas?.filter(idea => 
    !['pending_approval', 'rejected', 'published'].includes(idea.status)
  ) || []

  if (!user) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Productie Pijplijn</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-96">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Productie Pijplijn</span>
          <span className="text-sm font-normal text-gray-500">
            {inProduction.length} in productie
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {videoIdeas === undefined ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : inProduction.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Geen video's in productie</p>
              <p className="text-sm mt-1">Keur eerst enkele ideeën goed om te starten</p>
            </div>
          ) : (
            inProduction.map((idea) => {
              const Icon = statusIcons[idea.status as keyof typeof statusIcons] || Play
              const progress = getProgressPercentage(idea.status)
              
              return (
                <div
                  key={idea._id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Icon className={`w-5 h-5 ${
                        idea.status === 'failed' ? 'text-red-500' : 'text-blue-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight mb-1">
                        {idea.title}
                      </h4>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusColor(idea.status)
                        }`}>
                          {getStatusText(idea.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(idea.updatedAt)}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idea.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      
                      {idea.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Fout: {idea.error}
                        </p>
                      )}
                      
                      {idea.revidJobId && (
                        <p className="text-xs text-gray-500 mt-1">
                          RevID Job: {idea.revidJobId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getProgressPercentage(status: string): number {
  switch (status) {
    case 'approved':
      return 10
    case 'script_generated':
      return 30
    case 'video_creating':
      return 60
    case 'video_completed':
      return 80
    case 'uploading':
      return 90
    case 'scheduled':
      return 100
    case 'failed':
      return 100
    default:
      return 0
  }
}