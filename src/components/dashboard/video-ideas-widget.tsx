'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getStatusColor, getStatusText, formatDate } from '@/lib/utils'
import { Check, X, Eye } from 'lucide-react'

interface VideoIdeasWidgetProps {
  user: any
}

export function VideoIdeasWidget({ user }: VideoIdeasWidgetProps) {
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const [videoIdeas, setVideoIdeas] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch pending video ideas from Neon API
  useEffect(() => {
    const fetchVideoIdeas = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/video-ideas?userId=${user.id}&status=pending_approval`)
        if (response.ok) {
          const ideas = await response.json()
          setVideoIdeas(ideas)
        }
      } catch (error) {
        console.error('Failed to fetch video ideas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideoIdeas()
  }, [user?.id])

  const handleApprove = async (ideaId: string) => {
    try {
      // Approve the idea via Neon API
      const response = await fetch('/api/video-ideas/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ideaId })
      })

      if (!response.ok) {
        throw new Error(`Failed to approve idea: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Video idea approved:', result)
      
      // Update the local state
      setVideoIdeas(prev => prev.filter(idea => idea.id !== ideaId))
      
      alert(`Video idee goedgekeurd! Het idee is nu goedgekeurd en kan verder verwerkt worden.`)
      
    } catch (error) {
      console.error('Failed to approve idea:', error)
      alert('Er ging iets mis bij het goedkeuren van het idee: ' + error.message)
    }
  }

  const handleReject = async (ideaId: string) => {
    try {
      const response = await fetch('/api/video-ideas/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ideaId })
      })

      if (!response.ok) {
        throw new Error(`Failed to reject idea: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Video idea rejected:', result)
      
      // Update the local state
      setVideoIdeas(prev => prev.filter(idea => idea.id !== ideaId))
      
      alert('Video idee afgewezen!')
      
    } catch (error) {
      console.error('Failed to reject idea:', error)
      alert('Er ging iets mis bij het afwijzen van het idee')
    }
  }

  if (!user) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Nieuwe Ideeën</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Geen gebruiker ingelogd</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Nieuwe Ideeën</CardTitle>
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
          <span>Nieuwe Ideeën</span>
          <span className="text-sm font-normal text-gray-500">
            {videoIdeas?.length || 0} ideeën
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {videoIdeas === undefined ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : videoIdeas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Geen nieuwe ideeën beschikbaar</p>
              <p className="text-sm mt-1">Klik op "Genereer Nieuwe Ideeën" om te beginnen</p>
            </div>
          ) : (
            videoIdeas.map((idea) => (
              <div
                key={idea._id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm leading-tight mb-1">
                      {idea.title}
                    </h4>
                    {idea.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {idea.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(idea.status)
                      }`}>
                        {getStatusText(idea.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(idea.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {idea.status === 'pending_approval' && (
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedIdea(idea._id)}
                      className="text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Bekijk
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(idea._id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Afwijzen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(idea._id)}
                      className="text-xs bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Goedkeuren
                    </Button>
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