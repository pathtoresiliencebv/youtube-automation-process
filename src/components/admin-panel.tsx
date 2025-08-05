'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Database, Zap, CheckCircle, AlertCircle } from 'lucide-react'

export function AdminPanel() {
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<any>(null)

  const handleSeedConvex = async () => {
    setIsSeeding(true)
    setSeedResult(null)

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      setSeedResult(result)

      if (result.success) {
        console.log('✅ Convex seeding successful:', result)
      } else {
        console.error('❌ Convex seeding failed:', result)
      }
    } catch (error) {
      console.error('❌ Seeding request failed:', error)
      setSeedResult({
        success: false,
        error: 'Network error during seeding',
        details: error.message
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🛠️ Database Admin Panel
          </h1>
          <p className="text-gray-600">
            Beheer de databases voor het YouTube Automation systeem
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                PostgreSQL (Neon)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-800">Database Seeded</span>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• 1 Demo user</li>
                    <li>• 5 Sample YouTube videos</li>
                    <li>• 4 AI-generated video ideas</li>
                    <li>• System activity logs</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-600">
                  PostgreSQL database is ready met sample data voor testing en demonstratie.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Convex Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Seed de Convex database met sample data voor real-time functionaliteit.
                </p>
                
                <Button 
                  onClick={handleSeedConvex}
                  disabled={isSeeding}
                  className="w-full"
                  variant="outline"
                >
                  {isSeeding ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Seeding database...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Seed Convex Database
                    </>
                  )}
                </Button>

                {seedResult && (
                  <div className={`border rounded-lg p-4 ${
                    seedResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {seedResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${
                        seedResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {seedResult.success ? 'Seeding Successful!' : 'Seeding Failed'}
                      </span>
                    </div>
                    
                    {seedResult.success && seedResult.data && (
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• User created: {seedResult.data.userId}</li>
                        <li>• Video ideas: {seedResult.data.videoIdeas}</li>
                        <li>• Analytics entries: {seedResult.data.youtubeAnalytics}</li>
                        <li>• System logs: {seedResult.data.systemLogs}</li>
                      </ul>
                    )}
                    
                    {!seedResult.success && (
                      <p className="text-sm text-red-700">
                        {seedResult.error}: {seedResult.details}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Database Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">✅</div>
                <div className="text-sm font-semibold">PostgreSQL</div>
                <div className="text-xs text-gray-600">Neon Database</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {seedResult?.success ? '✅' : '⏳'}
                </div>
                <div className="text-sm font-semibold">Convex</div>
                <div className="text-xs text-gray-600">Real-time Database</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">🚀</div>
                <div className="text-sm font-semibold">System</div>
                <div className="text-xs text-gray-600">Ready for Use</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            🏠 Terug naar Hoofdpagina
          </Button>
        </div>
      </div>
    </div>
  )
}