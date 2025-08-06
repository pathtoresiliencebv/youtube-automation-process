import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'analysis' or 'optimization'
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      if (type === 'analysis') {
        // Get latest content analysis
        const result = await client.query(
          `SELECT * FROM ai_content_analysis 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [userId]
        )

        return NextResponse.json(result.rows[0] || null)
      } 
      
      if (type === 'optimization') {
        // Get optimization history
        const result = await client.query(
          `SELECT * FROM ai_optimizations 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2`,
          [userId, limit]
        )

        return NextResponse.json(result.rows)
      }

      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('AI optimization fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI optimization data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, action, data } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      if (action === 'analyze') {
        // Create mock analysis result - in production this would call Gemini AI
        const analysisResult = {
          analysisType: data.analysisType,
          confidence: 'hoog',
          dataPoints: 15,
          results: {
            insights: [
              'Video\'s gepubliceerd tussen 18:00-20:00 presteren 35% beter',
              'Tutorials en how-to content hebben een 40% hogere engagement rate',
              'Titels met vraagwoorden krijgen 25% meer clicks'
            ],
            recommendations: [
              'Publiceer nieuwe video\'s op dinsdagen en donderdagen om 19:00',
              'Focus meer op educational content in je niche',
              'Gebruik meer vraagwoorden in je titels'
            ]
          }
        }

        const result = await client.query(
          `INSERT INTO ai_content_analysis (user_id, analysis_type, confidence, data_points, results, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
          [userId, data.analysisType, 'hoog', 15, JSON.stringify(analysisResult.results)]
        )

        return NextResponse.json({ success: true, analysis: result.rows[0] })
      }

      if (action === 'optimize') {
        // Create mock optimization result - in production this would call Gemini AI
        const optimizationResult = {
          contentType: data.contentType,
          baseContent: data.baseContent,
          improvements: [
            'Titel geoptimaliseerd voor betere SEO',
            'Emotionele woorden toegevoegd',
            'Call-to-action verbeterd'
          ],
          predictedPerformance: {
            expectedImprovement: '25-40%'
          }
        }

        const result = await client.query(
          `INSERT INTO ai_optimizations (user_id, content_type, base_content, improvements, predicted_performance, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
          [userId, data.contentType, data.baseContent, JSON.stringify(optimizationResult.improvements), JSON.stringify(optimizationResult.predictedPerformance)]
        )

        return NextResponse.json({ success: true, optimization: result.rows[0] })
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('AI optimization action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform AI optimization action' },
      { status: 500 }
    )
  }
}