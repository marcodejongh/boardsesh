import { v5 as uuidv5 } from 'uuid';
import { db } from '../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { sql, eq, and, isNull, desc } from 'drizzle-orm';

// Namespace UUID for generating deterministic inferred session IDs
const INFERRED_SESSION_NAMESPACE = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';

// 4 hours in milliseconds
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

/**
 * Tick data needed for session grouping
 */
export interface TickForGrouping {
  id: bigint | number;
  uuid: string;
  userId: string;
  climbedAt: string;
  status: string;
  sessionId: string | null;
  inferredSessionId: string | null;
}

/**
 * Result of grouping ticks into inferred sessions
 */
export interface InferredSessionGroup {
  sessionId: string;
  userId: string;
  firstTickAt: string;
  lastTickAt: string;
  tickUuids: string[];
  totalSends: number;
  totalFlashes: number;
  totalAttempts: number;
  tickCount: number;
}

/**
 * Generate a deterministic UUID v5 for an inferred session.
 * Same (userId, firstTickTimestamp) always produces the same ID.
 */
export function generateInferredSessionId(userId: string, firstTickTimestamp: string): string {
  return uuidv5(`${userId}:${firstTickTimestamp}`, INFERRED_SESSION_NAMESPACE);
}

/**
 * Pure function: group ticks into inferred sessions based on 4-hour gap heuristic.
 * Only groups ticks that don't already have a sessionId or inferredSessionId.
 * Returns groups per-user (multi-user ticks at the same time produce separate sessions).
 */
export function groupTicksIntoSessions(ticks: TickForGrouping[]): InferredSessionGroup[] {
  // Filter to ticks that need assignment
  const unassigned = ticks.filter(
    (t) => t.sessionId === null && t.inferredSessionId === null,
  );

  if (unassigned.length === 0) return [];

  // Group by user
  const byUser = new Map<string, TickForGrouping[]>();
  for (const tick of unassigned) {
    const userTicks = byUser.get(tick.userId) ?? [];
    userTicks.push(tick);
    byUser.set(tick.userId, userTicks);
  }

  const sessions: InferredSessionGroup[] = [];

  for (const [userId, userTicks] of byUser) {
    // Sort by climbedAt ascending
    userTicks.sort(
      (a, b) => new Date(a.climbedAt).getTime() - new Date(b.climbedAt).getTime(),
    );

    let currentGroup: TickForGrouping[] = [userTicks[0]];

    for (let i = 1; i < userTicks.length; i++) {
      const prevTime = new Date(userTicks[i - 1].climbedAt).getTime();
      const currTime = new Date(userTicks[i].climbedAt).getTime();
      const gap = currTime - prevTime;

      if (gap > SESSION_GAP_MS) {
        // Gap exceeds threshold — finalize current group and start new one
        sessions.push(buildSessionGroup(userId, currentGroup));
        currentGroup = [userTicks[i]];
      } else {
        currentGroup.push(userTicks[i]);
      }
    }

    // Finalize last group
    sessions.push(buildSessionGroup(userId, currentGroup));
  }

  return sessions;
}

function buildSessionGroup(userId: string, ticks: TickForGrouping[]): InferredSessionGroup {
  const firstTickAt = ticks[0].climbedAt;
  const lastTickAt = ticks[ticks.length - 1].climbedAt;
  const sessionId = generateInferredSessionId(userId, firstTickAt);

  let totalSends = 0;
  let totalFlashes = 0;
  let totalAttempts = 0;

  for (const tick of ticks) {
    if (tick.status === 'flash') {
      totalFlashes++;
      totalSends++;
    } else if (tick.status === 'send') {
      totalSends++;
    } else if (tick.status === 'attempt') {
      totalAttempts++;
    }
  }

  return {
    sessionId,
    userId,
    firstTickAt,
    lastTickAt,
    tickUuids: ticks.map((t) => t.uuid),
    totalSends,
    totalFlashes,
    totalAttempts,
    tickCount: ticks.length,
  };
}

/**
 * Assign an inferred session to a newly-created tick (called from saveTick).
 * Checks the user's most recent tick to determine if this tick belongs
 * to an existing inferred session or starts a new one.
 */
export async function assignInferredSession(
  tickUuid: string,
  userId: string,
  climbedAt: string,
  status: string,
): Promise<string | null> {
  // Find user's most recent tick (excluding the current one)
  const [prevTick] = await db
    .select({
      inferredSessionId: dbSchema.boardseshTicks.inferredSessionId,
      climbedAt: dbSchema.boardseshTicks.climbedAt,
    })
    .from(dbSchema.boardseshTicks)
    .where(
      and(
        eq(dbSchema.boardseshTicks.userId, userId),
        sql`${dbSchema.boardseshTicks.uuid} != ${tickUuid}`,
        isNull(dbSchema.boardseshTicks.sessionId),
      ),
    )
    .orderBy(desc(dbSchema.boardseshTicks.climbedAt))
    .limit(1);

  const currentTime = new Date(climbedAt).getTime();

  if (prevTick) {
    const prevTime = new Date(prevTick.climbedAt).getTime();
    const gap = Math.abs(currentTime - prevTime);

    if (gap <= SESSION_GAP_MS && prevTick.inferredSessionId) {
      // Within 4h of previous tick — join the same inferred session
      const sessionId = prevTick.inferredSessionId;

      // Update the tick with the inferred session ID
      await db
        .update(dbSchema.boardseshTicks)
        .set({ inferredSessionId: sessionId })
        .where(eq(dbSchema.boardseshTicks.uuid, tickUuid));

      // Update the inferred session stats
      await db
        .update(dbSchema.inferredSessions)
        .set({
          lastTickAt: climbedAt > prevTick.climbedAt ? climbedAt : sql`${dbSchema.inferredSessions.lastTickAt}`,
          tickCount: sql`${dbSchema.inferredSessions.tickCount} + 1`,
          totalSends: status === 'flash' || status === 'send'
            ? sql`${dbSchema.inferredSessions.totalSends} + 1`
            : sql`${dbSchema.inferredSessions.totalSends}`,
          totalFlashes: status === 'flash'
            ? sql`${dbSchema.inferredSessions.totalFlashes} + 1`
            : sql`${dbSchema.inferredSessions.totalFlashes}`,
          totalAttempts: status === 'attempt'
            ? sql`${dbSchema.inferredSessions.totalAttempts} + 1`
            : sql`${dbSchema.inferredSessions.totalAttempts}`,
        })
        .where(eq(dbSchema.inferredSessions.id, sessionId));

      return sessionId;
    }
  }

  // No previous tick within 4h or no previous inferred session — create a new one
  const sessionId = generateInferredSessionId(userId, climbedAt);

  await db.insert(dbSchema.inferredSessions).values({
    id: sessionId,
    userId,
    firstTickAt: climbedAt,
    lastTickAt: climbedAt,
    totalSends: status === 'flash' || status === 'send' ? 1 : 0,
    totalFlashes: status === 'flash' ? 1 : 0,
    totalAttempts: status === 'attempt' ? 1 : 0,
    tickCount: 1,
  }).onConflictDoUpdate({
    target: dbSchema.inferredSessions.id,
    set: {
      lastTickAt: sql`GREATEST(${dbSchema.inferredSessions.lastTickAt}, EXCLUDED.last_tick_at)`,
      tickCount: sql`${dbSchema.inferredSessions.tickCount} + 1`,
      totalSends: status === 'flash' || status === 'send'
        ? sql`${dbSchema.inferredSessions.totalSends} + 1`
        : sql`${dbSchema.inferredSessions.totalSends}`,
      totalFlashes: status === 'flash'
        ? sql`${dbSchema.inferredSessions.totalFlashes} + 1`
        : sql`${dbSchema.inferredSessions.totalFlashes}`,
      totalAttempts: status === 'attempt'
        ? sql`${dbSchema.inferredSessions.totalAttempts} + 1`
        : sql`${dbSchema.inferredSessions.totalAttempts}`,
    },
  });

  // Update the tick with the inferred session ID
  await db
    .update(dbSchema.boardseshTicks)
    .set({ inferredSessionId: sessionId })
    .where(eq(dbSchema.boardseshTicks.uuid, tickUuid));

  // If there was a previous inferred session, mark it as ended
  if (prevTick?.inferredSessionId && prevTick.inferredSessionId !== sessionId) {
    await db
      .update(dbSchema.inferredSessions)
      .set({ endedAt: prevTick.climbedAt })
      .where(
        and(
          eq(dbSchema.inferredSessions.id, prevTick.inferredSessionId),
          isNull(dbSchema.inferredSessions.endedAt),
        ),
      );
  }

  return sessionId;
}

/**
 * Background job: assign inferred sessions to bulk-imported ticks
 * (e.g. from Aurora sync) that don't have a sessionId or inferredSessionId.
 */
export async function runInferredSessionBuilder(): Promise<number> {
  // Find unassigned ticks from the last 48 hours
  const unassignedTicks = await db
    .select({
      id: dbSchema.boardseshTicks.id,
      uuid: dbSchema.boardseshTicks.uuid,
      userId: dbSchema.boardseshTicks.userId,
      climbedAt: dbSchema.boardseshTicks.climbedAt,
      status: dbSchema.boardseshTicks.status,
      sessionId: dbSchema.boardseshTicks.sessionId,
      inferredSessionId: dbSchema.boardseshTicks.inferredSessionId,
    })
    .from(dbSchema.boardseshTicks)
    .where(
      and(
        isNull(dbSchema.boardseshTicks.sessionId),
        isNull(dbSchema.boardseshTicks.inferredSessionId),
        sql`${dbSchema.boardseshTicks.climbedAt} > NOW() - INTERVAL '48 hours'`,
      ),
    )
    .orderBy(dbSchema.boardseshTicks.climbedAt);

  if (unassignedTicks.length === 0) return 0;

  const groups = groupTicksIntoSessions(
    unassignedTicks.map((t) => ({
      ...t,
      id: t.id,
      sessionId: t.sessionId,
      inferredSessionId: t.inferredSessionId,
    })),
  );

  let assigned = 0;
  for (const group of groups) {
    // Upsert the inferred session
    await db
      .insert(dbSchema.inferredSessions)
      .values({
        id: group.sessionId,
        userId: group.userId,
        firstTickAt: group.firstTickAt,
        lastTickAt: group.lastTickAt,
        totalSends: group.totalSends,
        totalFlashes: group.totalFlashes,
        totalAttempts: group.totalAttempts,
        tickCount: group.tickCount,
      })
      .onConflictDoUpdate({
        target: dbSchema.inferredSessions.id,
        set: {
          lastTickAt: sql`GREATEST(${dbSchema.inferredSessions.lastTickAt}, EXCLUDED.last_tick_at)`,
          tickCount: sql`${dbSchema.inferredSessions.tickCount} + EXCLUDED.tick_count`,
          totalSends: sql`${dbSchema.inferredSessions.totalSends} + EXCLUDED.total_sends`,
          totalFlashes: sql`${dbSchema.inferredSessions.totalFlashes} + EXCLUDED.total_flashes`,
          totalAttempts: sql`${dbSchema.inferredSessions.totalAttempts} + EXCLUDED.total_attempts`,
        },
      });

    // Update ticks with the inferred session ID
    for (const tickUuid of group.tickUuids) {
      await db
        .update(dbSchema.boardseshTicks)
        .set({ inferredSessionId: group.sessionId })
        .where(eq(dbSchema.boardseshTicks.uuid, tickUuid));
    }

    assigned += group.tickUuids.length;
  }

  return assigned;
}
