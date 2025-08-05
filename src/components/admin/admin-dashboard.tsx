'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Video, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Download,
  Settings,
  Monitor,
  Database,
  Globe
} from 'lucide-react'

interface AdminDashboardProps {
  user: any
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  services: {
    convex: boolean
    postgres: boolean
    gemini: boolean
    revid: boolean
    youtube: boolean
  }
  lastCheck: number
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  // Get system statistics
  const systemStats = useQuery(api.admin.getSystemStats, {
    timeRange: selectedTimeRange
  })

  // Get error logs
  const errorLogs = useQuery(api.admin.getErrorLogs, {
    limit: 10
  })

  // Get active jobs
  const activeJobs = useQuery(api.admin.getActiveJobs, {})

  // Get performance metrics
  const performanceMetrics = useQuery(api.admin.getPerformanceMetrics, {
    timeRange: selectedTimeRange
  })

  useEffect(() => {
    checkSystemHealth()
    const interval = setInterval(checkSystemHealth, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/health-check')
      const health = await response.json()
      setSystemHealth(health)
    } catch (error) {
      console.error('Failed to check system health:', error)
      setSystemHealth({
        status: 'critical',
        services: {
          convex: false,
          postgres: false,
          gemini: false,
          revid: false,
          youtube: false
        },
        lastCheck: Date.now()
      })
    }
  }

  const handleRefreshStats = async () => {
    setIsRefreshing(true)
    await checkSystemHealth()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleExportLogs = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/admin/export-logs?format=${format}&timeRange=${selectedTimeRange}&adminUserId=${user.id}`)
      
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system_logs_${selectedTimeRange}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert(`Export failed: ${error.message}`)
    }
  }

  const handleQuickAction = async (action: string) => {
    if (!user) return

    try {
      let params: any = { action, adminUserId: user.id }

      if (action === 'cleanup-logs') {
        const days = prompt('Delete logs older than how many days?', '30')
        if (!days) return
        params.olderThanDays = parseInt(days)
      }

      const response = await fetch('/api/admin/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Action failed')
      }

      alert(`${action} completed successfully!`)
      
      // Refresh data after certain actions
      if (['cleanup-logs', 'restart-services'].includes(action)) {
        await handleRefreshStats()
      }

    } catch (error) {
      console.error('Quick action error:', error)
      alert(`Action failed: ${error.message}`)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Toegang Geweigerd</h2>
            <p className="text-gray-600">Je hebt geen admin rechten om deze pagina te bekijken.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Systeem monitoring en beheer
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="text-sm border rounded px-3 py-2"
              >
                <option value="1h">Laatste uur</option>
                <option value="24h">Laatste 24 uur</option>
                <option value="7d">Laatste week</option>
                <option value="30d">Laatste maand</option>
              </select>
              
              <Button
                onClick={handleRefreshStats}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
              >
                {isRefreshing ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Vernieuwen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Systeem Status</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {systemHealth ? (
                <>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    getHealthStatusColor(systemHealth.status)
                  }`}>
                    {systemHealth.status === 'healthy' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {systemHealth.status === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {systemHealth.status === 'critical' && <XCircle className="w-3 h-3 mr-1" />}
                    {systemHealth.status.toUpperCase()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Laatst gecontroleerd: {new Date(systemHealth.lastCheck).toLocaleTimeString('nl-NL')}
                  </p>
                </>
              ) : (
                <LoadingSpinner size="sm" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats?.activeUsers || '...'}
              </div>
              <p className="text-xs text-muted-foreground">
                Gebruikers in {selectedTimeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Video's Gemaakt</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats?.videosCreated || '...'}
              </div>
              <p className="text-xs text-muted-foreground">
                Nieuwe video's in {selectedTimeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeJobs?.length || '...'}
              </div>
              <p className="text-xs text-muted-foreground">
                Jobs in uitvoering
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Service Status Grid */}
        {systemHealth && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(systemHealth.services).map(([service, isHealthy]) => (
                  <div key={service} className="flex items-center space-x-2">
                    {isHealthy ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{service}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Metrics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Performance Metrics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {performanceMetrics ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gemiddelde Response Tijd</span>
                    <span className="font-medium">{performanceMetrics.avgResponseTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium">{performanceMetrics.successRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Video Creation Rate</span>
                    <span className="font-medium">{performanceMetrics.videoCreationRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Calls</span>
                    <span className="font-medium">{performanceMetrics.totalApiCalls}</span>
                  </div>
                </div>
              ) : (
                <LoadingSpinner />
              )}
            </CardContent>
          </Card>

          {/* Active Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Actieve Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeJobs && activeJobs.length > 0 ? (
                  activeJobs.map((job: any) => (
                    <div key={job._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium">{job.action}</div>
                        <div className="text-xs text-gray-500">
                          {job.userId} • {new Date(job.createdAt).toLocaleTimeString('nl-NL')}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        job.status === 'running' ? 'bg-blue-100 text-blue-800' : 
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Geen actieve jobs</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Logs */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recente Errors</CardTitle>
            <div className="flex space-x-2">
              <Button onClick={() => handleExportLogs('csv')} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button onClick={() => handleExportLogs('json')} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {errorLogs && errorLogs.length > 0 ? (
                errorLogs.map((log: any) => (
                  <div key={log._id} className="p-3 border-l-4 border-red-400 bg-red-50 rounded">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-sm">{log.action}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleString('nl-NL')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{log.message}</p>
                        {log.metadata?.error && (
                          <p className="text-xs text-red-600 mt-1 font-mono">
                            {log.metadata.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Geen recente errors</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col hover:bg-blue-50" 
                onClick={() => handleQuickAction('cleanup-logs')}
              >
                <Database className="w-6 h-6 mb-2" />
                <span className="text-xs">Database Cleanup</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col hover:bg-green-50" 
                onClick={() => handleQuickAction('restart-services')}
              >
                <RefreshCw className="w-6 h-6 mb-2" />
                <span className="text-xs">Restart Services</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col hover:bg-purple-50" 
                onClick={() => handleQuickAction('system-config')}
              >
                <Settings className="w-6 h-6 mb-2" />
                <span className="text-xs">System Config</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col hover:bg-orange-50" 
                onClick={() => window.open('/api/debug/env?secret=debug-env-check', '_blank')}
              >
                <Globe className="w-6 h-6 mb-2" />
                <span className="text-xs">API Status</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}