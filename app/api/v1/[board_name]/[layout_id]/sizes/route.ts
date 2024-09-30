import { getSizes } from '@/app/lib/data/queries';
import { BoardName, LayoutId } from '@/app/lib/types';
import { NextResponse } from 'next/server';

// Dynamic handler for fetching sizes related to a specific layout
export async function GET(req: Request, { params }: { params: { board_name: BoardName; layout_id: LayoutId } }) {
  const { board_name, layout_id } = params;

  try {
    // Fetch sizes based on layout_id
    const result = await getSizes(board_name, layout_id);

    // Return the sizes as JSON response
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching sizes:', error);
    return NextResponse.json({ error: 'Failed to fetch sizes' }, { status: 500 });
  }
}
