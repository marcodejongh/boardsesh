import { getUserLogbook } from '@/app/lib/api-wrappers/aurora/getUserLogbook';
import { BoardRouteParameters, ParsedBoardRouteParameters } from '@/app/lib/types';
import { parseBoardRouteParams } from '@/app/lib/url-utils';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: BoardRouteParameters }) {
  const { board_name }: ParsedBoardRouteParameters = parseBoardRouteParams(params);

  if (!board_name) {
    console.error('Board name is required');
    return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
  }

  try {
    const { userId } = await request.json();
    if (!userId) {
      console.error('User ID is required');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const logbook = await getUserLogbook(userId, board_name);
    return NextResponse.json(logbook);
  } catch (error) {
    console.error('Error fetching logbook:', error);
    return NextResponse.json({ error: 'Failed to fetch logbook' }, { status: 500 });
  }
}
