import { getHoldHeatmapData, HoldHeatmapData } from '@/app/lib/db/queries/climbs/holds-heatmap';
import { getSession } from '@/app/lib/session';
import { BoardRouteParameters, ErrorResponse, ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { urlParamsToSearchParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { sortObjectKeys } from '@/app/lib/cache-utils';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Cache duration for heatmap queries (in seconds)
 * Anonymous heatmap queries are cached for 30 days since aggregate data doesn't change meaningfully
 */
const CACHE_DURATION_HEATMAP = 30 * 24 * 60 * 60; // 30 days

/**
 * Cached version of getHoldHeatmapData
 * Only used for anonymous requests - user-specific data is not cached
 */
async function cachedGetHoldHeatmapData(
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<HoldHeatmapData[]> {
  // Build explicit cache key with board identifiers as separate segments
  // This ensures cache hits/misses are correctly differentiated by board configuration
  const cacheKey = [
    'heatmap',
    params.board_name,
    String(params.layout_id),
    String(params.size_id),
    params.set_ids.join(','),
    String(params.angle),
    // Include filter params as a sorted JSON string
    JSON.stringify(sortObjectKeys({
      gradeAccuracy: searchParams.gradeAccuracy,
      minGrade: searchParams.minGrade,
      maxGrade: searchParams.maxGrade,
      minAscents: searchParams.minAscents,
      minRating: searchParams.minRating,
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
      name: searchParams.name,
      settername: searchParams.settername,
      onlyClassics: searchParams.onlyClassics,
      onlyTallClimbs: searchParams.onlyTallClimbs,
      holdsFilter: searchParams.holdsFilter,
    })),
  ];

  const cachedFn = unstable_cache(
    async () => getHoldHeatmapData(params, searchParams, undefined),
    cacheKey,
    {
      revalidate: CACHE_DURATION_HEATMAP,
      tags: ['heatmap'],
    }
  );

  return cachedFn();
}

export interface HoldHeatmapResponse {
  holdStats: Array<{
    holdId: number;
    totalUses: number;
    startingUses: number;
    totalAscents: number;
    handUses: number;
    footUses: number;
    finishUses: number;
    averageDifficulty: number | null;
    userAscents?: number; // Added for user-specific ascent data
    userAttempts?: number; // Added for user-specific attempt data
  }>;
}

export async function GET(
  req: Request,
  props: { params: Promise<BoardRouteParameters> },
): Promise<NextResponse<HoldHeatmapResponse | ErrorResponse>> {
  const params = await props.params;
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);

    // MoonBoard doesn't have database tables for heatmap - return empty results
    if (parsedParams.board_name === 'moonboard') {
      return NextResponse.json({
        holdStats: [],
      });
    }

    const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

    // Extract user authentication - try headers first, then fall back to session
    let userId: number | undefined;
    
    // Check for header-based authentication first (for consistency with search API)
    const personalProgressFiltersEnabled = 
      searchParams.hideAttempted || 
      searchParams.hideCompleted || 
      searchParams.showOnlyAttempted || 
      searchParams.showOnlyCompleted;
    
    if (personalProgressFiltersEnabled) {
      const userIdHeader = req.headers.get('x-user-id');
      const tokenHeader = req.headers.get('x-auth-token');
      
      // Only use userId if both user ID and token are provided (basic auth check)
      if (userIdHeader && tokenHeader && userIdHeader !== 'null') {
        userId = parseInt(userIdHeader, 10);
      }
    }
    
    // Fall back to session-based authentication if no header auth
    if (!userId) {
      const cookieStore = await cookies();
      const session = await getSession(cookieStore, parsedParams.board_name);
      userId = session.userId;
    }

    // Get the heatmap data - use cached version for anonymous requests only
    // User-specific data is not cached to ensure fresh personal progress data
    const holdStats = userId
      ? await getHoldHeatmapData(parsedParams, searchParams, userId)
      : await cachedGetHoldHeatmapData(parsedParams, searchParams);

    // Return response
    return NextResponse.json({
      holdStats,
    });
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return NextResponse.json({ error: 'Failed to generate hold heatmap data' }, { status: 500 });
  }
}
