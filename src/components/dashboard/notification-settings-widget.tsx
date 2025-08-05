'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Settings,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface NotificationSettingsWidgetProps {
  user: any
}

export function NotificationSettingsWidget({ user }: NotificationSettingsWidgetProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [localSettings, setLocalSettings] = useState<any>(null)

  // Get current notification settings
  const notificationSettings = useQuery(
    api.notifications.getNotificationSettings,
    user ? { userId: user.id } : 'skip'
  )

  // Mutation to update settings
  const updateSettings = useMutation(api.notifications.updateNotificationSettings)

  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings)
    }
  }, [notificationSettings])

  const handleToggle = (key: string, value?: string) => {
    if (!localSettings) return

    setLocalSettings((prev: any) => {
      if (value) {
        // Nested setting (like notificationTypes.videoPublished)
        const [parent, child] = key.split('.')
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: !prev[parent]?.[child]
          }
        }
      } else {
        // Top level setting
        return {
          ...prev,
          [key]: !prev[key]
        }
      }
    })
  }

  const handleSave = async () => {
    if (!user || !localSettings) return

    setIsUpdating(true)
    try {
      await updateSettings({
        userId: user.id,
        settings: localSettings
      })
      
      // Show success message
      alert('Notificatie instellingen succesvol bijgewerkt!')
      
    } catch (error) {
      console.error('Failed to update notification settings:', error)
      alert('Er ging iets mis bij het bijwerken van je notificatie instellingen.')
    } finally {
      setIsUpdating(false)
    }
  }

  const hasChanges = () => {
    return JSON.stringify(localSettings) !== JSON.stringify(notificationSettings)
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notificatie Instellingen
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (!localSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notificatie Instellingen
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            Notificatie Instellingen
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Algemene Instellingen</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-sm">Email Notificaties</div>
                    <div className="text-xs text-gray-500">Ontvang belangrijke updates via email</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('emailNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">Push Notificaties</div>
                    <div className="text-xs text-gray-500">Realtime meldingen in de browser</div>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('pushNotifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localSettings.pushNotifications ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Notificatie Types</h4>
            <div className="space-y-2">
              {[
                { key: 'videoPublished', label: 'Video Gepubliceerd', icon: CheckCircle, color: 'text-green-500', desc: 'Wanneer een video succesvol is gepubliceerd' },
                { key: 'videoFailed', label: 'Video Mislukt', icon: AlertTriangle, color: 'text-red-500', desc: 'Wanneer video creatie faalt' },
                { key: 'bulkOperations', label: 'Bulk Operaties', icon: Settings, color: 'text-blue-500', desc: 'Updates over bulk acties' },
                { key: 'systemAlerts', label: 'Systeem Alerts', icon: AlertTriangle, color: 'text-orange-500', desc: 'Belangrijke systeem meldingen' },
                { key: 'weeklyReports', label: 'Wekelijkse Rapporten', icon: Mail, color: 'text-purple-500', desc: 'Overzicht van je prestaties' },
                { key: 'quotaWarnings', label: 'Quota Waarschuwingen', icon: AlertTriangle, color: 'text-yellow-500', desc: 'API limieten en quota alerts' },
              ].map(({ key, label, icon: Icon, color, desc }) => (
                <div key={key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(`notificationTypes.${key}`)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      localSettings.notificationTypes?.[key] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        localSettings.notificationTypes?.[key] ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          {hasChanges() && (
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setLocalSettings(notificationSettings)}
                disabled={isUpdating}
              >
                Annuleren
              </Button>
              <Button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Opslaan...
                  </>
                ) : (
                  'Instellingen Opslaan'
                )}
              </Button>
            </div>
          )}

          {/* Email Status */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>
              📧 Email: {user.email}
              {localSettings.emailNotifications ? 
                <span className="text-green-600 ml-2">✓ Actief</span> : 
                <span className="text-gray-400 ml-2">Uitgeschakeld</span>
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}