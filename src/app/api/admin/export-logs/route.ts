import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
})

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') as 'csv' | 'json' || 'json'
    const timeRange = searchParams.get('timeRange') || '24h'
    const dataType = searchParams.get('dataType') || 'logs'
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json({
        error: 'Admin user ID is required'
      }, { status: 400 })
    }

    // Export system data using Convex action
    const exportResult = await convex.action(api.admin.exportSystemData, {
      dataType: dataType as any,
      format,
      timeRange,
      adminUserId: adminUserId as any,
    })

    // Set appropriate headers for download
    const headers = new Headers({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
      'X-Export-Count': exportResult.count.toString(),
    })

    return new NextResponse(exportResult.data, { headers })

  } catch (error) {
    console.error('Export logs error:', error)
    
    return NextResponse.json({
      error: 'Failed to export logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}