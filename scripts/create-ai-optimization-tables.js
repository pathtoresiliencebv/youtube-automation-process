const { Client } = require('pg')

async function createAIOptimizationTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Create ai_content_analysis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_content_analysis (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        analysis_type VARCHAR(100) NOT NULL,
        confidence VARCHAR(50) DEFAULT 'medium',
        data_points INTEGER DEFAULT 0,
        results JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create ai_optimizations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_optimizations (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(100) NOT NULL,
        base_content TEXT,
        improvements JSONB,
        predicted_performance JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Add indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_analysis_user_id ON ai_content_analysis(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_analysis_created ON ai_content_analysis(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_optimizations_user_id ON ai_optimizations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_optimizations_created ON ai_optimizations(created_at);
    `)

    console.log('✅ AI optimization tables created successfully')

  } catch (error) {
    console.error('❌ Error creating AI optimization tables:', error)
  } finally {
    await client.end()
  }
}

createAIOptimizationTables()