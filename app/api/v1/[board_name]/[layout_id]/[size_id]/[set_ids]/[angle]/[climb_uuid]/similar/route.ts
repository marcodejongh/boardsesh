import { getSimilarClimbs, SimilarClimbsResult } from '@/app/lib/db/queries/climbs/similar-climbs';
import { BoardRouteParametersWithUuid, ErrorResponse } from '@/app/lib/types';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  props: { params: Promise<BoardRouteParametersWithUuid> },
): Promise<NextResponse<SimilarClimbsResult | ErrorResponse>> {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);

    // Get similarity threshold from query params (default 0.9)
    const url = new URL(req.url);
    const threshold = parseFloat(url.searchParams.get('threshold') || '0.9');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const result = await getSimilarClimbs(parsedParams, threshold, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching similar climbs:', error);
    return NextResponse.json({ error: 'Failed to fetch similar climbs' }, { status: 500 });
  }
}
