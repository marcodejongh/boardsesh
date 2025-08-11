import { NextRequest, NextResponse } from 'next/server';
import { BoardName } from '@/app/lib/types';
import { getClimbsByCircuit } from '@/app/lib/db/queries/circuits/get-circuits';

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
    const climbUuids = await getClimbsByCircuit(board, uuid);
    
    return NextResponse.json({ climbUuids });
  } catch (error) {
    console.error('Error fetching circuit climbs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch circuit climbs' },
      { status: 500 }
    );
  }
}