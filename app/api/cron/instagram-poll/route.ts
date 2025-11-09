import { NextRequest, NextResponse } from 'next/server';
import { pollInstagramMentions } from '@/app/lib/services/instagram-poller';

/**
 * Instagram Polling Cron Endpoint
 *
 * This endpoint should be called periodically (e.g., every 15 minutes) to poll
 * Instagram for new mentions of @boardsesh.
 *
 * Setup with Vercel Cron:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/instagram-poll",
 *        "schedule": "*/15 * * * *"
 *      }]
 *    }
 *
 * 2. Protect with Authorization header:
 *    Set CRON_SECRET environment variable
 *
 * Manual testing:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://boardsesh.com/api/cron/instagram-poll
 */

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await pollInstagramMentions();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error('Instagram polling cron failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Also support POST for Vercel Cron
export async function POST(request: NextRequest) {
  return GET(request);
}
