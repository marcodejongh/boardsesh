import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { SearchClimbsResult, searchClimbs } from '@/app/lib/data/queries';
import { BoardRouteParameters, ErrorResponse, SearchRequestPagination } from '@/app/lib/types';
import { parseBoardRouteParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';

// Refactor: Keep BoardRouteParameters and SearchRequest fields in separate objects
export async function GET(
  req: Request,
  { params }: { params: BoardRouteParameters },
): Promise<NextResponse<SearchClimbsResult | ErrorResponse>> {
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;
  const parsedParams = await parseBoardRouteParams(params);

  const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

  try {
    // Call the separate function to perform the search
    const result = await searchClimbs(parsedParams, searchParams);

    // Return response
    return NextResponse.json({
      totalCount: result.totalCount,
      climbs: result.climbs.map((climb) => ({
        ...climb,
        litUpHoldsMap: convertLitUpHoldsStringToMap(climb.frames, parsedParams.board_name),
      })),
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
