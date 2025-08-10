import { getClimbStatsForAllAngles, ClimbStatsForAngle } from '@/app/lib/data/queries';
import { BoardRouteParametersWithUuid, ErrorResponse } from '@/app/lib/types';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  props: { params: Promise<BoardRouteParametersWithUuid> },
): Promise<NextResponse<ClimbStatsForAngle[] | ErrorResponse>> {
  const params = await props.params;
  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const climbStats = await getClimbStatsForAllAngles(parsedParams);

    return NextResponse.json(climbStats);
  } catch (error) {
    console.error('Error fetching climb stats:', error);
    return NextResponse.json({ error: 'Failed to fetch climb stats' }, { status: 500 });
  }
}