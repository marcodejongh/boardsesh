import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db/db';
import * as schema from '@/app/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authOptions } from '@/app/lib/auth/auth-options';

/**
 * GET /api/internal/hold-classifications
 * Fetches all hold classifications for the current user and board configuration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const boardType = searchParams.get('boardType');
    const layoutId = searchParams.get('layoutId');
    const sizeId = searchParams.get('sizeId');

    if (!boardType || !layoutId || !sizeId) {
      return NextResponse.json(
        { error: 'Missing required parameters: boardType, layoutId, sizeId' },
        { status: 400 }
      );
    }

    const db = getDb();

    const classifications = await db
      .select()
      .from(schema.userHoldClassifications)
      .where(
        and(
          eq(schema.userHoldClassifications.userId, session.user.id),
          eq(schema.userHoldClassifications.boardType, boardType),
          eq(schema.userHoldClassifications.layoutId, parseInt(layoutId)),
          eq(schema.userHoldClassifications.sizeId, parseInt(sizeId))
        )
      );

    return NextResponse.json({
      classifications: classifications.map((c) => ({
        id: c.id.toString(),
        userId: c.userId,
        boardType: c.boardType,
        layoutId: c.layoutId,
        sizeId: c.sizeId,
        holdId: c.holdId,
        holdType: c.holdType,
        difficultyRating: c.difficultyRating,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to get hold classifications:', error);
    return NextResponse.json(
      { error: 'Failed to get hold classifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/hold-classifications
 * Creates or updates a hold classification for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardType, layoutId, sizeId, holdId, holdType, difficultyRating } = body;

    if (!boardType || layoutId === undefined || sizeId === undefined || holdId === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: boardType, layoutId, sizeId, holdId' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if a classification already exists
    const existing = await db
      .select()
      .from(schema.userHoldClassifications)
      .where(
        and(
          eq(schema.userHoldClassifications.userId, session.user.id),
          eq(schema.userHoldClassifications.boardType, boardType),
          eq(schema.userHoldClassifications.layoutId, layoutId),
          eq(schema.userHoldClassifications.sizeId, sizeId),
          eq(schema.userHoldClassifications.holdId, holdId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing classification
      await db
        .update(schema.userHoldClassifications)
        .set({
          holdType: holdType || null,
          difficultyRating: difficultyRating || null,
          updatedAt: now,
        })
        .where(eq(schema.userHoldClassifications.id, existing[0].id));

      return NextResponse.json({
        success: true,
        classification: {
          id: existing[0].id.toString(),
          userId: session.user.id,
          boardType,
          layoutId,
          sizeId,
          holdId,
          holdType: holdType || null,
          difficultyRating: difficultyRating || null,
          createdAt: existing[0].createdAt,
          updatedAt: now,
        },
      });
    } else {
      // Create new classification
      const result = await db
        .insert(schema.userHoldClassifications)
        .values({
          userId: session.user.id,
          boardType,
          layoutId,
          sizeId,
          holdId,
          holdType: holdType || null,
          difficultyRating: difficultyRating || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return NextResponse.json({
        success: true,
        classification: {
          id: result[0].id.toString(),
          userId: session.user.id,
          boardType,
          layoutId,
          sizeId,
          holdId,
          holdType: holdType || null,
          difficultyRating: difficultyRating || null,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  } catch (error) {
    console.error('Failed to save hold classification:', error);
    return NextResponse.json(
      { error: 'Failed to save hold classification' },
      { status: 500 }
    );
  }
}
