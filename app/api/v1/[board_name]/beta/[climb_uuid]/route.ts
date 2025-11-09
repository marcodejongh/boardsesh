import { NextRequest, NextResponse } from 'next/server';
import { dbz } from '@/app/lib/db/db';
import { kilterBetaLinks, tensionBetaLinks } from '@/app/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { BoardName } from '@/app/lib/types';
import { extractUuidFromSlug } from '@/app/lib/url-utils';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ board_name: BoardName; climb_uuid: string }> },
) {
  const { board_name, climb_uuid: rawClimbUuid } = await params;
  const climb_uuid = extractUuidFromSlug(rawClimbUuid);

  // Check if we should include pending videos (for admin/moderation)
  const { searchParams } = new URL(request.url);
  const includePending = searchParams.get('include_pending') === 'true';

  try {
    let betaLinks;

    if (board_name === 'kilter') {
      betaLinks = includePending
        ? await dbz.select().from(kilterBetaLinks).where(eq(kilterBetaLinks.climbUuid, climb_uuid))
        : await dbz
            .select()
            .from(kilterBetaLinks)
            .where(and(eq(kilterBetaLinks.climbUuid, climb_uuid), eq(kilterBetaLinks.isListed, true)));
    } else if (board_name === 'tension') {
      betaLinks = includePending
        ? await dbz.select().from(tensionBetaLinks).where(eq(tensionBetaLinks.climbUuid, climb_uuid))
        : await dbz
            .select()
            .from(tensionBetaLinks)
            .where(and(eq(tensionBetaLinks.climbUuid, climb_uuid), eq(tensionBetaLinks.isListed, true)));
    } else {
      return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
    }

    // Transform the database results to match the BetaLink interface
    const transformedLinks = betaLinks.map((link) => ({
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

// Validation schema for POST requests
const BetaLinkSchema = z.object({
  link: z.string().url().refine((url) => {
    // Validate that it's an Instagram URL
    return /(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([\w-]+)/.test(url);
  }, 'Must be a valid Instagram post URL'),
  foreign_username: z.string().optional(),
  angle: z.number().int().min(-70).max(70).optional(),
  thumbnail: z.string().url().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ board_name: BoardName; climb_uuid: string }> },
) {
  const { board_name, climb_uuid: rawClimbUuid } = await params;
  const climb_uuid = extractUuidFromSlug(rawClimbUuid);

  try {
    const body = await request.json();
    const validatedData = BetaLinkSchema.parse(body);

    // Choose the correct table based on board name
    const betaTable = board_name === 'kilter' ? kilterBetaLinks : tensionBetaLinks;

    if (board_name !== 'kilter' && board_name !== 'tension') {
      return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
    }

    // Check if this link already exists for this climb
    const existing = await dbz
      .select()
      .from(betaTable)
      .where(and(eq(betaTable.climbUuid, climb_uuid), eq(betaTable.link, validatedData.link)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'This video has already been submitted for this climb' }, { status: 409 });
    }

    // Insert the new beta link
    const newBetaLink = {
      climbUuid: climb_uuid,
      link: validatedData.link,
      foreignUsername: validatedData.foreign_username || null,
      angle: validatedData.angle || null,
      thumbnail: validatedData.thumbnail || null,
      isListed: false, // Require moderation by default
      createdAt: new Date().toISOString(),
    };

    await dbz.insert(betaTable).values(newBetaLink);

    return NextResponse.json(
      {
        message: 'Beta video submitted successfully and is pending moderation',
        data: {
          climb_uuid: newBetaLink.climbUuid,
          link: newBetaLink.link,
          foreign_username: newBetaLink.foreignUsername,
          angle: newBetaLink.angle,
          thumbnail: newBetaLink.thumbnail,
          is_listed: newBetaLink.isListed,
          created_at: newBetaLink.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    console.error('Error submitting beta link:', error);
    return NextResponse.json({ error: 'Failed to submit beta link' }, { status: 500 });
  }
}
