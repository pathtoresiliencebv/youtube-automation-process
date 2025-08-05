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

    // Update idea status to rejected
    await convex.mutation(api.content.updateIdeaStatus, {
      ideaId: ideaId,
      status: 'rejected'
    })

    return NextResponse.json({
      success: true,
      message: 'Video idea rejected successfully'
    })

  } catch (error) {
    console.error('Reject idea error:', error)
    
    return NextResponse.json({
      error: 'Failed to reject idea',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}