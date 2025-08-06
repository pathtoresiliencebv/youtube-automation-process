import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

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

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      let result
      let successful = 0
      let failed = 0

      switch (operation) {
        case 'approve':
          result = await client.query(
            `UPDATE video_ideas 
             SET status = 'approved', updated_at = NOW() 
             WHERE id = ANY($1) AND user_id = $2
             RETURNING id`,
            [ideaIds, userId]
          )
          successful = result.rowCount || 0
          break

        case 'reject':
          result = await client.query(
            `UPDATE video_ideas 
             SET status = 'rejected', error = $3, updated_at = NOW() 
             WHERE id = ANY($1) AND user_id = $2
             RETURNING id`,
            [ideaIds, userId, reason || 'Bulk rejection']
          )
          successful = result.rowCount || 0
          break

        case 'schedule':
          if (!scheduledDate) {
            return NextResponse.json({
              error: 'scheduledDate is required for schedule operation'
            }, { status: 400 })
          }
          
          result = await client.query(
            `UPDATE video_ideas 
             SET status = 'scheduled', scheduled_date = $3, updated_at = NOW() 
             WHERE id = ANY($1) AND user_id = $2
             RETURNING id`,
            [ideaIds, userId, scheduledDate]
          )
          successful = result.rowCount || 0
          break

        case 'delete':
          result = await client.query(
            `DELETE FROM video_ideas 
             WHERE id = ANY($1) AND user_id = $2
             RETURNING id`,
            [ideaIds, userId]
          )
          successful = result.rowCount || 0
          break

        default:
          return NextResponse.json({
            error: 'Invalid operation. Supported: approve, reject, delete, schedule'
          }, { status: 400 })
      }

      failed = ideaIds.length - successful

      // Create notification for bulk operation
      try {
        await client.query(
          `INSERT INTO notifications (user_id, type, event, data, read, created_at) 
           VALUES ($1, 'info', 'bulk_operation_completed', $2, false, NOW())`,
          [userId, JSON.stringify({
            operation,
            total: ideaIds.length,
            successful,
            failed
          })]
        )
      } catch (notifError) {
        console.warn('Failed to create notification:', notifError)
      }

      return NextResponse.json({
        success: true,
        operation,
        summary: {
          total: ideaIds.length,
          successful,
          failed,
          successRate: Math.round((successful / ideaIds.length) * 100)
        }
      })

    } finally {
      await client.end()
    }

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

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      if (operation === 'export') {
        // Handle export request
        const format = searchParams.get('format') as 'csv' | 'json' || 'json'
        const status = searchParams.get('status')

        let query = 'SELECT * FROM video_ideas WHERE user_id = $1'
        const params = [userId]

        if (status) {
          query += ' AND status = ANY($2)'
          params.push(status.split(','))
        }

        query += ' ORDER BY created_at DESC'

        const result = await client.query(query, params)

        if (format === 'csv') {
          // Generate CSV
          const headers = ['ID', 'Title', 'Status', 'Created At', 'YouTube Video ID', 'Error']
          const csvRows = [
            headers.join(','),
            ...result.rows.map(row => [
              row.id,
              `"${row.title.replace(/"/g, '""')}"`,
              row.status,
              row.created_at,
              row.youtube_video_id || '',
              row.error ? `"${row.error.replace(/"/g, '""')}"` : ''
            ].join(','))
          ]

          return new NextResponse(csvRows.join('\n'), {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="video_ideas_export.csv"'
            }
          })
        } else {
          // Return JSON
          return new NextResponse(JSON.stringify(result.rows, null, 2), {
            headers: {
              'Content-Type': 'application/json',
              'Content-Disposition': 'attachment; filename="video_ideas_export.json"'
            }
          })
        }
      } else {
        // Get filtered video ideas (fallback to regular video-ideas endpoint behavior)
        const statusFilter = searchParams.get('statusFilter')?.split(',')
        const hasYouTubeVideo = searchParams.get('hasYouTubeVideo')
        const hasError = searchParams.get('hasError')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        let query = 'SELECT * FROM video_ideas WHERE user_id = $1'
        const params = [userId]
        let paramIndex = 2

        if (statusFilter && statusFilter.length > 0) {
          query += ` AND status = ANY($${paramIndex})`
          params.push(statusFilter)
          paramIndex++
        }

        if (hasYouTubeVideo === 'true') {
          query += ` AND youtube_video_id IS NOT NULL`
        } else if (hasYouTubeVideo === 'false') {
          query += ` AND youtube_video_id IS NULL`
        }

        if (hasError === 'true') {
          query += ` AND error IS NOT NULL`
        } else if (hasError === 'false') {
          query += ` AND error IS NULL`
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
        params.push(limit, offset)

        const result = await client.query(query, params)

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM video_ideas WHERE user_id = $1'
        const countParams = [userId]
        let countParamIndex = 2

        if (statusFilter && statusFilter.length > 0) {
          countQuery += ` AND status = ANY($${countParamIndex})`
          countParams.push(statusFilter)
          countParamIndex++
        }

        if (hasYouTubeVideo === 'true') {
          countQuery += ` AND youtube_video_id IS NOT NULL`
        } else if (hasYouTubeVideo === 'false') {
          countQuery += ` AND youtube_video_id IS NULL`
        }

        if (hasError === 'true') {
          countQuery += ` AND error IS NOT NULL`
        } else if (hasError === 'false') {
          countQuery += ` AND error IS NULL`
        }

        const countResult = await client.query(countQuery, countParams)
        const total = parseInt(countResult.rows[0].count)

        return NextResponse.json({
          success: true,
          ideas: result.rows,
          total,
          hasMore: offset + limit < total
        })
      }

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Bulk operation GET error:', error)
    
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}