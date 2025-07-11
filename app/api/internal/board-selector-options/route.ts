import { NextResponse } from 'next/server';
import { getAllBoardSelectorOptions } from '@/app/lib/data/queries';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const selectorOptions = await getAllBoardSelectorOptions();
    
    return NextResponse.json(selectorOptions, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    });
  } catch (error) {
    console.error('Error fetching board selector options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board selector options' },
      { status: 500 }
    );
  }
}