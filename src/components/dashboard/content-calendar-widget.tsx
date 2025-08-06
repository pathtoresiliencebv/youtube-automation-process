'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Calendar, 
  Plus, 
  Zap, 
  Target, 
  Clock, 
  TrendingUp,
  Star,
  CheckCircle,
  AlertCircle,
  Play,
  Settings,
  BarChart3
} from 'lucide-react'

interface ContentCalendarWidgetProps {
  user: any
}

export function ContentCalendarWidget({ user }: ContentCalendarWidgetProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [calendarSettings, setCalendarSettings] = useState({
    weeks: 4,
    videosPerWeek: 3,
    optimalDays: ['tuesday', 'thursday', 'saturday'],
    optimalHours: [9, 14, 18],
    contentMix: {
      spiritual: 40,
      motivation: 25,
      personal_growth: 25,
      general: 10
    }
  })

  const [contentCalendar, setContentCalendar] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch content calendar
  useEffect(() => {
    const fetchCalendar = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/content-calendar?userId=${user.id}&status=active`)
        if (response.ok) {
          const calendar = await response.json()
          setContentCalendar(calendar)
        }
      } catch (error) {
        console.error('Failed to fetch content calendar:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCalendar()
  }, [user?.id])

  const handleGenerateCalendar = async () => {
    if (!user) return
    
    setIsGenerating(true)
    try {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'generate',
          data: {
            weeks: calendarSettings.weeks,
            videosPerWeek: calendarSettings.videosPerWeek,
            preferences: {
              optimalDays: calendarSettings.optimalDays,
              optimalHours: calendarSettings.optimalHours,
              contentMix: calendarSettings.contentMix
            }
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Refresh calendar data
        const calendarResponse = await fetch(`/api/content-calendar?userId=${user.id}&status=active`)
        if (calendarResponse.ok) {
          const calendar = await calendarResponse.json()
          setContentCalendar(calendar)
        }
        
        alert(`Slimme content kalender gegenereerd! ${result.totalVideos} video's gepland over ${calendarSettings.weeks} weken.`)
      } else {
        throw new Error('Calendar generation failed')
      }
    } catch (error) {
      console.error('Calendar generation failed:', error)
      alert('Er ging iets mis bij het genereren van de kalender. Probeer het opnieuw.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateVideo = async (weekIndex: number, videoIndex: number) => {
    if (!user || !contentCalendar) return
    
    try {
      const response = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'create_video',
          data: {
            calendarId: contentCalendar.id,
            weekIndex,
            videoIndex
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Video idee succesvol aangemaakt: ${result.videoSlot.concept.title}`)
      } else {
        throw new Error('Video creation failed')
      }
    } catch (error) {
      console.error('Video creation failed:', error)
      alert('Er ging iets mis bij het aanmaken van de video.')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'spiritual': return '🧘'
      case 'motivation': return '⚡'
      case 'personal_growth': return '🌱'
      case 'general': return '💡'
      default: return '📹'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('nl-NL', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Content Kalender
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-blue-500" />
            Slimme Content Kalender
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Instellingen
            </Button>
            <Button
              onClick={handleGenerateCalendar}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Genereren...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Genereer Kalender
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Kalender Instellingen</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Aantal weken</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={calendarSettings.weeks}
                  onChange={(e) => setCalendarSettings(prev => ({ ...prev, weeks: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Video's per week</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={calendarSettings.videosPerWeek}
                  onChange={(e) => setCalendarSettings(prev => ({ ...prev, videosPerWeek: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Content Mix (%)</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(calendarSettings.contentMix).map(([type, percentage]) => (
                  <div key={type}>
                    <label className="block text-xs text-gray-500 mb-1 capitalize">{type.replace('_', ' ')}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={percentage}
                      onChange={(e) => setCalendarSettings(prev => ({
                        ...prev,
                        contentMix: { ...prev.contentMix, [type]: parseInt(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {contentCalendar ? (
          <div className="space-y-6">
            {/* Calendar Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-800 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Kalender Overzicht
                </h4>
                <span className="text-xs text-blue-600">
                  {contentCalendar.weeks} weken • {contentCalendar.videosPerWeek} video's/week
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">
                    {contentCalendar.calendar?.reduce((sum: number, week: any) => sum + week.videos.length, 0) || 0}
                  </div>
                  <div className="text-xs text-blue-600">Totaal Video's</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {contentCalendar.calendar?.reduce((sum: number, week: any) => 
                      sum + week.videos.filter((v: any) => v.priority === 'high').length, 0
                    ) || 0}
                  </div>
                  <div className="text-xs text-green-600">Hoge Prioriteit</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    {Math.round(contentCalendar.calendar?.reduce((sum: number, week: any) => 
                      sum + week.videos.reduce((weekSum: number, video: any) => 
                        weekSum + video.estimatedPerformance.expectedViews, 0
                      ), 0
                    ) / Math.max(contentCalendar.calendar?.reduce((sum: number, week: any) => sum + week.videos.length, 0), 1) || 0)}
                  </div>
                  <div className="text-xs text-purple-600">Verwachte Views</div>
                </div>
              </div>
            </div>

            {/* Weekly Calendar */}
            <div className="space-y-4">
              {contentCalendar.calendar?.map((week: any, weekIndex: number) => (
                <div key={weekIndex} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h5 className="font-medium text-gray-700">
                      Week {week.week} • {new Date(week.startDate).toLocaleDateString('nl-NL')} - {new Date(week.endDate).toLocaleDateString('nl-NL')}
                    </h5>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid gap-3">
                      {week.videos.map((video: any, videoIndex: number) => (
                        <div key={videoIndex} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="text-2xl">{getContentTypeIcon(video.contentType)}</div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h6 className="font-medium text-sm text-gray-900 truncate">
                                  {video.concept.title}
                                </h6>
                                <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(video.priority)}`}>
                                  {video.priority}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(video.scheduledDate)}
                                </span>
                                <span className="flex items-center">
                                  <Target className="w-3 h-3 mr-1" />
                                  {video.topic}
                                </span>
                                <span className="flex items-center">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {video.estimatedPerformance.expectedViews} views
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {video.status === 'created' ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-xs">Aangemaakt</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleCreateVideo(weekIndex, videoIndex)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Maak Video
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Geen Content Kalender</h3>
            <p className="text-gray-500 mb-6">
              Genereer een slimme content kalender gebaseerd op je performance data en voorkeuren.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">Tip voor betere resultaten</h4>
                  <p className="text-sm text-yellow-700">
                    Voor een optimale kalender, voer eerst content analyses uit (AI Optimalisatie → Analyse). 
                    Dit helpt het systeem je beste tijden en onderwerpen te identificeren.
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleGenerateCalendar}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Genereren...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Genereer Slimme Kalender
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}