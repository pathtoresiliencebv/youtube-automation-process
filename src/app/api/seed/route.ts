import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  skipConvexDeploymentUrlCheck: true
});

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting Convex database seeding...');
    
    const result = await convex.mutation(api.seedData.seedDatabase, {});
    
    console.log('✅ Convex seeding completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Convex database seeded successfully!',
      data: result.data
    });

  } catch (error) {
    console.error('❌ Convex seeding failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to seed Convex database',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Convex Seeding Endpoint',
    usage: 'POST to this endpoint to seed the Convex database with sample data',
    status: 'ready'
  });
}