// app/api/cron/sync-shared-data/route.ts
import { NextResponse } from 'next/server';
import { syncSharedData } from '@/lib/data-sync/aurora/shared-sync';
import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// This is a simple way to secure the endpoint, should be replaced with a better solution
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request, props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;
  try {
    const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);
    console.log(`Starting shared sync for ${board_name}`);
    // Basic auth check
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL_ENV !== 'development' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Passed auth for ${board_name}`);

    // Get the token for this board
    const token = AURORA_TOKENS && AURORA_TOKENS[board_name];
    if (!token) {
      console.error(`No sync token configured for ${board_name}. Set ${board_name.toUpperCase()}_SYNC_TOKEN env variable.`);
      return NextResponse.json({ error: `No sync token configured for ${board_name}` }, { status: 500 });
    }

    // Process one batch
    const result = await syncSharedData(board_name, token, 1);
    
    // Check if sync is complete
    const isComplete = Object.values(result).every(r => r.complete);

    return NextResponse.json({
      success: true,
      results: result,
      complete: isComplete,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
