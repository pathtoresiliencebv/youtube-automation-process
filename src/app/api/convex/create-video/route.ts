import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export async function POST(request: NextRequest) {
  try {
    const { ideaId } = await request.json()

    if (!ideaId) {
      return NextResponse.json({ error: 'Idea ID is required' }, { status: 400 })
    }

    // First generate script if it doesn't exist
    console.log('Generating script for idea:', ideaId)
    const scriptResult = await convex.action(api.content.generateScript, {
      ideaId: ideaId
    })

    if (!scriptResult || !scriptResult.success) {
      throw new Error('Failed to generate script')
    }

    // Then create video with RevID
    console.log('Creating video with RevID for idea:', ideaId)
    const videoResult = await convex.action(api.revid.createVideo, {
      ideaId: ideaId
    })

    return NextResponse.json({
      success: true,
      message: 'Video creation started successfully',
      jobId: videoResult.jobId,
      ideaId: ideaId
    })

  } catch (error) {
    console.error('Create video error:', error)
    
    return NextResponse.json({
      error: 'Failed to create video',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}