require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function createTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['pathtoresiliencebv@gmail.com'])
    
    if (existingUser.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, full_name, preferences, created_at, updated_at) 
         VALUES ($1, $2, $3, NOW(), NOW())`,
        ['pathtoresiliencebv@gmail.com', 'Path to Resilience', JSON.stringify({ password: '6fz9itxv1' })]
      )
      console.log('✅ Test user created: pathtoresiliencebv@gmail.com')
    } else {
      // Update existing user with password
      await client.query(
        `UPDATE users SET full_name = $1, preferences = $2, updated_at = NOW() WHERE email = $3`,
        ['Path to Resilience', JSON.stringify({ password: '6fz9itxv1' }), 'pathtoresiliencebv@gmail.com']
      )
      console.log('✅ Test user updated: pathtoresiliencebv@gmail.com')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

createTestUser()