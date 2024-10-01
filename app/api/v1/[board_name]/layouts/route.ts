import { getLayouts } from '@/app/lib/data/queries';
import { BoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';

// Correct typing for the parameters
export async function GET(req: Request, { params }: { params: BoardRouteParameters }) {
  const { board_name } = parseBoardRouteParams(params);

  try {
    const layouts = await getLayouts(board_name);

    return NextResponse.json(layouts);
  } catch (error) {
    console.error('Error fetching layouts:', error); // Log the error for debugging
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}
