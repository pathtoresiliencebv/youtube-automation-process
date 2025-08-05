'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, CheckCircle } from 'lucide-react'

export function SetupGuide() {
  const steps = [
    {
      title: "Google Cloud Console Setup",
      description: "Maak OAuth 2.0 credentials aan voor YouTube API toegang",
      action: "Open Google Cloud Console",
      url: "https://console.cloud.google.com/apis/credentials"
    },
    {
      title: "APIs Inschakelen", 
      description: "Schakel YouTube Data API v3 en Analytics API in",
      action: "Open API Library",
      url: "https://console.cloud.google.com/apis/library"
    },
    {
      title: "Vercel Environment Variables",
      description: "Voeg je echte Client ID en Secret toe aan Vercel",
      action: "Open Vercel Dashboard",
      url: "https://vercel.com/dashboard"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🤖 YouTube Automation Setup
          </h1>
          <p className="text-gray-600">
            Volg deze stappen om je YouTube automation systeem volledig te configureren
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 text-sm">
                  {step.description}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => window.open(step.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {step.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              OAuth 2.0 Configuratie Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Authorized JavaScript origins:</h4>
                <code className="bg-gray-100 p-2 rounded text-xs block">
                  https://youtube-automation-6rz8bipny-jasons-projects-3108a48b.vercel.app
                </code>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Authorized redirect URIs:</h4>
                <code className="bg-gray-100 p-2 rounded text-xs block">
                  https://youtube-automation-6rz8bipny-jasons-projects-3108a48b.vercel.app/api/auth/callback
                </code>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Required APIs:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• YouTube Data API v3</li>
                  <li>• YouTube Analytics API</li>
                  <li>• YouTube Reporting API</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button onClick={() => window.location.reload()}>
            🔄 Vernieuwen na configuratie
          </Button>
        </div>
      </div>
    </div>
  )
}