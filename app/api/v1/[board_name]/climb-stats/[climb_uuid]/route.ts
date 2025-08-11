import { getClimbStatsForAllAngles, ClimbStatsForAngle } from '@/app/lib/data/queries';
import { ErrorResponse, BoardName } from '@/app/lib/types';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  props: { params: Promise<{ board_name: BoardName; climb_uuid: string }> },
): Promise<NextResponse<ClimbStatsForAngle[] | ErrorResponse>> {
  const params = await props.params;
  try {
    // Create a minimal parsed params object with just what we need
    const parsedParams = {
      board_name: params.board_name as BoardName,
      climb_uuid: params.climb_uuid,
      // These aren't needed for the climb stats query, but required by the interface
      layout_id: 0,
      size_id: 0,
      set_ids: [] as number[],
      angle: 0,
    };

    const climbStats = await getClimbStatsForAllAngles(parsedParams);

    return NextResponse.json(climbStats);
  } catch (error) {
    console.error('Error fetching climb stats:', error);
    return NextResponse.json({ error: 'Failed to fetch climb stats' }, { status: 500 });
  }
}