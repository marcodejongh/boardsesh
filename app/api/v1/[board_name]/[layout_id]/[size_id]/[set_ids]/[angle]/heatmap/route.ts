
import { getHoldHeatmapData } from '@/app/lib/db/queries/holds-heatmap';
import { BoardRouteParameters, ErrorResponse, SearchRequestPagination } from '@/app/lib/types';
import { parseBoardRouteParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';

export interface HoldHeatmapResponse {
  holdStats: Array<{
    holdId: number;
    totalUses: number;
    startingUses: number;
    handUses: number;
    footUses: number;
    finishUses: number;
    averageDifficulty: number | null;
  }>;
}

export async function GET(
  req: Request,
  { params }: { params: BoardRouteParameters },
): Promise<NextResponse<HoldHeatmapResponse | ErrorResponse>> {
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;
  const parsedParams = parseBoardRouteParams(params);
  const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

  try {
    // Get the heatmap data using the query function
    const holdStats = await getHoldHeatmapData(parsedParams, searchParams);

    // Return response
    return NextResponse.json({
      holdStats,
    });
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return NextResponse.json({ error: 'Failed to generate hold heatmap data' }, { status: 500 });
  }
}
