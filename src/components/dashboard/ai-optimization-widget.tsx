'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  Target, 
  Users, 
  Lightbulb,
  Zap,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  Star
} from 'lucide-react'

interface AIOptimizationWidgetProps {
  user: any
}

export function AIOptimizationWidget({ user }: AIOptimizationWidgetProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'optimization'>('analysis')
  const [selectedAnalysis, setSelectedAnalysis] = useState<'trending_topics' | 'optimal_timing' | 'content_patterns' | 'audience_engagement'>('trending_topics')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationInput, setOptimizationInput] = useState('')
  const [optimizationType, setOptimizationType] = useState<'video_idea' | 'title_optimization' | 'script_improvement'>('video_idea')

  const [contentAnalysis, setContentAnalysis] = useState(null)
  const [optimizationHistory, setOptimizationHistory] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch AI optimization data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        // Fetch latest content analysis
        const analysisResponse = await fetch(`/api/ai-optimization?userId=${user.id}&type=analysis`)
        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json()
          // Parse JSON fields
          const analysisWithParsedResults = analysis ? {
            ...analysis,
            results: typeof analysis.results === 'string' ? JSON.parse(analysis.results) : analysis.results
          } : null
          setContentAnalysis(analysisWithParsedResults)
        }

        // Fetch optimization history
        const historyResponse = await fetch(`/api/ai-optimization?userId=${user.id}&type=optimization&limit=5`)
        if (historyResponse.ok) {
          const history = await historyResponse.json()
          // Parse JSON fields in optimization history
          const parsedHistory = history.map(opt => ({
            ...opt,
            improvements: typeof opt.improvements === 'string' ? JSON.parse(opt.improvements) : opt.improvements,
            predicted_performance: typeof opt.predicted_performance === 'string' ? JSON.parse(opt.predicted_performance) : opt.predicted_performance
          }))
          setOptimizationHistory(parsedHistory)
        }
      } catch (error) {
        console.error('Failed to fetch AI optimization data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

  const handleRunAnalysis = async () => {
    if (!user) return
    
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'analyze',
          data: { analysisType: selectedAnalysis }
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Refresh content analysis
        const analysisResponse = await fetch(`/api/ai-optimization?userId=${user.id}&type=analysis`)
        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json()
          const analysisWithParsedResults = analysis ? {
            ...analysis,
            results: typeof analysis.results === 'string' ? JSON.parse(analysis.results) : analysis.results
          } : null
          setContentAnalysis(analysisWithParsedResults)
        }
        
        alert('Content analyse voltooid! Bekijk de resultaten hieronder.')
      } else {
        throw new Error('Analysis request failed')
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Er ging iets mis bij de analyse. Probeer het opnieuw.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleOptimizeContent = async () => {
    if (!user || !optimizationInput.trim()) return
    
    setIsOptimizing(true)
    try {
      const response = await fetch('/api/ai-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'optimize',
          data: {
            contentType: optimizationType,
            baseContent: optimizationInput
          }
        })
      })

      if (response.ok) {
        // Refresh optimization history
        const historyResponse = await fetch(`/api/ai-optimization?userId=${user.id}&type=optimization&limit=5`)
        if (historyResponse.ok) {
          const history = await historyResponse.json()
          const parsedHistory = history.map(opt => ({
            ...opt,
            improvements: typeof opt.improvements === 'string' ? JSON.parse(opt.improvements) : opt.improvements,
            predicted_performance: typeof opt.predicted_performance === 'string' ? JSON.parse(opt.predicted_performance) : opt.predicted_performance
          }))
          setOptimizationHistory(parsedHistory)
        }
        
        alert('Content optimalisatie voltooid! Check de resultaten.')
        setOptimizationInput('')
      } else {
        throw new Error('Optimization request failed')
      }
    } catch (error) {
      console.error('Optimization failed:', error)
      alert('Er ging iets mis bij de optimalisatie. Probeer het opnieuw.')
    } finally {
      setIsOptimizing(false)
    }
  }

  const getAnalysisIcon = (type: string) => {
    switch (type) {
      case 'trending_topics': return <TrendingUp className="w-4 h-4" />
      case 'optimal_timing': return <Clock className="w-4 h-4" />
      case 'content_patterns': return <Target className="w-4 h-4" />
      case 'audience_engagement': return <Users className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'hoog': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'laag': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="mr-2 h-4 w-4" />
            AI Content Optimalisatie
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
            <Brain className="mr-2 h-4 w-4 text-purple-500" />
            AI Content Optimalisatie
          </div>
          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'analysis' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analysis')}
            >
              Analyse
            </Button>
            <Button
              variant={activeTab === 'optimization' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('optimization')}
            >
              Optimalisatie
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTab === 'analysis' ? (
          <div className="space-y-6">
            {/* Analysis Type Selection */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-3">Kies Analyse Type</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'trending_topics', label: 'Trending Onderwerpen', desc: 'Analyseer welke onderwerpen het beste presteren' },
                  { key: 'optimal_timing', label: 'Optimale Timing', desc: 'Vind de beste tijden om te publiceren' },
                  { key: 'content_patterns', label: 'Content Patronen', desc: 'Ontdek welke content patronen werken' },
                  { key: 'audience_engagement', label: 'Publiek Betrokkenheid', desc: 'Analyseer engagement patronen' }
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedAnalysis(key as any)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      selectedAnalysis === key 
                        ? 'border-purple-200 bg-purple-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {getAnalysisIcon(key)}
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Run Analysis Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Analyseren...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start AI Analyse
                  </>
                )}
              </Button>
            </div>

            {/* Analysis Results */}
            {contentAnalysis && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">Laatste Analyse Resultaten</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${getConfidenceColor(contentAnalysis.confidence)}`}>
                    {contentAnalysis.confidence} betrouwbaarheid
                  </span>
                </div>

                {/* Insights */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Key Insights
                  </h5>
                  <ul className="space-y-1">
                    {contentAnalysis.results?.insights?.map((insight: string, index: number) => (
                      <li key={index} className="text-sm text-blue-700 flex items-start">
                        <ArrowUp className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 mb-2 flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Aanbevelingen
                  </h5>
                  <ul className="space-y-1">
                    {contentAnalysis.results?.recommendations?.map((rec: string, index: number) => (
                      <li key={index} className="text-sm text-green-700 flex items-start">
                        <CheckCircle className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Analyse gebaseerd op {contentAnalysis.data_points} video's • 
                  {new Date(contentAnalysis.created_at).toLocaleDateString('nl-NL')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Optimization Type */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-3">Optimalisatie Type</h4>
              <div className="flex space-x-2">
                {[
                  { key: 'video_idea', label: 'Video Idee' },
                  { key: 'title_optimization', label: 'Titel' },
                  { key: 'script_improvement', label: 'Script' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={optimizationType === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOptimizationType(key as any)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {optimizationType === 'video_idea' ? 'Onderwerp of concept' :
                 optimizationType === 'title_optimization' ? 'Huidige titel' :
                 'Huidige script'}
              </label>
              <textarea
                value={optimizationInput}
                onChange={(e) => setOptimizationInput(e.target.value)}
                placeholder={
                  optimizationType === 'video_idea' ? 'Beschrijf je video idee of onderwerp...' :
                  optimizationType === 'title_optimization' ? 'Plak je huidige titel hier...' :
                  'Plak je huidige script hier...'
                }
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Optimize Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleOptimizeContent}
                disabled={isOptimizing || !optimizationInput.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isOptimizing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Optimaliseren...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Optimaliseer Content
                  </>
                )}
              </Button>
            </div>

            {/* Optimization History */}
            {optimizationHistory && optimizationHistory.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Recente Optimalisaties</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {optimizationHistory.map((opt: any) => (
                    <div key={opt.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">
                          {opt.content_type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(opt.created_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {opt.improvements?.slice(0, 2).join(' • ')}
                      </div>
                      {opt.predicted_performance && (
                        <div className="text-xs text-green-600 mt-1">
                          Verwachte verbetering: {opt.predicted_performance?.expectedImprovement || '20-35%'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Analysis Warning */}
        {activeTab === 'optimization' && !contentAnalysis && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                Voor betere optimalisatie resultaten, voer eerst een content analyse uit.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}