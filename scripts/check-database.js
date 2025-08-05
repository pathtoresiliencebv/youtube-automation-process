require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Check existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)

    console.log('📋 Existing tables:')
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })

    // Check users table structure if it exists
    const userTableExists = tables.rows.some(row => row.table_name === 'users')
    if (userTableExists) {
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `)

      console.log('\n👤 Users table structure:')
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })

      // Check existing users
      const users = await client.query('SELECT * FROM users LIMIT 5')
      console.log(`\n📊 Users in database: ${users.rows.length}`)
      users.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email || 'N/A'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

checkDatabase()