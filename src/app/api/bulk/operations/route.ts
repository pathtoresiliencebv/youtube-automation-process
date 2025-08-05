import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { 
      operation, 
      ideaIds, 
      userId, 
      reason,
      scheduledDate,
      distributeHours 
    } = await request.json()

    if (!operation || !ideaIds || !userId) {
      return NextResponse.json({
        error: 'Missing required fields: operation, ideaIds, userId'
      }, { status: 400 })
    }

    if (!Array.isArray(ideaIds) || ideaIds.length === 0) {
      return NextResponse.json({
        error: 'ideaIds must be a non-empty array'
      }, { status: 400 })
    }

    let result;

    switch (operation) {
      case 'approve':
        result = await convex.action(api.bulkOperations.bulkApproveIdeas, {
          ideaIds,
          userId
        })
        break

      case 'reject':
        result = await convex.action(api.bulkOperations.bulkRejectIdeas, {
          ideaIds,
          userId,
          reason: reason || 'Bulk rejection'
        })
        break

      case 'delete':
        result = await convex.action(api.bulkOperations.bulkDeleteIdeas, {
          ideaIds,
          userId
        })
        break

      case 'schedule':
        if (!scheduledDate) {
          return NextResponse.json({
            error: 'scheduledDate is required for schedule operation'
          }, { status: 400 })
        }
        
        result = await convex.action(api.bulkOperations.bulkUpdateSchedule, {
          ideaIds,
          userId,
          scheduledDate: new Date(scheduledDate).getTime(),
          distributeHours: distributeHours || 24
        })
        break

      default:
        return NextResponse.json({
          error: 'Invalid operation. Supported: approve, reject, delete, schedule'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      operation,
      result,
      summary: {
        total: ideaIds.length,
        successful: result.successful.length,
        failed: result.failed.length,
        successRate: Math.round((result.successful.length / ideaIds.length) * 100)
      }
    })

  } catch (error) {
    console.error('Bulk operation error:', error)
    
    return NextResponse.json({
      error: 'Bulk operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const operation = searchParams.get('operation')

    if (!userId) {
      return NextResponse.json({
        error: 'userId parameter is required'
      }, { status: 400 })
    }

    if (operation === 'status') {
      // Get bulk operation history
      const status = await convex.query(api.bulkOperations.getBulkOperationStatus, {
        userId,
        limit: 20
      })

      return NextResponse.json({
        success: true,
        operations: status
      })
    } else if (operation === 'export') {
      // Handle export request
      const format = searchParams.get('format') as 'csv' | 'json' || 'json'
      const status = searchParams.get('status') || undefined
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      const exportData = await convex.action(api.bulkOperations.bulkExportData, {
        userId,
        format,
        status,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined
      })

      // Set appropriate headers for download
      const headers = new Headers({
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="${exportData.filename}"`
      })

      return new NextResponse(exportData.data, { headers })
    } else {
      // Get filtered video ideas
      const statusFilter = searchParams.get('statusFilter')?.split(',')
      const hasYouTubeVideo = searchParams.get('hasYouTubeVideo')
      const hasError = searchParams.get('hasError')
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')

      const result = await convex.query(api.bulkOperations.getVideoIdeasWithFilters, {
        userId,
        status: statusFilter,
        hasYouTubeVideo: hasYouTubeVideo === 'true' ? true : hasYouTubeVideo === 'false' ? false : undefined,
        hasError: hasError === 'true' ? true : hasError === 'false' ? false : undefined,
        limit,
        offset
      })

      return NextResponse.json({
        success: true,
        ...result
      })
    }

  } catch (error) {
    console.error('Bulk operation GET error:', error)
    
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}