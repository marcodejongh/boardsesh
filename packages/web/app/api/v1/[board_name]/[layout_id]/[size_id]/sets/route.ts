import { getSets } from '@/app/lib/data/queries';
import { BoardName } from '@/app/lib/types';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  props: { params: Promise<{ board_name: string; layout_id: string; size_id: string }> },
) {
  const params = await props.params;
  const { board_name, layout_id, size_id } = params;

  try {
    const sets = await getSets(board_name as BoardName, Number(layout_id), Number(size_id));

    return NextResponse.json(sets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch sets' }, { status: 500 });
  }
}
