import { NextResponse } from 'next/server';
import { getSizeBySlug, SizeRow } from '@/app/lib/slug-utils';
import { BoardName, LayoutId } from '@/app/lib/types';

export async function GET(
  req: Request,
  props: { params: Promise<{ board_name: string; layout_id: string; slug: string }> },
): Promise<NextResponse<SizeRow | { error: string }>> {
  const params = await props.params;
  const { board_name, layout_id, slug } = params;

  try {
    const size = await getSizeBySlug(board_name as BoardName, Number(layout_id) as LayoutId, slug);

    if (!size) {
      return NextResponse.json(
        { error: `Size not found for slug: ${slug}` },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, s-maxage=31536000, immutable', // Even 404s can be cached - sizes don't change
          },
        },
      );
    }

    return NextResponse.json(size, {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, immutable', // Cache for 1 year, immutable
      },
    });
  } catch (error) {
    console.error('Error fetching size by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch size' }, { status: 500 });
  }
}
