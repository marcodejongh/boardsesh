import { NextResponse } from 'next/server';
import { getBoardSelectorOptions } from '@/app/lib/db/queries/climbs/product-sizes-data';

export const runtime = 'nodejs';

export async function GET() {
  // All data is now hardcoded, no database query needed
  const selectorOptions = getBoardSelectorOptions();

  return NextResponse.json(selectorOptions, {
    headers: {
      // Since data is hardcoded, we can cache it for a long time
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
