import { searchClimbs } from '@/app/lib/db/queries/climbs/search-climbs';
import { countClimbs } from '@/app/lib/db/queries/climbs/count-climbs';
import { getSizeEdges } from '@/app/lib/__generated__/product-sizes-data';
import { BoardRouteParameters, ErrorResponse, SearchClimbsResult, SearchRequestPagination } from '@/app/lib/types';
import { urlParamsToSearchParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { NextResponse } from 'next/server';

// Refactor: Keep BoardRouteParameters and SearchRequest fields in separate objects
export async function GET(
  req: Request,
  props: { params: Promise<BoardRouteParameters> },
): Promise<NextResponse<SearchClimbsResult | ErrorResponse>> {
  const params = await props.params;
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

    // Extract user authentication from headers for personal progress filters
    let userId: number | undefined;
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

    // Get hardcoded size edges (no database query needed)
    const sizeEdges = getSizeEdges(parsedParams.board_name, parsedParams.size_id);
    if (!sizeEdges) {
      return NextResponse.json({
        climbs: [],
        totalCount: 0,
        hasMore: false,
      });
    }

    // Run search and count queries in parallel for better performance
    const [searchResult, totalCount] = await Promise.all([
      searchClimbs(parsedParams, searchParams, userId),
      countClimbs(parsedParams, searchParams, sizeEdges, userId),
    ]);

    // Return response with hasMore for infinite scroll support
    return NextResponse.json({
      climbs: searchResult.climbs,
      totalCount,
      hasMore: searchResult.hasMore,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
