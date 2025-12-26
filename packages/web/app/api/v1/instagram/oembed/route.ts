import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instagramUrl = searchParams.get('url');

  if (!instagramUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Use Instagram's oEmbed API
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(instagramUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Boardsesh/1.0)',
      },
      next: { revalidate: 2592000 }, // Next.js fetch cache for 30 days
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from Instagram oEmbed API' },
        { status: response.status },
      );
    }

    const data = await response.json();

    if (data.thumbnail_url) {
      // Return with cache headers for browser/CDN caching (30 days)
      return NextResponse.json(
        { thumbnail_url: data.thumbnail_url },
        {
          headers: {
            'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800',
          },
        },
      );
    }

    return NextResponse.json({ error: 'No thumbnail found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching Instagram oEmbed:', error);
    return NextResponse.json({ error: 'Failed to fetch thumbnail' }, { status: 500 });
  }
}
