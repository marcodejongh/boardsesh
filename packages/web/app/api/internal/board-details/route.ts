import { NextRequest, NextResponse } from 'next/server';
import { getBoardDetails } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const board_name = searchParams.get('board_name');
    const layout_id = parseInt(searchParams.get('layout_id') || '');
    const size_id = parseInt(searchParams.get('size_id') || '');
    const set_ids_param = searchParams.get('set_ids');

    if (!board_name || isNaN(layout_id) || isNaN(size_id) || !set_ids_param) {
      return NextResponse.json(
        { error: 'Missing required parameters: board_name, layout_id, size_id, set_ids' },
        { status: 400 },
      );
    }

    const set_ids = set_ids_param.split(',').map((id) => parseInt(id.trim()));

    if (set_ids.some((id) => isNaN(id))) {
      return NextResponse.json({ error: 'Invalid set_ids format' }, { status: 400 });
    }

    const details = await getBoardDetails({
      board_name: board_name as BoardName,
      layout_id,
      size_id,
      set_ids,
    });

    return NextResponse.json(details, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching board details:', error);
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
