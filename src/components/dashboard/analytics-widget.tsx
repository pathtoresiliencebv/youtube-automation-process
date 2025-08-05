'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatNumber } from '@/lib/utils'
import { BarChart3, TrendingUp, Eye, Clock, Users } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

interface AnalyticsWidgetProps {
  user: any
}

export function AnalyticsWidget({ user }: AnalyticsWidgetProps) {
  const topVideos = useQuery(
    api.youtube.getTopVideos,
    user ? { userId: user.id, limit: 5 } : 'skip'
  )

  // Generate mock analytics data for chart
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }),
    views: Math.floor(Math.random() * 5000) + 1000,
    engagement: Math.floor(Math.random() * 100) + 50,
  }))

  // Calculate summary statistics
  const totalViews = topVideos?.reduce((sum, video) => sum + video.views, 0) || 0
  const avgPerformanceScore = topVideos?.length ? 
    topVideos.reduce((sum, video) => sum + video.performanceScore, 0) / topVideos.length : 0
  const totalWatchTime = topVideos?.reduce((sum, video) => sum + video.watchTime, 0) || 0

  if (!user) {
    return (
      <Card className="h-96">
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
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
          <span>Performance Analytics</span>
          <BarChart3 className="w-5 h-5 text-gray-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topVideos === undefined ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : topVideos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Geen analytics data beschikbaar</p>
            <p className="text-sm mt-1">Verbind je YouTube kanaal om data te analyseren</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="w-4 h-4 text-blue-500 mr-1" />
                </div>
                <div className="text-lg font-semibold">{formatNumber(totalViews)}</div>
                <div className="text-xs text-gray-500">Total Views</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="w-4 h-4 text-green-500 mr-1" />
                </div>
                <div className="text-lg font-semibold">{Math.round(totalWatchTime / 60)}h</div>
                <div className="text-xs text-gray-500">Watch Time</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-500 mr-1" />
                </div>
                <div className="text-lg font-semibold">{avgPerformanceScore.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Avg Score</div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top Videos */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Top Presterende Video's
              </h4>
              <div className="space-y-2 max-h-20 overflow-y-auto">
                {topVideos.slice(0, 3).map((video, index) => (
                  <div key={video._id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="truncate" title={video.title}>
                        {video.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500 flex-shrink-0">
                      <span>{formatNumber(video.views)}</span>
                      <span className="font-medium text-green-600">
                        {video.performanceScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}