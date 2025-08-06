import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      const result = await client.query('SELECT * FROM users LIMIT 10')
      return NextResponse.json(result.rows)
    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Debug users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}