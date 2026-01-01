import { eq, and, desc, inArray, sql, count } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client.js';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers.js';
import { GetTicksInputSchema, BoardNameSchema, AscentFeedInputSchema } from '../../../validation/schemas.js';

// Helper to get the climbs table based on board type
const getClimbsTable = (boardType: string) => {
  if (boardType === 'kilter') {
    return dbSchema.kilterClimbs;
  } else if (boardType === 'tension') {
    return dbSchema.tensionClimbs;
  }
  return null;
};

export const tickQueries = {
  /**
   * Get ticks for the authenticated user with optional filtering by climb UUIDs
   */
  ticks: async (
    _: unknown,
    { input }: { input: { boardType: string; climbUuids?: string[] } },
    ctx: ConnectionContext
  ): Promise<unknown[]> => {
    requireAuthenticated(ctx);
    validateInput(GetTicksInputSchema, input, 'input');

    const userId = ctx.userId!;
    const climbsTable = getClimbsTable(input.boardType);

    // Build query conditions
    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, input.boardType),
    ];

    if (input.climbUuids && input.climbUuids.length > 0) {
      conditions.push(inArray(dbSchema.boardseshTicks.climbUuid, input.climbUuids));
    }

    // Fetch ticks with layoutId from climbs table
    if (climbsTable) {
      const results = await db
        .select({
          tick: dbSchema.boardseshTicks,
          layoutId: climbsTable.layoutId,
        })
        .from(dbSchema.boardseshTicks)
        .leftJoin(climbsTable, eq(dbSchema.boardseshTicks.climbUuid, climbsTable.uuid))
        .where(and(...conditions))
        .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

      return results.map(({ tick, layoutId }) => ({
        uuid: tick.uuid,
        userId: tick.userId,
        boardType: tick.boardType,
        climbUuid: tick.climbUuid,
        angle: tick.angle,
        isMirror: tick.isMirror,
        status: tick.status,
        attemptCount: tick.attemptCount,
        quality: tick.quality,
        difficulty: tick.difficulty,
        isBenchmark: tick.isBenchmark,
        comment: tick.comment,
        climbedAt: tick.climbedAt,
        createdAt: tick.createdAt,
        updatedAt: tick.updatedAt,
        sessionId: tick.sessionId,
        auroraType: tick.auroraType,
        auroraId: tick.auroraId,
        auroraSyncedAt: tick.auroraSyncedAt,
        layoutId,
      }));
    }

    // Fallback without join (shouldn't happen for valid board types)
    const ticks = await db
      .select()
      .from(dbSchema.boardseshTicks)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

    return ticks.map(tick => ({
      uuid: tick.uuid,
      userId: tick.userId,
      boardType: tick.boardType,
      climbUuid: tick.climbUuid,
      angle: tick.angle,
      isMirror: tick.isMirror,
      status: tick.status,
      attemptCount: tick.attemptCount,
      quality: tick.quality,
      difficulty: tick.difficulty,
      isBenchmark: tick.isBenchmark,
      comment: tick.comment,
      climbedAt: tick.climbedAt,
      createdAt: tick.createdAt,
      updatedAt: tick.updatedAt,
      sessionId: tick.sessionId,
      auroraType: tick.auroraType,
      auroraId: tick.auroraId,
      auroraSyncedAt: tick.auroraSyncedAt,
      layoutId: null,
    }));
  },

  /**
   * Get ticks for a specific user (public query, no authentication required)
   */
  userTicks: async (
    _: unknown,
    { userId, boardType }: { userId: string; boardType: string }
  ): Promise<unknown[]> => {
    validateInput(BoardNameSchema, boardType, 'boardType');

    const climbsTable = getClimbsTable(boardType);

    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, boardType),
    ];

    // Fetch ticks with layoutId from climbs table
    if (climbsTable) {
      const results = await db
        .select({
          tick: dbSchema.boardseshTicks,
          layoutId: climbsTable.layoutId,
        })
        .from(dbSchema.boardseshTicks)
        .leftJoin(climbsTable, eq(dbSchema.boardseshTicks.climbUuid, climbsTable.uuid))
        .where(and(...conditions))
        .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

      return results.map(({ tick, layoutId }) => ({
        uuid: tick.uuid,
        userId: tick.userId,
        boardType: tick.boardType,
        climbUuid: tick.climbUuid,
        angle: tick.angle,
        isMirror: tick.isMirror,
        status: tick.status,
        attemptCount: tick.attemptCount,
        quality: tick.quality,
        difficulty: tick.difficulty,
        isBenchmark: tick.isBenchmark,
        comment: tick.comment,
        climbedAt: tick.climbedAt,
        createdAt: tick.createdAt,
        updatedAt: tick.updatedAt,
        sessionId: tick.sessionId,
        auroraType: tick.auroraType,
        auroraId: tick.auroraId,
        auroraSyncedAt: tick.auroraSyncedAt,
        layoutId,
      }));
    }

    // Fallback without join (shouldn't happen for valid board types)
    const ticks = await db
      .select()
      .from(dbSchema.boardseshTicks)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

    return ticks.map(tick => ({
      uuid: tick.uuid,
      userId: tick.userId,
      boardType: tick.boardType,
      climbUuid: tick.climbUuid,
      angle: tick.angle,
      isMirror: tick.isMirror,
      status: tick.status,
      attemptCount: tick.attemptCount,
      quality: tick.quality,
      difficulty: tick.difficulty,
      isBenchmark: tick.isBenchmark,
      comment: tick.comment,
      climbedAt: tick.climbedAt,
      createdAt: tick.createdAt,
      updatedAt: tick.updatedAt,
      sessionId: tick.sessionId,
      auroraType: tick.auroraType,
      auroraId: tick.auroraId,
      auroraSyncedAt: tick.auroraSyncedAt,
      layoutId: null,
    }));
  },

  /**
   * Get ascent activity feed for a specific user (public query)
   * Returns ticks with enriched climb data for display in a feed
   */
  userAscentsFeed: async (
    _: unknown,
    { userId, input }: { userId: string; input?: { limit?: number; offset?: number } }
  ): Promise<{
    items: unknown[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    // Validate and set defaults
    const validatedInput = validateInput(AscentFeedInputSchema, input || {}, 'input');
    const limit = validatedInput.limit ?? 20;
    const offset = validatedInput.offset ?? 0;

    // Get total count of ticks for this user
    const countResult = await db
      .select({ count: count() })
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.userId, userId));

    const totalCount = Number(countResult[0]?.count || 0);

    // Fetch ticks ordered by climbedAt, paginated
    const ticks = await db
      .select()
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.userId, userId))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt))
      .limit(limit)
      .offset(offset);

    // Enrich ticks with climb data
    const items = await Promise.all(
      ticks.map(async (tick) => {
        // Get climb details based on board type
        let climbName = 'Unknown Climb';
        let setterUsername: string | null = null;
        let layoutId: number | null = null;

        if (tick.boardType === 'kilter') {
          const climb = await db
            .select({
              name: dbSchema.kilterClimbs.name,
              setterUsername: dbSchema.kilterClimbs.setterUsername,
              layoutId: dbSchema.kilterClimbs.layoutId,
            })
            .from(dbSchema.kilterClimbs)
            .where(eq(dbSchema.kilterClimbs.uuid, tick.climbUuid))
            .limit(1);

          if (climb[0]) {
            climbName = climb[0].name || 'Unnamed Climb';
            setterUsername = climb[0].setterUsername;
            layoutId = climb[0].layoutId;
          }
        } else if (tick.boardType === 'tension') {
          const climb = await db
            .select({
              name: dbSchema.tensionClimbs.name,
              setterUsername: dbSchema.tensionClimbs.setterUsername,
              layoutId: dbSchema.tensionClimbs.layoutId,
            })
            .from(dbSchema.tensionClimbs)
            .where(eq(dbSchema.tensionClimbs.uuid, tick.climbUuid))
            .limit(1);

          if (climb[0]) {
            climbName = climb[0].name || 'Unnamed Climb';
            setterUsername = climb[0].setterUsername;
            layoutId = climb[0].layoutId;
          }
        }

        // Get difficulty name if available
        let difficultyName: string | null = null;
        if (tick.difficulty !== null) {
          if (tick.boardType === 'kilter') {
            const grade = await db
              .select({ boulderName: dbSchema.kilterDifficultyGrades.boulderName })
              .from(dbSchema.kilterDifficultyGrades)
              .where(eq(dbSchema.kilterDifficultyGrades.difficulty, tick.difficulty))
              .limit(1);
            difficultyName = grade[0]?.boulderName || null;
          } else if (tick.boardType === 'tension') {
            const grade = await db
              .select({ boulderName: dbSchema.tensionDifficultyGrades.boulderName })
              .from(dbSchema.tensionDifficultyGrades)
              .where(eq(dbSchema.tensionDifficultyGrades.difficulty, tick.difficulty))
              .limit(1);
            difficultyName = grade[0]?.boulderName || null;
          }
        }

        return {
          uuid: tick.uuid,
          climbUuid: tick.climbUuid,
          climbName,
          setterUsername,
          boardType: tick.boardType,
          layoutId,
          angle: tick.angle,
          isMirror: tick.isMirror,
          status: tick.status,
          attemptCount: tick.attemptCount,
          quality: tick.quality,
          difficulty: tick.difficulty,
          difficultyName,
          isBenchmark: tick.isBenchmark,
          comment: tick.comment || '',
          climbedAt: tick.climbedAt,
        };
      })
    );

    return {
      items,
      totalCount,
      hasMore: offset + items.length < totalCount,
    };
  },
};
