import { NextResponse } from 'next/server';
import { getSetsBySlug, SetRow } from '@/app/lib/slug-utils';
import { BoardName, LayoutId, Size } from '@/app/lib/types';

export async function GET(
  req: Request,
  props: { params: Promise<{ board_name: BoardName; layout_id: LayoutId; size_id: Size; slug: string }> },
): Promise<NextResponse<SetRow[] | { error: string }>> {
  const params = await props.params;
  const { board_name, layout_id, size_id, slug } = params;

  try {
    const sets = await getSetsBySlug(board_name, Number(layout_id), Number(size_id), slug);

    if (sets.length === 0) {
      return NextResponse.json(
        { error: `Sets not found for slug: ${slug}` },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, s-maxage=31536000, immutable', // Even 404s can be cached - sets don't change
          },
        },
      );
    }

    return NextResponse.json(sets, {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, immutable', // Cache for 1 year, immutable
      },
    });
  } catch (error) {
    console.error('Error fetching sets by slug:', error);
    return NextResponse.json({ error: 'Failed to fetch sets' }, { status: 500 });
  }
}
