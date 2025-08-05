#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ThNue72ifvPW@ep-billowing-meadow-aeydp78q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function seedDatabase() {
  try {
    await client.connect();
    console.log('🔗 Connected to Neon PostgreSQL database');

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        youtube_channel_id TEXT UNIQUE,
        youtube_channel_title TEXT,
        youtube_access_token TEXT,
        youtube_refresh_token TEXT,
        preferences JSONB DEFAULT '{}',
        subscription_tier TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS youtube_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        youtube_video_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        published_at TIMESTAMP WITH TIME ZONE,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        duration_seconds INTEGER,
        thumbnail_url TEXT,
        tags TEXT[],
        performance_score DECIMAL(5,2),
        analytics_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_ideas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used')),
        ai_generated BOOLEAN DEFAULT true,
        performance_prediction DECIMAL(5,2),
        keywords TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        event_type TEXT NOT NULL,
        event_data JSONB DEFAULT '{}',
        severity TEXT DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
        source TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables created successfully');

    // Seed sample data
    const demoUser = await client.query(`
      INSERT INTO users (email, full_name, youtube_channel_title, subscription_tier)
      VALUES ('demo@youtube-automation.com', 'Demo User', 'Motivational Content Channel', 'pro')
      ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        youtube_channel_title = EXCLUDED.youtube_channel_title
      RETURNING id;
    `);

    const userId = demoUser.rows[0].id;
    console.log('👤 Demo user created with ID:', userId);

    // Sample video data
    await client.query(`
      INSERT INTO youtube_videos (user_id, youtube_video_id, title, view_count, like_count, comment_count, performance_score, published_at)
      VALUES 
        ($1, 'dQw4w9WgXcQ', '🔥 Motivatie voor Elke Dag - Transform Je Leven!', 125000, 3400, 280, 87.5, NOW() - INTERVAL '5 days'),
        ($1, 'oHg5SJYRHA0', '💪 5 Gewoontes van Succesvolle Mensen', 89000, 2100, 150, 82.3, NOW() - INTERVAL '10 days'),
        ($1, 'ScMzIvxBSi4', '🚀 Van Falen naar Succes: Mijn Verhaal', 156000, 4200, 320, 91.2, NOW() - INTERVAL '15 days'),
        ($1, 'astISOttCQ0', '⚡ Morning Routine die Alles Verandert', 78000, 1800, 95, 76.8, NOW() - INTERVAL '20 days'),
        ($1, 'SQoA_wjmE9w', '🧠 Mindset Shift: Think Like a Winner', 203000, 5600, 450, 94.7, NOW() - INTERVAL '25 days')
      ON CONFLICT (youtube_video_id) DO NOTHING;
    `, [userId]);

    // Sample video ideas
    await client.query(`
      INSERT INTO video_ideas (user_id, title, description, status, performance_prediction, keywords)
      VALUES 
        ($1, '🌟 De Kracht van Positief Denken', 'Uitleg over hoe positieve gedachten je leven kunnen transformeren', 'approved', 88.5, ARRAY['motivatie', 'positief denken', 'mindset']),
        ($1, '💼 Entrepreneurship Tips voor Beginners', 'Praktische tips voor startende ondernemers', 'pending', 85.2, ARRAY['business', 'ondernemen', 'tips']),
        ($1, '🏃‍♂️ Discipline vs Motivatie: Wat Werkt?', 'Het verschil tussen discipline en motivatie uitgelegd', 'approved', 90.1, ARRAY['discipline', 'motivatie', 'gewoontes']),
        ($1, '📚 Boeken die Mijn Leven Veranderden', 'Top 5 boeken voor persoonlijke ontwikkeling', 'pending', 83.7, ARRAY['boeken', 'lezen', 'ontwikkeling'])
      ON CONFLICT DO NOTHING;
    `, [userId]);

    // System logs
    await client.query(`
      INSERT INTO system_logs (user_id, event_type, event_data, severity, source)
      VALUES 
        ($1, 'user_registered', '{"channel": "Motivational Content Channel"}', 'info', 'auth_system'),
        ($1, 'video_analysis_completed', '{"videos_analyzed": 5, "avg_performance": 86.5}', 'info', 'youtube_analyzer'),
        ($1, 'content_generated', '{"type": "video_ideas", "count": 4}', 'info', 'ai_generator'),
        (NULL, 'system_startup', '{"version": "1.0.0", "environment": "production"}', 'info', 'system')
    `, [userId]);

    console.log('🌱 Sample data seeded successfully');
    console.log('📊 Database ready with:');
    console.log('   • 1 Demo user');
    console.log('   • 5 Sample YouTube videos with analytics');
    console.log('   • 4 AI-generated video ideas');
    console.log('   • System activity logs');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await client.end();
    console.log('🔒 Database connection closed');
  }
}

// Run seeding
seedDatabase();