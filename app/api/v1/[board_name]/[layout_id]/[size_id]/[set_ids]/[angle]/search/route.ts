import { searchClimbs } from '@/app/lib/db/queries/climbs/search-climbs';
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

    // Call the separate function to perform the search
    const result = await searchClimbs(parsedParams, searchParams, userId);

    // Return response
    return NextResponse.json({
      totalCount: result.totalCount,
      climbs: result.climbs,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
