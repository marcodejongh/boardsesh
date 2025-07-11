import { getHoldHeatmapData } from '@/app/lib/db/queries/climbs/holds-heatmap';
import { getSession } from '@/app/lib/session';
import { BoardRouteParameters, ErrorResponse, SearchRequestPagination } from '@/app/lib/types';
import { urlParamsToSearchParams } from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    const searchParams: SearchRequestPagination = urlParamsToSearchParams(query);

    const cookieStore = await cookies();
    const session = await getSession(cookieStore, parsedParams.board_name);
    // Get the heatmap data using the query function
    const holdStats = await getHoldHeatmapData(parsedParams, searchParams, session.userId);

    // Return response
    return NextResponse.json({
      holdStats,
    });
  } catch (error) {
    console.error('Error generating heatmap data:', error);
    return NextResponse.json({ error: 'Failed to generate hold heatmap data' }, { status: 500 });
  }
}
