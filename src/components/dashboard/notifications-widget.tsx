'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  X,
  RotateCcw,
  Settings
} from 'lucide-react'

interface NotificationsWidgetProps {
  user: any
}

export function NotificationsWidget({ user }: NotificationsWidgetProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch notifications from Neon API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}&limit=20&unreadOnly=${showUnreadOnly}`)
        if (response.ok) {
          const notifs = await response.json()
          // Parse JSON data field
          const parsedNotifs = notifs.map(notif => ({
            ...notif,
            data: typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data
          }))
          setNotifications(parsedNotifs)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [user?.id, showUnreadOnly])

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return
    
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          userId: user.id
        })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(notif => 
          notif.id === parseInt(notificationId) ? { ...notif, read: true, read_at: new Date() } : notif
        ))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          markAll: true
        })
      })

      if (response.ok) {
        // Update local state - mark all as read
        setNotifications(prev => prev.map(notif => 
          ({ ...notif, read: true, read_at: new Date() })
        ))
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string, event: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getNotificationTitle = (event: string, data: any) => {
    switch (event) {
      case 'video_published':
        return `Video gepubliceerd: ${data.title}`
      case 'video_failed':
        return `Video creatie mislukt: ${data.title}`
      case 'bulk_operation_completed':
        return `Bulk operatie voltooid: ${data.operation}`
      case 'system_alert':
        return data.title || 'Systeem melding'
      case 'youtube_connection_issue':
        return 'YouTube verbinding probleem'
      case 'weekly_summary':
        return `Wekelijks overzicht - ${data.week}`
      case 'quota_warning':
        return `Quota waarschuwing - ${data.service}`
      default:
        return event
    }
  }

  const getNotificationMessage = (event: string, data: any) => {
    switch (event) {
      case 'video_published':
        return `Je video "${data.title}" is succesvol gepubliceerd op YouTube!`
      case 'video_failed':
        return `Er is een probleem opgetreden bij het maken van "${data.title}": ${data.error}`
      case 'bulk_operation_completed':
        return `${data.successful}/${data.total} items succesvol verwerkt`
      case 'system_alert':
        return data.message
      case 'youtube_connection_issue':
        return data.message
      case 'weekly_summary':
        return `${data.videosCreated} video's gemaakt, ${data.videosPublished} gepubliceerd`
      case 'quota_warning':
        return `Je ${data.service} quota is ${data.percentage}% gebruikt`
      default:
        return 'Nieuwe notificatie ontvangen'
    }
  }

  const formatTime = (createdAt: string) => {
    const now = Date.now()
    const timestamp = new Date(createdAt).getTime()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Nu'
    if (minutes < 60) return `${minutes}m geleden`
    if (hours < 24) return `${hours}u geleden`
    return `${days}d geleden`
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notificaties
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  const unreadCount = notifications?.filter(n => !n.read).length || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notificaties
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="text-xs"
            >
              {showUnreadOnly ? 'Alle' : 'Ongelezen'}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Alles gelezen
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`p-3 border rounded-lg ${
                  notification.read 
                    ? 'bg-white border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type, notification.event)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium text-sm leading-tight ${
                          notification.read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {getNotificationTitle(notification.event, notification.data)}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        notification.read ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {getNotificationMessage(notification.event, notification.data)}
                      </p>
                      
                      {/* Action buttons for specific notification types */}
                      {notification.event === 'video_published' && notification.data.youtubeVideoId && (
                        <div className="mt-2">
                          <a
                            href={`https://youtube.com/watch?v=${notification.data.youtubeVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            🔗 Bekijk op YouTube
                          </a>
                        </div>
                      )}
                      
                      {notification.event === 'video_failed' && (
                        <div className="mt-2">
                          <button className="text-xs text-blue-600 hover:text-blue-800">
                            <RotateCcw className="w-3 h-3 inline mr-1" />
                            Probeer opnieuw
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="ml-2 p-1 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {showUnreadOnly 
                  ? 'Geen ongelezen notificaties' 
                  : 'Geen notificaties beschikbaar'
                }
              </p>
            </div>
          )}
        </div>
        
        {notifications && notifications.length >= 20 && (
          <div className="text-center pt-3 border-t">
            <Button variant="ghost" size="sm" className="text-xs">
              Meer laden
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}