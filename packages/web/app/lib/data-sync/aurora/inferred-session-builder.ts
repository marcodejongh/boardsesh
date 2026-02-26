import { v5 as uuidv5 } from 'uuid';
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

/**
 * Build inferred sessions for a specific user's unassigned ticks.
 * Called after Aurora sync completion in the web package.
 */
export async function buildInferredSessionsForUser(userId: string): Promise<number> {
  const db = getDb();

  // Fetch all unassigned ticks for this user
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
    .orderBy(boardseshTicks.climbedAt);

  if (unassignedTicks.length === 0) return 0;

  // Check user's latest open inferred session
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

  let assigned = 0;
  for (const group of groups) {
    // Upsert session
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
          tickCount: sql`${inferredSessions.tickCount} + EXCLUDED.tick_count`,
          totalSends: sql`${inferredSessions.totalSends} + EXCLUDED.total_sends`,
          totalFlashes: sql`${inferredSessions.totalFlashes} + EXCLUDED.total_flashes`,
          totalAttempts: sql`${inferredSessions.totalAttempts} + EXCLUDED.total_attempts`,
        },
      });

    // Bulk-update ticks
    await db
      .update(boardseshTicks)
      .set({ inferredSessionId: group.sessionId })
      .where(inArray(boardseshTicks.uuid, group.tickUuids));

    assigned += group.tickUuids.length;
  }

  return assigned;
}
