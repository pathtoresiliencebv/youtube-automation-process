'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Check, 
  X, 
  Trash, 
  Calendar, 
  Download, 
  Filter,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react'

interface BulkManagementWidgetProps {
  user: any
}

interface VideoIdea {
  _id: string
  title: string
  status: string
  createdAt: number
  youtubeVideoId?: string
  error?: string
  performanceScore?: number
}

export function BulkManagementWidget({ user }: BulkManagementWidgetProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: [] as string[],
    hasYouTubeVideo: undefined as boolean | undefined,
    hasError: undefined as boolean | undefined,
  })
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  // Get filtered video ideas
  const { ideas = [], total = 0, hasMore = false } = useQuery(
    api.bulkOperations.getVideoIdeasWithFilters,
    user ? {
      userId: user.id,
      status: filters.status.length > 0 ? filters.status : undefined,
      hasYouTubeVideo: filters.hasYouTubeVideo,
      hasError: filters.hasError,
      limit: pageSize,
      offset: currentPage * pageSize,
    } : 'skip'
  ) || {}

  const handleSelectAll = () => {
    if (selectedIds.length === ideas.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(ideas.map((idea: VideoIdea) => idea._id))
    }
  }

  const handleSelectIdea = (ideaId: string) => {
    setSelectedIds(prev => 
      prev.includes(ideaId) 
        ? prev.filter(id => id !== ideaId)
        : [...prev, ideaId]
    )
  }

  const handleBulkOperation = async (operation: string, extraData?: any) => {
    if (selectedIds.length === 0) {
      alert('Selecteer eerst video ideeën')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/bulk/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          ideaIds: selectedIds,
          userId: user.id,
          ...extraData,
        }),
      })

      if (!response.ok) {
        throw new Error(`Bulk operation failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      alert(`${operation} voltooid! ${result.summary.successful}/${result.summary.total} succesvol`)
      
      // Clear selection
      setSelectedIds([])
      
    } catch (error) {
      console.error('Bulk operation error:', error)
      alert(`Fout bij ${operation}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        userId: user.id,
        operation: 'export',
        format,
        ...(filters.status.length > 0 && { status: filters.status.join(',') }),
      })

      const response = await fetch(`/api/bulk/operations?${params}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video_ideas_export.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error) {
      alert(`Export fout: ${error.message}`)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      script_generated: 'bg-purple-100 text-purple-800',
      video_creating: 'bg-orange-100 text-orange-800',
      video_completed: 'bg-green-100 text-green-800',
      uploading: 'bg-indigo-100 text-indigo-800',
      scheduled: 'bg-cyan-100 text-cyan-800',
      published: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
      unrecoverable: 'bg-gray-100 text-gray-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!user) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Bulk Beheer</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bulk Video Beheer</span>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">
              {selectedIds.length} van {ideas.length} geselecteerd
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center space-x-1"
            >
              {selectedIds.length === ideas.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span>Alles</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
            
            <select 
              className="text-xs border rounded px-2 py-1"
              value={filters.hasError === true ? 'error' : filters.hasError === false ? 'no-error' : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                hasError: e.target.value === 'error' ? true : e.target.value === 'no-error' ? false : undefined
              }))}
            >
              <option value="">Alle errors</option>
              <option value="error">Met fouten</option>
              <option value="no-error">Zonder fouten</option>
            </select>

            <select 
              className="text-xs border rounded px-2 py-1"
              value={filters.hasYouTubeVideo === true ? 'published' : filters.hasYouTubeVideo === false ? 'unpublished' : ''}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                hasYouTubeVideo: e.target.value === 'published' ? true : e.target.value === 'unpublished' ? false : undefined
              }))}
            >
              <option value="">YouTube status</option>
              <option value="published">Gepubliceerd</option>
              <option value="unpublished">Niet gepubliceerd</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            onClick={() => handleBulkOperation('approve')}
            disabled={isLoading || selectedIds.length === 0}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-1" />
            Goedkeuren
          </Button>
          
          <Button
            onClick={() => handleBulkOperation('reject', { reason: 'Bulk rejection' })}
            disabled={isLoading || selectedIds.length === 0}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-1" />
            Afwijzen
          </Button>

          <Button
            onClick={() => {
              const date = prompt('Geplande datum (YYYY-MM-DD):')
              if (date) {
                handleBulkOperation('schedule', { 
                  scheduledDate: new Date(date).toISOString(),
                  distributeHours: 24 
                })
              }
            }}
            disabled={isLoading || selectedIds.length === 0}
            size="sm"
            variant="outline"
          >
            <Calendar className="w-4 h-4 mr-1" />
            Plannen
          </Button>

          <Button
            onClick={() => {
              if (confirm('Weet je zeker dat je deze ideeën wilt verwijderen?')) {
                handleBulkOperation('delete')
              }
            }}
            disabled={isLoading || selectedIds.length === 0}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash className="w-4 h-4 mr-1" />
            Verwijderen
          </Button>

          <div className="ml-auto flex gap-2">
            <Button
              onClick={() => handleExport('csv')}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button
              onClick={() => handleExport('json')}
              size="sm"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        {/* Video Ideas List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {ideas.map((idea: VideoIdea) => (
            <div
              key={idea._id}
              className={`p-3 border rounded-lg flex items-center space-x-3 hover:bg-gray-50 ${
                selectedIds.includes(idea._id) ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(idea._id)}
                onChange={() => handleSelectIdea(idea._id)}
                className="w-4 h-4"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm leading-tight truncate">
                    {idea.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {idea.error && (
                      <AlertTriangle className="w-4 h-4 text-red-500" title={idea.error} />
                    )}
                    {idea.youtubeVideoId && (
                      <div className="text-xs text-green-600">YouTube</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusColor(idea.status)
                  }`}>
                    {idea.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(idea.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, total)} van {total}
            </span>
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                size="sm"
                variant="outline"
              >
                Vorige
              </Button>
              <Button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!hasMore}
                size="sm"
                variant="outline"
              >
                Volgende
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm">Bezig met bulk operatie...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}