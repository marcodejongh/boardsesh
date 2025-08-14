import { NextRequest, NextResponse } from 'next/server';
import { BoardName } from '@/app/lib/types';
import { getCircuitsForClimb } from '@/app/lib/db/queries/circuits/get-circuits';

type Params = Promise<{
  board: BoardName;
  uuid: string;
}>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
): Promise<NextResponse> {
  const params = await segmentData.params;
  const { board, uuid } = params;

  try {
    const circuits = await getCircuitsForClimb(board, uuid);
    
    return NextResponse.json({ circuits });
  } catch (error) {
    console.error('Error fetching climb circuits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch climb circuits' },
      { status: 500 }
    );
  }
}