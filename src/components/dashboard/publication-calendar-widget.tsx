'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDate } from '@/lib/utils'
import { Calendar, Clock, ExternalLink } from 'lucide-react'
import { format, addDays, startOfDay } from 'date-fns'
import { nl } from 'date-fns/locale'

interface PublicationCalendarWidgetProps {
  user: any
}

export function PublicationCalendarWidget({ user }: PublicationCalendarWidgetProps) {
  const scheduledVideos = useQuery(
    api.content.getVideoIdeasByUser,
    user ? { userId: user.id, status: 'scheduled' } : 'skip'
  )

  // Generate upcoming schedule for next 7 days
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfDay(new Date()), i)
    const videosForDay = scheduledVideos?.filter(video => 
      video.scheduledDate && 
      startOfDay(new Date(video.scheduledDate)).getTime() === date.getTime()
    ) || []
    
    return {
      date,
      videos: videosForDay
    }
  })

  if (!user) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Publicatiekalender</CardTitle>
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
          <span>Publicatiekalender</span>
          <span className="text-sm font-normal text-gray-500">
            {scheduledVideos?.length || 0} ingepland
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {scheduledVideos === undefined ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : upcomingDays.every(day => day.videos.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Geen video's ingepland</p>
              <p className="text-sm mt-1">Video's worden automatisch ingepland na voltooiing</p>
            </div>
          ) : (
            upcomingDays.map((day) => (
              <div key={day.date.toISOString()} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">
                    {format(day.date, 'EEEE d MMMM', { locale: nl })}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {day.videos.length} video{day.videos.length !== 1 ? "'s" : ''}
                  </span>
                </div>
                
                {day.videos.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    Geen video's gepland
                  </p>
                ) : (
                  <div className="space-y-2">
                    {day.videos.map((video) => (
                      <div
                        key={video._id}
                        className="bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-xs leading-tight mb-1">
                              {video.title}
                            </h5>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>00:00</span>
                              {video.youtubeVideoId && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://youtube.com/watch?v=${video.youtubeVideoId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>YouTube</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}