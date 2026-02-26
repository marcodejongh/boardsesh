import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';
import { getDb } from '@/app/lib/db/db';
import { boardseshTicks, inferredSessions } from '@/app/lib/db/schema';
import { sql, eq, and, isNull, desc, inArray } from 'drizzle-orm';

// Same namespace as the backend builder — must match to produce identical IDs
const INFERRED_SESSION_NAMESPACE = '6ba7b812-9dad-11d1-80b4-00c04fd430c8';

// 4 hours in milliseconds
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

/**
 * Generate a deterministic UUID v5 for an inferred session.
 * Same (userId, firstTickTimestamp) always produces the same ID.
 */
export function generateInferredSessionId(userId: string, firstTickTimestamp: string): string {
  return uuidv5(`${userId}:${firstTickTimestamp}`, INFERRED_SESSION_NAMESPACE);
}

export interface TickForGrouping {
  uuid: string;
  climbedAt: string;
  status: string;
}

export interface SessionGroup {
  sessionId: string;
  firstTickAt: string;
  lastTickAt: string;
  tickUuids: string[];
  totalSends: number;
  totalFlashes: number;
  totalAttempts: number;
  tickCount: number;
}

export function groupTicks(userId: string, ticks: TickForGrouping[]): SessionGroup[] {
  if (ticks.length === 0) return [];

  const sorted = [...ticks].sort(
    (a, b) => new Date(a.climbedAt).getTime() - new Date(b.climbedAt).getTime(),
  );

  const groups: SessionGroup[] = [];
  let currentGroup: TickForGrouping[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].climbedAt).getTime();
    const currTime = new Date(sorted[i].climbedAt).getTime();

    if (currTime - prevTime > SESSION_GAP_MS) {
      groups.push(buildGroup(userId, currentGroup));
      currentGroup = [sorted[i]];
    } else {
      currentGroup.push(sorted[i]);
    }
  }
  groups.push(buildGroup(userId, currentGroup));

  return groups;
}

function buildGroup(userId: string, ticks: TickForGrouping[]): SessionGroup {
  const firstTickAt = ticks[0].climbedAt;
  const lastTickAt = ticks[ticks.length - 1].climbedAt;

  let totalSends = 0;
  let totalFlashes = 0;
  let totalAttempts = 0;
  for (const t of ticks) {
    if (t.status === 'flash') { totalFlashes++; totalSends++; }
    else if (t.status === 'send') { totalSends++; }
    else if (t.status === 'attempt') { totalAttempts++; }
  }

  return {
    sessionId: generateInferredSessionId(userId, firstTickAt),
    firstTickAt,
    lastTickAt,
    tickUuids: ticks.map((t) => t.uuid),
    totalSends,
    totalFlashes,
    totalAttempts,
    tickCount: ticks.length,
  };
}

const SessionStatsRowSchema = z.object({
  tick_count: z.coerce.number(),
  total_sends: z.coerce.number(),
  total_flashes: z.coerce.number(),
  total_attempts: z.coerce.number(),
  first_tick_at: z.string().nullable(),
  last_tick_at: z.string().nullable(),
});

/**
 * Recalculate aggregate stats for an inferred session from its current ticks.
 * Mirrors packages/backend/src/graphql/resolvers/social/session-mutations.ts
 */
async function recalculateSessionStats(
  sessionId: string,
  conn: ReturnType<typeof getDb>,
): Promise<void> {
  const result = await conn.execute(sql`
    SELECT
      COUNT(*) AS tick_count,
      COUNT(*) FILTER (WHERE status IN ('flash', 'send')) AS total_sends,
      COUNT(*) FILTER (WHERE status = 'flash') AS total_flashes,
      COUNT(*) FILTER (WHERE status = 'attempt') AS total_attempts,
      MIN(climbed_at) AS first_tick_at,
      MAX(climbed_at) AS last_tick_at
    FROM boardsesh_ticks
    WHERE inferred_session_id = ${sessionId}
  `);

  const rawRows = (result as unknown as { rows: unknown[] }).rows;
  const parsed = rawRows.length > 0 ? SessionStatsRowSchema.safeParse(rawRows[0]) : null;

  if (!parsed || !parsed.success || parsed.data.first_tick_at === null) {
    await conn
      .update(inferredSessions)
      .set({
        tickCount: 0,
        totalSends: 0,
        totalFlashes: 0,
        totalAttempts: 0,
      })
      .where(eq(inferredSessions.id, sessionId));
    return;
  }

  const stats = parsed.data;
  await conn
    .update(inferredSessions)
    .set({
      tickCount: stats.tick_count,
      totalSends: stats.total_sends,
      totalFlashes: stats.total_flashes,
      totalAttempts: stats.total_attempts,
      firstTickAt: stats.first_tick_at!,
      lastTickAt: stats.last_tick_at!,
    })
    .where(eq(inferredSessions.id, sessionId));
}

/**
 * Build inferred sessions for a specific user's unassigned ticks.
 * Called after Aurora sync completion in the web package.
 * Processes in batches to avoid memory issues with large tick counts.
 */
export async function buildInferredSessionsForUser(
  userId: string,
  options?: { batchSize?: number },
): Promise<number> {
  const db = getDb();
  const batchSize = options?.batchSize ?? 5000;
  let assigned = 0;

  while (true) {
    // Fetch a batch of unassigned ticks for this user
    const unassignedTicks = await db
      .select({
        uuid: boardseshTicks.uuid,
        climbedAt: boardseshTicks.climbedAt,
        status: boardseshTicks.status,
      })
      .from(boardseshTicks)
      .where(
        and(
          eq(boardseshTicks.userId, userId),
          isNull(boardseshTicks.sessionId),
          isNull(boardseshTicks.inferredSessionId),
        ),
      )
      .orderBy(boardseshTicks.climbedAt)
      .limit(batchSize);

    if (unassignedTicks.length === 0) break;

    // Re-fetch latest session each iteration (previous batches may have created sessions)
    const [latestSession] = await db
      .select({
        id: inferredSessions.id,
        lastTickAt: inferredSessions.lastTickAt,
      })
      .from(inferredSessions)
      .where(
        and(
          eq(inferredSessions.userId, userId),
          isNull(inferredSessions.endedAt),
        ),
      )
      .orderBy(desc(inferredSessions.lastTickAt))
      .limit(1);

    const groups = groupTicks(userId, unassignedTicks);

    // Check if the first group should merge into the latest open session
    if (latestSession && groups.length > 0) {
      const latestSessionTime = new Date(latestSession.lastTickAt).getTime();
      const firstTickTime = new Date(groups[0].firstTickAt).getTime();

      if (firstTickTime - latestSessionTime <= SESSION_GAP_MS && firstTickTime >= latestSessionTime) {
        groups[0] = { ...groups[0], sessionId: latestSession.id };
      }
    }

    for (const group of groups) {
      // Upsert session (time bounds only — stats recalculated below)
      await db
        .insert(inferredSessions)
        .values({
          id: group.sessionId,
          userId,
          firstTickAt: group.firstTickAt,
          lastTickAt: group.lastTickAt,
          totalSends: group.totalSends,
          totalFlashes: group.totalFlashes,
          totalAttempts: group.totalAttempts,
          tickCount: group.tickCount,
        })
        .onConflictDoUpdate({
          target: inferredSessions.id,
          set: {
            firstTickAt: sql`LEAST(${inferredSessions.firstTickAt}, EXCLUDED.first_tick_at)`,
            lastTickAt: sql`GREATEST(${inferredSessions.lastTickAt}, EXCLUDED.last_tick_at)`,
          },
        });

      // Bulk-update ticks
      await db
        .update(boardseshTicks)
        .set({ inferredSessionId: group.sessionId })
        .where(inArray(boardseshTicks.uuid, group.tickUuids));

      // Recalculate stats from actual ticks (avoids double-counting on races)
      await recalculateSessionStats(group.sessionId, db);

      assigned += group.tickUuids.length;
    }

    // If we got fewer ticks than the batch size, we're done
    if (unassignedTicks.length < batchSize) break;
  }

  return assigned;
}
