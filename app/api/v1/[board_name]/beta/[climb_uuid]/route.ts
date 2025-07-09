import { NextRequest, NextResponse } from 'next/server';
import { dbz } from '@/app/lib/db/db';
import { kilterBetaLinks, tensionBetaLinks } from '@/app/lib/db/schema';
import { eq } from 'drizzle-orm';
import { BoardName } from '@/app/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_name: BoardName; climb_uuid: string }> }
) {
  const { board_name, climb_uuid } = await params;

  try {
    let betaLinks;
    
    if (board_name === 'kilter') {
      betaLinks = await dbz
        .select()
        .from(kilterBetaLinks)
        .where(eq(kilterBetaLinks.climbUuid, climb_uuid));
    } else if (board_name === 'tension') {
      betaLinks = await dbz
        .select()
        .from(tensionBetaLinks)
        .where(eq(tensionBetaLinks.climbUuid, climb_uuid));
    } else {
      return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
    }

    // Transform the database results to match the BetaLink interface
    const transformedLinks = betaLinks.map(link => ({
      climb_uuid: link.climbUuid,
      link: link.link,
      foreign_username: link.foreignUsername,
      angle: link.angle,
      thumbnail: link.thumbnail,
      is_listed: link.isListed,
      created_at: link.createdAt,
    }));

    return NextResponse.json(transformedLinks);
  } catch (error) {
    console.error('Error fetching beta links:', error);
    return NextResponse.json({ error: 'Failed to fetch beta links' }, { status: 500 });
  }
}