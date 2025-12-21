import { getSetterStats, SetterStat } from '@/app/lib/db/queries/climbs/setter-stats';
import { BoardRouteParameters, ErrorResponse } from '@/app/lib/types';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  props: { params: Promise<BoardRouteParameters> },
): Promise<NextResponse<SetterStat[] | ErrorResponse>> {
  const params = await props.params;

  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);

    // Extract search query parameter
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || undefined;

    const setterStats = await getSetterStats(parsedParams, searchQuery);

    return NextResponse.json(setterStats);
  } catch (error) {
    console.error('Error fetching setter stats:', error);
    return NextResponse.json({ error: 'Failed to fetch setter stats' }, { status: 500 });
  }
}
