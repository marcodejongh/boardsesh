import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { SearchBoulderProblemResult, searchBoulderProblems } from '@/app/lib/data/queries';
import { BoardRouteParameters, ErrorResponse, SearchRequestPagination } from '@/app/lib/types';
import { parseBoardRouteParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';

// Refactor: Keep BoardRouteParameters and SearchRequest fields in separate objects
export async function GET(
  req: Request,
  { params }: { params: BoardRouteParameters },
): Promise<NextResponse<SearchBoulderProblemResult | ErrorResponse>> {
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;
  const parsedParams = parseBoardRouteParams(params);

  const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

  try {
    // Call the separate function to perform the search
    const result = await searchBoulderProblems(parsedParams, searchParams);

    // Return response
    return NextResponse.json({
      totalCount: result.totalCount,
      boulderproblems: result.boulderproblems.map((boulderProblem) => ({
        ...boulderProblem,
        litUpHoldsMap: convertLitUpHoldsStringToMap(boulderProblem.frames, parsedParams.board_name),
      })),
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
