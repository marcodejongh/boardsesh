import { v4 as uuidv4 } from 'uuid';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { SaveTickInputSchema } from '../../../validation/schemas';
import { resolveBoardFromPath } from '../social/boards';

export const tickMutations = {
  /**
   * Save a tick (climb attempt/ascent) for the authenticated user
   */
  saveTick: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext
  ): Promise<unknown> => {
    requireAuthenticated(ctx);

    // Validate input with business rules
    const validatedInput = validateInput(SaveTickInputSchema, input, 'input');

    const userId = ctx.userId!;
    const uuid = uuidv4();
    const now = new Date().toISOString();
    const climbedAt = new Date(validatedInput.climbedAt).toISOString();

    // Resolve board ID from board config if provided
    let boardId: number | null = null;
    if (validatedInput.layoutId && validatedInput.sizeId && validatedInput.setIds) {
      boardId = await resolveBoardFromPath(
        userId,
        validatedInput.boardType,
        validatedInput.layoutId,
        validatedInput.sizeId,
        validatedInput.setIds,
      );
    }

    // Insert into database
    const [tick] = await db
      .insert(dbSchema.boardseshTicks)
      .values({
        uuid,
        userId,
        boardType: validatedInput.boardType,
        climbUuid: validatedInput.climbUuid,
        angle: validatedInput.angle,
        isMirror: validatedInput.isMirror,
        status: validatedInput.status,
        attemptCount: validatedInput.attemptCount,
        quality: validatedInput.quality ?? null,
        difficulty: validatedInput.difficulty ?? null,
        isBenchmark: validatedInput.isBenchmark,
        comment: validatedInput.comment,
        climbedAt,
        createdAt: now,
        updatedAt: now,
        sessionId: validatedInput.sessionId ?? null,
        boardId,
        // Aurora sync fields are null - will be populated by periodic sync job
        auroraType: null,
        auroraId: null,
        auroraSyncedAt: null,
        auroraSyncError: null,
      })
      .returning();

    return {
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
      boardId: tick.boardId,
      auroraType: tick.auroraType,
      auroraId: tick.auroraId,
      auroraSyncedAt: tick.auroraSyncedAt,
    };
  },
};
