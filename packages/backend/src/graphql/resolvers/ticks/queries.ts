import { eq, and, desc, inArray } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client.js';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers.js';
import { GetTicksInputSchema, BoardNameSchema } from '../../../validation/schemas.js';

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
   * Returns empty array if not authenticated (graceful handling for unauthenticated users)
   */
  ticks: async (
    _: unknown,
    { input }: { input: { boardType: string; climbUuids?: string[] } },
    ctx: ConnectionContext
  ): Promise<unknown[]> => {
    // Return empty array if not authenticated (no need to throw error for logbook)
    if (!ctx.isAuthenticated || !ctx.userId) {
      return [];
    }
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
};
