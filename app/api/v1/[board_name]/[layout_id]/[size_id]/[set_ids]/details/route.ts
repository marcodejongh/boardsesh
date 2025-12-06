import { getBoardDetails } from '@/app/lib/data/queries';
import { BoardDetailsRouteParameters } from '@/app/lib/types';
import { NextResponse } from 'next/server';
import { parseBoardDetailsRouteParams } from '@/app/lib/url-utils.server';

export async function GET(req: Request, props: { params: Promise<BoardDetailsRouteParameters> }) {
  const params = await props.params;
  try {
    const parsedParams = await parseBoardDetailsRouteParams(params);
    const boardDetails = await getBoardDetails(parsedParams);

    // Return the combined result
    return NextResponse.json(boardDetails);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
