// app/api/cron/sync-shared-data/route.ts
import { NextResponse } from 'next/server';
import { syncSharedData } from '@/lib/data-sync/aurora/shared-sync';

export const dynamic = 'force-dynamic';

// This is a simple way to secure the endpoint, should be replaced with a better solution
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Basic auth check
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL_ENV !== 'development' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync both board types
    const results = await Promise.all([
      syncSharedData('tension'), 
      syncSharedData('kilter')
    ]);

    return NextResponse.json({
      success: true,
      results: {
        tension: results[0],
        kilter: results[1],
      },
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
