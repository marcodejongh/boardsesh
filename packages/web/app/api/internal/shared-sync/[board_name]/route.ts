// app/api/cron/sync-shared-data/route.ts
import { NextResponse } from 'next/server';
import { syncSharedData as syncSharedDataFunction } from '@/lib/data-sync/aurora/shared-sync';
import { BoardName as AuroraBoardName } from '@/app/lib/api-wrappers/aurora-rest-client/types';

const VALID_BOARD_NAMES: AuroraBoardName[] = ['kilter', 'tension'];

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// This is a simple way to secure the endpoint, should be replaced with a better solution
const CRON_SECRET = process.env.CRON_SECRET;

type SharedSyncRouteParams = {
  board_name: string;
};

const internalSyncSharedData = async (
  board_name: AuroraBoardName,
  token: string,
  previousResults: { results: Record<string, { synced: number; complete: boolean }>; complete: boolean } = {
    results: {},
    complete: false,
  },
  recursionCount = 0,
) => {
  console.log(`Recursion count: ${recursionCount}`);
  if (recursionCount >= 100) {
    console.warn('Maximum recursion depth reached for shared sync');
    return { _complete: true, _maxRecursionReached: true, ...previousResults };
  }

  const currentResult = await syncSharedDataFunction(board_name, token);

  // If this is the first run, just return the current result

  // Deep merge the results, adding up synced counts
  const mergedResults: { results: Record<string, { synced: number; complete: boolean }>; complete: boolean } = {
    results: {},
    complete: false,
  };
  const categories = new Set([...Object.keys(previousResults.results), ...Object.keys(currentResult.results)]);

  for (const category of categories) {
    if (category === 'complete') {
      mergedResults.complete = currentResult.complete;
      continue;
    }

    const prev = previousResults.results[category] || { synced: 0, complete: false };
    const curr = currentResult.results[category] || { synced: 0, complete: false };

    mergedResults.results[category] = {
      synced: prev.synced + curr.synced,
      complete: curr.complete,
    };
  }

  if (!currentResult.complete) {
    console.log(`Sync not complete, recursing. Current recursion count: ${recursionCount}`);
    return internalSyncSharedData(board_name, token, mergedResults, recursionCount + 1);
  }

  console.log(`Sync complete. Returning merged results.`, currentResult);
  return mergedResults;
};

export async function GET(request: Request, props: { params: Promise<SharedSyncRouteParams> }) {
  const params = await props.params;
  try {
    const { board_name: boardNameParam } = params;

    // Validate board_name is a valid AuroraBoardName
    if (!VALID_BOARD_NAMES.includes(boardNameParam as AuroraBoardName)) {
      return NextResponse.json({ error: `Invalid board name: ${boardNameParam}` }, { status: 400 });
    }
    const board_name = boardNameParam as AuroraBoardName;

    console.log(`Starting shared sync for ${board_name}`);

    // Basic auth check
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL_ENV !== 'development' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const AURORA_TOKENS: Record<string, string | undefined> = {
      kilter: process.env.KILTER_SYNC_TOKEN,
      tension: process.env.TENSION_SYNC_TOKEN,
    };
    // Get the token for this board
    const token = AURORA_TOKENS && AURORA_TOKENS[board_name];
    if (!token) {
      console.error(
        `No sync token configured for ${board_name}. Set ${board_name.toUpperCase()}_SYNC_TOKEN env variable.`,
      );
      return NextResponse.json({ error: `No sync token configured for ${board_name}` }, { status: 500 });
    }

    const result = await internalSyncSharedData(board_name, token);

    return NextResponse.json({
      success: true,
      results: result,
      complete: result.complete,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
