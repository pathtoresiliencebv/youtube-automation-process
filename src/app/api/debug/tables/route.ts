import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const table = searchParams.get('table') || 'youtube_analytics'

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Get table structure
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table])

      return NextResponse.json({ 
        table,
        columns: result.rows 
      })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Debug tables error:', error)
    return NextResponse.json(
      { error: 'Failed to get table info', details: error.message },
      { status: 500 }
    )
  }
}