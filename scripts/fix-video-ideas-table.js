require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function fixVideoIdeasTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Drop the existing table if it exists
    await client.query('DROP TABLE IF EXISTS video_ideas CASCADE')
    console.log('✅ Dropped existing video_ideas table')

    // Recreate with proper structure
    await client.query(`
      CREATE TABLE video_ideas (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending_approval',
        script TEXT,
        revid_job_id VARCHAR(255),
        video_url VARCHAR(500),
        youtube_video_id VARCHAR(100),
        scheduled_date TIMESTAMP,
        seo_title VARCHAR(500),
        seo_description TEXT,
        tags TEXT[],
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        last_retry_at TIMESTAMP,
        performance_score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created new video_ideas table with proper structure')

    // Add indexes
    await client.query('CREATE INDEX idx_video_ideas_user_id ON video_ideas(user_id)')
    await client.query('CREATE INDEX idx_video_ideas_status ON video_ideas(status)')
    console.log('✅ Added indexes')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.end()
  }
}

fixVideoIdeasTable()