import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create database connection
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    })

    await client.connect()

    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 })
      }

      // Create new user (storing password as plaintext for simplicity - not recommended for production)
      const result = await client.query(
        `INSERT INTO users (email, full_name, preferences, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW()) 
         RETURNING id, email, full_name, created_at`,
        [email, name, JSON.stringify({ password })]
      )

      const user = result.rows[0]

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          createdAt: user.created_at
        }
      })

    } finally {
      await client.end()
    }

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}