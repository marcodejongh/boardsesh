import { getBoardDetails } from '@/app/lib/data/queries';
import { BoardRouteParameters } from '@/app/lib/types';
import { NextResponse } from 'next/server';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';

export async function GET(req: Request, props: { params: Promise<BoardRouteParameters> }) {
  const params = await props.params;
  try {
    const parsedParams = await parseBoardRouteParamsWithSlugs(params);
    const boardDetails = await getBoardDetails(parsedParams);

    // Return the combined result
    return NextResponse.json(boardDetails);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch board details' }, { status: 500 });
  }
}
