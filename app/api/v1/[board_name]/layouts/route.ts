import { getLayouts } from '@/app/lib/data/queries';
import { BoardName, BoardOnlyRouteParameters } from '@/app/lib/types';
import { NextResponse } from 'next/server';

// Correct typing for the parameters
export async function GET(req: Request, props: { params: Promise<BoardOnlyRouteParameters> }) {
  const params = await props.params;
  const { board_name } = params;

  try {
    const layouts = await getLayouts(board_name as BoardName);

    return NextResponse.json(layouts);
  } catch (error) {
    console.error('Error fetching layouts:', error); // Log the error for debugging
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}
