import { NextRequest, NextResponse } from 'next/server';

// Cache for oEmbed responses (in-memory, resets on server restart)
const thumbnailCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instagramUrl = searchParams.get('url');

  if (!instagramUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Check cache first
  const cached = thumbnailCache.get(instagramUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ thumbnail_url: cached.url });
  }

  try {
    // Use Instagram's oEmbed API
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(instagramUrl)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Boardsesh/1.0)',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from Instagram oEmbed API' },
        { status: response.status },
      );
    }

    const data = await response.json();

    if (data.thumbnail_url) {
      // Cache the result
      thumbnailCache.set(instagramUrl, {
        url: data.thumbnail_url,
        timestamp: Date.now(),
      });

      return NextResponse.json({ thumbnail_url: data.thumbnail_url });
    }

    return NextResponse.json({ error: 'No thumbnail found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching Instagram oEmbed:', error);
    return NextResponse.json({ error: 'Failed to fetch thumbnail' }, { status: 500 });
  }
}
