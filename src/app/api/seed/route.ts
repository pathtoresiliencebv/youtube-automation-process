import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Convex seeding disabled - using Neon PostgreSQL now');
    
    return NextResponse.json({
      success: true,
      message: 'Seeding disabled - system now uses Neon PostgreSQL instead of Convex',
      note: 'Use the specific table seeding endpoints: /api/seed-ai-tables, /api/seed-calendar-table, etc.'
    });

  } catch (error) {
    console.error('❌ Seed endpoint error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Seed endpoint disabled',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database Seeding Endpoints',
    usage: 'System now uses Neon PostgreSQL. Use specific table seeding endpoints instead.',
    endpoints: {
      'AI Tables': 'POST /api/seed-ai-tables',
      'Calendar Table': 'POST /api/seed-calendar-table', 
      'Notification Settings': 'POST /api/seed-notification-settings-table'
    },
    status: 'migrated-to-neon'
  });
}