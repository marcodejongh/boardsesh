import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db/db';
import * as schema from '@/app/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { authOptions } from '@/app/lib/auth/auth-options';

// Valid hold types matching the database enum
const VALID_HOLD_TYPES = ['edge', 'sloper', 'pinch', 'sidepull', 'undercling', 'jug', 'crimp', 'pocket'] as const;
type ValidHoldType = typeof VALID_HOLD_TYPES[number];

/**
 * Validates and parses an integer from a string
 * Returns null if invalid
 */
function parseIntSafe(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validates hold type against allowed enum values
 */
function isValidHoldType(value: unknown): value is ValidHoldType {
  return typeof value === 'string' && VALID_HOLD_TYPES.includes(value as ValidHoldType);
}

/**
 * Validates difficulty rating is in range 1-5
 */
function isValidDifficultyRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

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
    const layoutIdParam = searchParams.get('layoutId');
    const sizeIdParam = searchParams.get('sizeId');

    if (!boardType || !layoutIdParam || !sizeIdParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: boardType, layoutId, sizeId' },
        { status: 400 }
      );
    }

    const layoutId = parseIntSafe(layoutIdParam);
    const sizeId = parseIntSafe(sizeIdParam);

    if (layoutId === null || sizeId === null) {
      return NextResponse.json(
        { error: 'layoutId and sizeId must be valid integers' },
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
          eq(schema.userHoldClassifications.layoutId, layoutId),
          eq(schema.userHoldClassifications.sizeId, sizeId)
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

    // Validate required fields
    if (!boardType || typeof boardType !== 'string') {
      return NextResponse.json(
        { error: 'boardType must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof layoutId !== 'number' || !Number.isInteger(layoutId)) {
      return NextResponse.json(
        { error: 'layoutId must be an integer' },
        { status: 400 }
      );
    }

    if (typeof sizeId !== 'number' || !Number.isInteger(sizeId)) {
      return NextResponse.json(
        { error: 'sizeId must be an integer' },
        { status: 400 }
      );
    }

    if (typeof holdId !== 'number' || !Number.isInteger(holdId)) {
      return NextResponse.json(
        { error: 'holdId must be an integer' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (holdType !== null && holdType !== undefined && !isValidHoldType(holdType)) {
      return NextResponse.json(
        { error: `holdType must be one of: ${VALID_HOLD_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (difficultyRating !== null && difficultyRating !== undefined && !isValidDifficultyRating(difficultyRating)) {
      return NextResponse.json(
        { error: 'difficultyRating must be an integer between 1 and 5' },
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
    const validatedHoldType = holdType || null;
    const validatedDifficultyRating = difficultyRating || null;

    if (existing.length > 0) {
      // Update existing classification
      await db
        .update(schema.userHoldClassifications)
        .set({
          holdType: validatedHoldType,
          difficultyRating: validatedDifficultyRating,
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
          holdType: validatedHoldType,
          difficultyRating: validatedDifficultyRating,
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
          holdType: validatedHoldType,
          difficultyRating: validatedDifficultyRating,
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
          holdType: validatedHoldType,
          difficultyRating: validatedDifficultyRating,
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
