require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function createTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Create video_ideas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_ideas (
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
    console.log('✅ video_ideas table created')

    // Create youtube_analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS youtube_analytics (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        video_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        views BIGINT DEFAULT 0,
        watch_time BIGINT DEFAULT 0,
        ctr DECIMAL(5,2) DEFAULT 0.00,
        subscribers INTEGER DEFAULT 0,
        performance_score INTEGER DEFAULT 0,
        published_at TIMESTAMP,
        analyzed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ youtube_analytics table created')

    // Create system_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ system_logs table created')

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        event VARCHAR(255) NOT NULL,
        data JSONB,
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ notifications table created')

    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_video_ideas_user_id ON video_ideas(user_id);
      CREATE INDEX IF NOT EXISTS idx_video_ideas_status ON video_ideas(status);
      CREATE INDEX IF NOT EXISTS idx_video_ideas_created_at ON video_ideas(created_at);
      CREATE INDEX IF NOT EXISTS idx_youtube_analytics_user_id ON youtube_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `)
    console.log('✅ Database indexes created')

    console.log('🎉 All tables created successfully!')

  } catch (error) {
    console.error('❌ Error creating tables:', error)
  } finally {
    await client.end()
  }
}

createTables()