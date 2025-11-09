import { NextRequest, NextResponse } from 'next/server';
import { getSimilarClimbs } from '@/app/lib/db/queries/climbs/similar-climbs';
import { BoardName } from '@/app/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const board_name = searchParams.get('board_name');
    const layout_id = parseInt(searchParams.get('layout_id') || '');
    const size_id = parseInt(searchParams.get('size_id') || '');
    const set_ids_param = searchParams.get('set_ids');
    const angle = parseInt(searchParams.get('angle') || '40');
    const climb_uuid = searchParams.get('climb_uuid');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!board_name || isNaN(layout_id) || isNaN(size_id) || !set_ids_param || !climb_uuid) {
      return NextResponse.json(
        { error: 'Missing required parameters: board_name, layout_id, size_id, set_ids, climb_uuid' },
        { status: 400 },
      );
    }

    const set_ids = set_ids_param.split(',').map((id) => parseInt(id.trim()));

    if (set_ids.some((id) => isNaN(id))) {
      return NextResponse.json({ error: 'Invalid set_ids format' }, { status: 400 });
    }

    const climbs = await getSimilarClimbs(
      {
        board_name: board_name as BoardName,
        layout_id,
        size_id,
        set_ids,
        angle,
        climb_uuid,
      },
      limit,
    );

    return NextResponse.json(
      { climbs },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching similar climbs:', error);
    return NextResponse.json({ error: 'Failed to fetch similar climbs' }, { status: 500 });
  }
}
