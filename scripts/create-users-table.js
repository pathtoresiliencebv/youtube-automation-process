require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function createUsersTable() {
  console.log('Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing')
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        youtube_channel_id VARCHAR(255),
        youtube_channel_title VARCHAR(255),
        youtube_refresh_token TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    console.log('✅ Users table created successfully')

    // Check if user already exists, if not create it
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['pathtoresiliencebv@gmail.com'])
    
    if (existingUser.rows.length === 0) {
      await client.query(
        'INSERT INTO users (email, name, password) VALUES ($1, $2, $3)',
        ['pathtoresiliencebv@gmail.com', 'Path to Resilience', '6fz9itxv1']
      )
      console.log('✅ Default user created: pathtoresiliencebv@gmail.com')
    } else {
      console.log('✅ Default user already exists')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

createUsersTable()