import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const adminUserId = searchParams.get('adminUserId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!adminUserId) {
      return NextResponse.json({ error: 'Missing adminUserId parameter' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query(
        `SELECT * FROM system_logs 
         WHERE level = 'error' 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      )

      // Parse JSON metadata field
      const logs = result.rows.map(log => ({
        ...log,
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
      }))

      return NextResponse.json(logs)

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Admin error logs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    )
  }
}