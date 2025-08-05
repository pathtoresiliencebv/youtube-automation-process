#!/usr/bin/env node

const { Client } = require('pg');

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ThNue72ifvPW@ep-billowing-meadow-aeydp78q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function setupAdminUser() {
  try {
    await client.connect();
    console.log('🔗 Connected to Neon PostgreSQL database');

    // Add role column to users table if it doesn't exist
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    `);
    console.log('✅ Added role column to users table');

    // Create or update admin user
    const adminEmail = 'admin@contentcatalyst.com';
    const adminData = {
      email: adminEmail,
      full_name: 'System Administrator',
      role: 'admin',
      subscription_tier: 'enterprise',
      preferences: JSON.stringify({
        theme: 'dark',
        notifications: true,
        language: 'nl'
      })
    };

    // Check if admin user exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      // Update existing admin user
      await client.query(`
        UPDATE users 
        SET role = $1, 
            full_name = $2, 
            subscription_tier = $3,
            updated_at = NOW()
        WHERE email = $4
      `, [adminData.role, adminData.full_name, adminData.subscription_tier, adminEmail]);
      console.log('✅ Updated existing admin user');
    } else {
      // Create new admin user
      await client.query(`
        INSERT INTO users (email, full_name, role, subscription_tier, preferences)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        adminData.email,
        adminData.full_name,
        adminData.role,
        adminData.subscription_tier,
        adminData.preferences
      ]);
      console.log('✅ Created new admin user');
    }

    // Update any existing demo user to have admin role (for testing)
    await client.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email = 'demo@example.com'
    `);

    console.log('🎯 Admin setup completed successfully!');
    console.log(`📧 Admin email: ${adminEmail}`);
    console.log('🔐 Access admin dashboard at: /admin');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the setup
setupAdminUser().catch(console.error);