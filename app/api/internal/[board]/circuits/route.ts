import { NextRequest, NextResponse } from 'next/server';
import { BoardName } from '@/app/lib/types';
import { getUserAndPublicCircuits, getCircuitsByUser } from '@/app/lib/db/queries/circuits/get-circuits';
import { getSession } from '@/app/lib/session';
import { cookies } from 'next/headers';

type Params = Promise<{
  board: BoardName;
}>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
): Promise<NextResponse> {
  const params = await segmentData.params;
  const { board } = params;

  try {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore, board);
    
    let userId: number | undefined;
    if (session) {
      userId = session.userId;
    }

    const searchParams = request.nextUrl.searchParams;
    const userOnly = searchParams.get('userOnly') === 'true';

    let circuits;
    if (userOnly && userId) {
      circuits = await getCircuitsByUser(board, userId);
    } else {
      circuits = await getUserAndPublicCircuits(board, userId);
    }

    return NextResponse.json({ circuits });
  } catch (error) {
    console.error('Error fetching circuits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circuits' },
      { status: 500 }
    );
  }
}