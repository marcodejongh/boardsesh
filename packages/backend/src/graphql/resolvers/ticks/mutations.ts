import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { SaveTickInputSchema } from '../../../validation/schemas';
import { resolveBoardFromPath } from '../social/boards';
import { publishSocialEvent } from '../../../events';
import { assignInferredSession } from '../../../jobs/inferred-session-builder';

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

    const result = {
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

    // Assign inferred session for ticks not in party mode (fire-and-forget)
    if (!validatedInput.sessionId) {
      assignInferredSession(uuid, userId, climbedAt, validatedInput.status).catch((err) => {
        console.error(`[saveTick] Failed to assign inferred session for tick ${uuid}:`, err);
      });
    }

    // Publish ascent.logged event for feed fan-out (only for successful ascents)
    if (tick.status === 'flash' || tick.status === 'send') {
      // Fire-and-forget with retry: don't block the response on event publishing
      publishAscentEvent(tick, userId, boardId).catch(() => {
        // Final failure already logged inside publishAscentEvent
      });
    }

    return result;
  },
};

const MAX_EVENT_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/**
 * Fetch denormalized metadata and publish an ascent.logged event.
 * Retries up to MAX_EVENT_RETRIES times with exponential backoff.
 */
async function publishAscentEvent(
  tick: { uuid: string; climbUuid: string; boardType: string; status: string; angle: number; isMirror: boolean | null; isBenchmark: boolean | null; difficulty: number | null; quality: number | null; attemptCount: number; comment: string | null },
  userId: string,
  boardId: number | null,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_EVENT_RETRIES; attempt++) {
    try {
      const [climbData] = await db
        .select({
          name: dbSchema.boardClimbs.name,
          setterUsername: dbSchema.boardClimbs.setterUsername,
          layoutId: dbSchema.boardClimbs.layoutId,
          frames: dbSchema.boardClimbs.frames,
        })
        .from(dbSchema.boardClimbs)
        .where(
          and(
            eq(dbSchema.boardClimbs.uuid, tick.climbUuid),
            eq(dbSchema.boardClimbs.boardType, tick.boardType)
          )
        )
        .limit(1);

      const [userProfile] = await db
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

      let difficultyName: string | undefined;
      if (tick.difficulty) {
        const [grade] = await db
          .select({ boulderName: dbSchema.boardDifficultyGrades.boulderName })
          .from(dbSchema.boardDifficultyGrades)
          .where(
            and(
              eq(dbSchema.boardDifficultyGrades.difficulty, tick.difficulty),
              eq(dbSchema.boardDifficultyGrades.boardType, tick.boardType)
            )
          )
          .limit(1);
        difficultyName = grade?.boulderName ?? undefined;
      }

      let boardUuid: string | undefined;
      if (boardId) {
        const [board] = await db
          .select({ uuid: dbSchema.userBoards.uuid })
          .from(dbSchema.userBoards)
          .where(eq(dbSchema.userBoards.id, boardId))
          .limit(1);
        boardUuid = board?.uuid;
      }

      await publishSocialEvent({
        type: 'ascent.logged',
        actorId: userId,
        entityType: 'tick',
        entityId: tick.uuid,
        timestamp: Date.now(),
        metadata: {
          actorDisplayName: userProfile?.displayName || userProfile?.name || '',
          actorAvatarUrl: userProfile?.avatarUrl || userProfile?.image || '',
          climbName: climbData?.name || '',
          climbUuid: tick.climbUuid,
          boardType: tick.boardType,
          setterUsername: climbData?.setterUsername || '',
          layoutId: String(climbData?.layoutId ?? ''),
          frames: climbData?.frames || '',
          gradeName: difficultyName || '',
          difficulty: String(tick.difficulty ?? ''),
          difficultyName: difficultyName || '',
          status: tick.status,
          angle: String(tick.angle),
          isMirror: String(tick.isMirror ?? false),
          isBenchmark: String(tick.isBenchmark ?? false),
          quality: String(tick.quality ?? ''),
          attemptCount: String(tick.attemptCount),
          comment: tick.comment || '',
          // boardUuid may be null if the climb isn't associated with a user board;
          // this is intentional — board-scoped feed filtering simply won't match these items
          boardUuid: boardUuid || '',
        },
      });
      return; // Success
    } catch (error) {
      if (attempt === MAX_EVENT_RETRIES) {
        console.error(
          `[saveTick] Failed to publish ascent.logged event after ${MAX_EVENT_RETRIES} attempts for tick ${tick.uuid}:`,
          error,
        );
      } else {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
