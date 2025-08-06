require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function checkConstraints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Check table structure
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'video_ideas' 
      ORDER BY ordinal_position;
    `)

    console.log('Table structure:')
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} (default: ${row.column_default}, nullable: ${row.is_nullable})`)
    })

    // Check constraints
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type, constraint_def
      FROM information_schema.check_constraints cc
      JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
      WHERE ccu.table_name = 'video_ideas';
    `)

    console.log('\nConstraints:')
    constraints.rows.forEach(row => {
      console.log(`${row.constraint_name}: ${row.constraint_def}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

checkConstraints()