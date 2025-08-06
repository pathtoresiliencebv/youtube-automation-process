import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

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

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Calculate time range
      let timeFilter = "created_at >= NOW() - INTERVAL '24 hours'"
      switch (timeRange) {
        case '1h':
          timeFilter = "created_at >= NOW() - INTERVAL '1 hour'"
          break
        case '7d':
          timeFilter = "created_at >= NOW() - INTERVAL '7 days'"
          break
        case '30d':
          timeFilter = "created_at >= NOW() - INTERVAL '30 days'"
          break
      }

      // Get system logs data
      const result = await client.query(
        `SELECT * FROM system_logs WHERE ${timeFilter} ORDER BY created_at DESC`
      )

      let exportData: string
      let filename: string

      if (format === 'csv') {
        const headers = ['ID', 'User ID', 'Action', 'Level', 'Message', 'Created At']
        const csvRows = [
          headers.join(','),
          ...result.rows.map(row => [
            row.id,
            row.user_id || '',
            `"${row.action.replace(/"/g, '""')}"`,
            row.level,
            `"${row.message.replace(/"/g, '""')}"`,
            row.created_at
          ].join(','))
        ]
        exportData = csvRows.join('\n')
        filename = `system_logs_${timeRange}.csv`
      } else {
        exportData = JSON.stringify(result.rows, null, 2)
        filename = `system_logs_${timeRange}.json`
      }

      // Set appropriate headers for download
      const headers = new Headers({
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Count': result.rowCount?.toString() || '0',
      })

      return new NextResponse(exportData, { headers })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Export logs error:', error)
    
    return NextResponse.json({
      error: 'Failed to export logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}