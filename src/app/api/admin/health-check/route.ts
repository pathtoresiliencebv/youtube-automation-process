import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

interface ServiceHealth {
  postgres: boolean
  gemini: boolean
  revid: boolean
  youtube: boolean
}

export async function GET(request: NextRequest) {
  try {
    const services: ServiceHealth = {
      postgres: false,
      gemini: false,
      revid: false,
      youtube: false
    }

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check PostgreSQL connection
    try {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      })
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      services.postgres = true
    } catch (error) {
      console.error('PostgreSQL health check failed:', error)
      services.postgres = false
      overallStatus = 'critical'
    }

    // Check Gemini API
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key') {
        // Test Gemini API with a simple request
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        services.gemini = response.ok
      }
    } catch (error) {
      console.error('Gemini API health check failed:', error)
      services.gemini = false
    }

    // Check RevID API
    try {
      if (process.env.REVID_API_KEY && process.env.REVID_API_KEY !== 'your-revid-api-key') {
        // Test RevID API with a simple request
        const response = await fetch('https://v1.revid.ai/jobs', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.REVID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        })
        services.revid = response.ok || response.status === 401 // 401 is also OK, means API is responding
      }
    } catch (error) {
      console.error('RevID API health check failed:', error)
      services.revid = false
    }

    // Check YouTube API
    try {
      if (process.env.YOUTUBE_CLIENT_SECRET && 
          process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID && 
          process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID !== 'your-actual-youtube-client-id') {
        // YouTube API is considered healthy if credentials are configured
        services.youtube = true
      }
    } catch (error) {
      console.error('YouTube API health check failed:', error)
      services.youtube = false
    }

    // Determine overall status
    const healthyServices = Object.values(services).filter(Boolean).length
    const totalServices = Object.keys(services).length

    if (healthyServices === totalServices) {
      overallStatus = 'healthy'
    } else if (healthyServices >= totalServices * 0.6) {
      overallStatus = 'warning'
    } else {
      overallStatus = 'critical'
    }

    return NextResponse.json({
      status: overallStatus,
      services,
      lastCheck: Date.now(),
      summary: {
        healthy: healthyServices,
        total: totalServices,
        healthPercentage: Math.round((healthyServices / totalServices) * 100)
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'critical',
      services: {
        postgres: false,
        gemini: false,
        revid: false,
        youtube: false
      },
      lastCheck: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      summary: {
        healthy: 0,
        total: 5,
        healthPercentage: 0
      }
    }, { status: 500 })
  }
}