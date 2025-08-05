import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Call the Convex action to generate video ideas
    const result = await convex.action(api.content.generateVideoIdeas, {
      userId: userId
    })

    return NextResponse.json({
      success: true,
      count: result?.ideaIds?.length || 0,
      message: 'Video ideas generated successfully'
    })

  } catch (error) {
    console.error('Generate ideas error:', error)
    
    // Handle specific Convex errors
    if (error.message?.includes('No video analytics data found')) {
      return NextResponse.json({
        error: 'Geen YouTube analytics data gevonden',
        details: 'Verbind eerst je YouTube kanaal en analyseer je video\'s'
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to generate video ideas',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}