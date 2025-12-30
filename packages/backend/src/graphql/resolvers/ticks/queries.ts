import { eq, and, desc, inArray } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client.js';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers.js';
import { GetTicksInputSchema, BoardNameSchema } from '../../../validation/schemas.js';

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

    // Build query conditions
    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, input.boardType),
    ];

    if (input.climbUuids && input.climbUuids.length > 0) {
      conditions.push(inArray(dbSchema.boardseshTicks.climbUuid, input.climbUuids));
    }

    // Fetch ticks
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

    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, boardType),
    ];

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
    }));
  },
};
