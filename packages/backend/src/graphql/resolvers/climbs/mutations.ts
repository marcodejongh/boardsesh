import crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { ConnectionContext, SaveClimbResult } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { UNIFIED_TABLES, isValidBoardName } from '../../../db/queries/util/table-select';
import { publishSocialEvent } from '../../../events';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers';
import {
  SaveClimbInputSchema,
  SaveMoonBoardClimbInputSchema,
} from '../../../validation/schemas';

type SaveClimbArgs = { input: unknown };

function generateClimbUuid(): string {
  // Match Aurora-style uppercase UUID without dashes
  return crypto.randomUUID().replace(/-/g, '').toUpperCase();
}

async function getUserProfile(userId: string) {
  const [user] = await db
    .select({
      name: dbSchema.users.name,
      image: dbSchema.users.image,
      displayName: dbSchema.userProfiles.displayName,
      avatarUrl: dbSchema.userProfiles.avatarUrl,
    })
    .from(dbSchema.users)
    .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
    .where(eq(dbSchema.users.id, userId))
    .limit(1);

  return {
    displayName: user?.displayName || user?.name || '',
    name: user?.name || '',
    avatarUrl: user?.avatarUrl || user?.image || undefined,
  };
}

function encodeMoonBoardHoldsToFrames(holds: { start: string[]; hand: string[]; finish: string[] }): string {
  const START = 42;
  const HAND = 43;
  const FINISH = 44;

  const coordinateToHoldId = (coord: string): number => {
    // Coord format: e.g., "A1" -> column letter + row number
    const colIndex = coord[0].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    const row = parseInt(coord.slice(1), 10);
    const NUM_COLUMNS = 11; // MoonBoard grid: 11 columns x 18 rows
    return (row - 1) * NUM_COLUMNS + colIndex + 1;
  };

  const parts: string[] = [];
  holds.start.forEach((coord) => parts.push(`p${coordinateToHoldId(coord)}r${START}`));
  holds.hand.forEach((coord) => parts.push(`p${coordinateToHoldId(coord)}r${HAND}`));
  holds.finish.forEach((coord) => parts.push(`p${coordinateToHoldId(coord)}r${FINISH}`));
  return parts.join('');
}

async function resolveDifficultyId(boardType: string, grade?: string | null): Promise<number | null> {
  if (!grade) return null;
  const fontPart = grade.split('/')[0].trim().toLowerCase();

  const [row] = await db
    .select({ difficulty: dbSchema.boardDifficultyGrades.difficulty })
    .from(dbSchema.boardDifficultyGrades)
    .where(
      and(
        eq(dbSchema.boardDifficultyGrades.boardType, boardType),
        sql`LOWER(${dbSchema.boardDifficultyGrades.boulderName}) = ${fontPart}`
      )
    )
    .limit(1);

  return row?.difficulty ?? null;
}

export const climbMutations = {
  /**
   * Save a new climb for Aurora-style boards (kilter/tension) via GraphQL.
   * Persists to the unified board_climbs table and publishes a climb.created event.
   */
  saveClimb: async (
    _: unknown,
    { input }: SaveClimbArgs,
    ctx: ConnectionContext
  ): Promise<SaveClimbResult> => {
    requireAuthenticated(ctx);
    await applyRateLimit(ctx, 10);

    const validated = validateInput(SaveClimbInputSchema, input, 'input');

    if (!isValidBoardName(validated.boardType)) {
      throw new Error(`Invalid board type: ${validated.boardType}. Must be one of ${SUPPORTED_BOARDS.join(', ')}`);
    }

    const uuid = generateClimbUuid();
    const now = new Date().toISOString();
    const { displayName, name, avatarUrl } = await getUserProfile(ctx.userId!);
    const preferredSetter = displayName || name || null;

    await db.insert(UNIFIED_TABLES.climbs).values({
      boardType: validated.boardType,
      uuid,
      layoutId: validated.layoutId,
      userId: ctx.userId!,
      setterId: null,
      setterUsername: preferredSetter,
      name: validated.name,
      description: validated.description ?? '',
      angle: validated.angle,
      framesCount: validated.framesCount ?? 1,
      framesPace: validated.framesPace ?? 0,
      frames: validated.frames,
      isDraft: validated.isDraft,
      isListed: false,
      createdAt: now,
      synced: false,
      syncError: null,
    });

    await publishSocialEvent({
      type: 'climb.created',
      actorId: ctx.userId!,
      entityType: 'climb',
      entityId: uuid,
      timestamp: Date.now(),
      metadata: {
        boardType: validated.boardType,
        layoutId: String(validated.layoutId),
        climbName: validated.name,
        climbUuid: uuid,
        angle: String(validated.angle),
        frames: validated.frames,
        setterDisplayName: preferredSetter || '',
        setterAvatarUrl: avatarUrl || '',
      },
    });

    return { uuid, synced: false };
  },

  /**
   * Save a new MoonBoard climb via GraphQL.
   * Encodes holds to frames, optionally stores grade stats, and publishes climb.created.
   */
  saveMoonBoardClimb: async (
    _: unknown,
    { input }: SaveClimbArgs,
    ctx: ConnectionContext
  ): Promise<SaveClimbResult> => {
    requireAuthenticated(ctx);
    await applyRateLimit(ctx, 10);

    const validated = validateInput(SaveMoonBoardClimbInputSchema, input, 'input');

    if (validated.boardType !== 'moonboard') {
      throw new Error('saveMoonBoardClimb is only supported for boardType=moonboard');
    }

    const uuid = generateClimbUuid();
    const now = new Date().toISOString();
    const { displayName, name, avatarUrl } = await getUserProfile(ctx.userId!);
    const preferredSetter = validated.setter || displayName || name || null;

    const frames = encodeMoonBoardHoldsToFrames(validated.holds as { start: string[]; hand: string[]; finish: string[] });

    await db.insert(UNIFIED_TABLES.climbs).values({
      boardType: validated.boardType,
      uuid,
      layoutId: validated.layoutId,
      userId: ctx.userId!,
      setterId: null,
      setterUsername: preferredSetter,
      name: validated.name,
      description: validated.description ?? '',
      angle: validated.angle,
      framesCount: 1,
      framesPace: 0,
      frames,
      isDraft: validated.isDraft ?? false,
      isListed: false,
      createdAt: now,
      synced: false,
      syncError: null,
    });

    // Optional grade stats
    const difficultyId = await resolveDifficultyId(validated.boardType, validated.userGrade);
    if (difficultyId !== null) {
      await db
        .insert(dbSchema.boardClimbStats)
        .values({
          boardType: validated.boardType,
          climbUuid: uuid,
          angle: validated.angle,
          displayDifficulty: difficultyId,
          benchmarkDifficulty: validated.isBenchmark ? difficultyId : null,
          ascensionistCount: 0,
          difficultyAverage: difficultyId,
          qualityAverage: null,
          faUsername: validated.setter || null,
          faAt: null,
        })
        .onConflictDoUpdate({
          target: [
            dbSchema.boardClimbStats.boardType,
            dbSchema.boardClimbStats.climbUuid,
            dbSchema.boardClimbStats.angle,
          ],
          set: {
            displayDifficulty: difficultyId,
            benchmarkDifficulty: validated.isBenchmark ? difficultyId : null,
            difficultyAverage: difficultyId,
          },
        });
    }

    await publishSocialEvent({
      type: 'climb.created',
      actorId: ctx.userId!,
      entityType: 'climb',
      entityId: uuid,
      timestamp: Date.now(),
      metadata: {
        boardType: validated.boardType,
        layoutId: String(validated.layoutId),
        climbName: validated.name,
        climbUuid: uuid,
        angle: String(validated.angle),
        frames,
        setterDisplayName: preferredSetter || '',
        setterAvatarUrl: avatarUrl || '',
        difficultyName: validated.userGrade || '',
      },
    });

    return { uuid, synced: false };
  },
};
