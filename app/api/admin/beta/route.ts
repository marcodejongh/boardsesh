import { NextRequest, NextResponse } from 'next/server';
import { dbz } from '@/app/lib/db/db';
import { kilterBetaLinks, tensionBetaLinks } from '@/app/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Admin Beta Video Management API
 *
 * GET: List all beta videos (including pending ones)
 * PATCH: Approve/reject beta videos
 * DELETE: Remove beta videos
 *
 * TODO: Add authentication/authorization for admin users
 */

// Schema for PATCH requests
const ModerationSchema = z.object({
  board_name: z.enum(['kilter', 'tension']),
  climb_uuid: z.string(),
  link: z.string().url(),
  action: z.enum(['approve', 'reject']),
});

// GET: List all beta videos with optional filters
export async function GET(request: NextRequest) {
  // TODO: Add admin authentication check here
  // if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardName = searchParams.get('board_name') as 'kilter' | 'tension' | null;
  const status = searchParams.get('status'); // 'pending', 'approved', 'all'

  try {
    let kilterLinks: any[] = [];
    let tensionLinks: any[] = [];

    if (!boardName || boardName === 'kilter') {
      if (status === 'pending') {
        kilterLinks = await dbz.select().from(kilterBetaLinks).where(eq(kilterBetaLinks.isListed, false));
      } else if (status === 'approved') {
        kilterLinks = await dbz.select().from(kilterBetaLinks).where(eq(kilterBetaLinks.isListed, true));
      } else {
        kilterLinks = await dbz.select().from(kilterBetaLinks);
      }
    }

    if (!boardName || boardName === 'tension') {
      if (status === 'pending') {
        tensionLinks = await dbz.select().from(tensionBetaLinks).where(eq(tensionBetaLinks.isListed, false));
      } else if (status === 'approved') {
        tensionLinks = await dbz.select().from(tensionBetaLinks).where(eq(tensionBetaLinks.isListed, true));
      } else {
        tensionLinks = await dbz.select().from(tensionBetaLinks);
      }
    }

    const allLinks = [
      ...kilterLinks.map((link) => ({ ...link, board_name: 'kilter' })),
      ...tensionLinks.map((link) => ({ ...link, board_name: 'tension' })),
    ];

    // Transform to consistent format
    const transformed = allLinks.map((link) => ({
      board_name: link.board_name,
      climb_uuid: link.climbUuid,
      link: link.link,
      foreign_username: link.foreignUsername,
      angle: link.angle,
      thumbnail: link.thumbnail,
      is_listed: link.isListed,
      created_at: link.createdAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching beta links for moderation:', error);
    return NextResponse.json({ error: 'Failed to fetch beta links' }, { status: 500 });
  }
}

// PATCH: Approve or reject beta videos
export async function PATCH(request: NextRequest) {
  // TODO: Add admin authentication check here
  // if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { board_name, climb_uuid, link, action } = ModerationSchema.parse(body);

    const table = board_name === 'kilter' ? kilterBetaLinks : tensionBetaLinks;

    if (action === 'approve') {
      // Set isListed to true
      await dbz
        .update(table)
        .set({ isListed: true })
        .where(and(eq(table.climbUuid, climb_uuid), eq(table.link, link)));

      return NextResponse.json({
        success: true,
        message: 'Beta video approved',
      });
    } else if (action === 'reject') {
      // Delete the beta link
      await dbz
        .delete(table)
        .where(and(eq(table.climbUuid, climb_uuid), eq(table.link, link)));

      return NextResponse.json({
        success: true,
        message: 'Beta video rejected and removed',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    console.error('Error moderating beta video:', error);
    return NextResponse.json({ error: 'Failed to moderate beta video' }, { status: 500 });
  }
}

// DELETE: Remove a beta video
export async function DELETE(request: NextRequest) {
  // TODO: Add admin authentication check here
  // if (!isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const boardName = searchParams.get('board_name') as 'kilter' | 'tension' | null;
  const climbUuid = searchParams.get('climb_uuid');
  const link = searchParams.get('link');

  if (!boardName || !climbUuid || !link) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const table = boardName === 'kilter' ? kilterBetaLinks : tensionBetaLinks;

    await dbz
      .delete(table)
      .where(and(eq(table.climbUuid, climbUuid), eq(table.link, link)));

    return NextResponse.json({
      success: true,
      message: 'Beta video deleted',
    });
  } catch (error) {
    console.error('Error deleting beta video:', error);
    return NextResponse.json({ error: 'Failed to delete beta video' }, { status: 500 });
  }
}
