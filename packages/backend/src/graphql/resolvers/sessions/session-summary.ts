import { db } from '../../../db/client';
import { sessions } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import type { SessionSummary } from '@boardsesh/shared-schema';

/**
 * Generate a summary for a session including grade distribution,
 * hardest climb, participant stats, and duration.
 */
export async function generateSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  // Fetch session metadata
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (sessionRows.length === 0) {
    return null;
  }

  const session = sessionRows[0];

  // Run aggregation queries in parallel
  const [gradeDistResult, hardestResult, participantResult] = await Promise.all([
    // Grade distribution: count sends grouped by grade
    db.execute(sql`
      SELECT dg.boulder_name AS grade, COUNT(*)::int AS count
      FROM boardsesh_ticks t
      LEFT JOIN board_difficulty_grades dg
        ON dg.difficulty = t.difficulty
        AND dg.board_type = t.board_type
      WHERE t.session_id = ${sessionId}
        AND t.status IN ('flash', 'send')
        AND t.difficulty IS NOT NULL
      GROUP BY dg.boulder_name, dg.difficulty
      ORDER BY dg.difficulty DESC
    `),

    // Hardest climb: highest difficulty send
    db.execute(sql`
      SELECT t.climb_uuid AS "climbUuid",
             t.board_type AS "boardType",
             t.difficulty AS difficulty,
             dg.boulder_name AS grade
      FROM boardsesh_ticks t
      LEFT JOIN board_difficulty_grades dg
        ON dg.difficulty = t.difficulty
        AND dg.board_type = t.board_type
      WHERE t.session_id = ${sessionId}
        AND t.status IN ('flash', 'send')
        AND t.difficulty IS NOT NULL
      ORDER BY t.difficulty DESC
      LIMIT 1
    `),

    // Participant stats: sends and attempts per user
    db.execute(sql`
      SELECT t.user_id AS "userId",
             COALESCE(up.display_name, u.name) AS "displayName",
             up.avatar_url AS "avatarUrl",
             COUNT(*) FILTER (WHERE t.status IN ('flash', 'send'))::int AS sends,
             COUNT(*)::int AS attempts
      FROM boardsesh_ticks t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN user_profiles up ON up.user_id = t.user_id
      WHERE t.session_id = ${sessionId}
      GROUP BY t.user_id, up.display_name, u.name, up.avatar_url
      ORDER BY sends DESC
    `),
  ]);

  // db.execute returns rows directly as an array (Neon driver)
  const gradeDistRows = (gradeDistResult as unknown as Array<{ grade: string | null; count: number }>);
  const hardestRows = (hardestResult as unknown as Array<{
    climbUuid: string;
    boardType: string;
    difficulty: number;
    grade: string | null;
  }>);
  const participantRows = (participantResult as unknown as Array<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    sends: number;
    attempts: number;
  }>);

  // Build grade distribution (filter out null grades)
  const gradeDistribution = gradeDistRows
    .filter((r) => r.grade != null)
    .map((r) => ({ grade: r.grade!, count: r.count }));

  // Build hardest climb
  let hardestClimb = null;
  if (hardestRows.length > 0) {
    const h = hardestRows[0];
    // Look up climb name from board-specific climbs table
    const climbNameResult = await db.execute(sql`
      SELECT name FROM board_climbs
      WHERE uuid = ${h.climbUuid}
      LIMIT 1
    `);
    const climbNameRows = climbNameResult as unknown as Array<{ name?: string }>;
    const climbName = climbNameRows[0]?.name || 'Unknown climb';
    hardestClimb = {
      climbUuid: h.climbUuid,
      climbName,
      grade: h.grade || `V${h.difficulty}`,
    };
  }

  // Build participants
  const participants = participantRows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    sends: r.sends,
    attempts: r.attempts,
  }));

  // Calculate totals
  const totalSends = participants.reduce((sum, p) => sum + p.sends, 0);
  const totalAttempts = participants.reduce((sum, p) => sum + p.attempts, 0);

  // Calculate duration
  let durationMinutes: number | null = null;
  if (session.startedAt && session.endedAt) {
    durationMinutes = Math.round(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 60000
    );
  }

  return {
    sessionId,
    totalSends,
    totalAttempts,
    gradeDistribution,
    hardestClimb,
    participants,
    startedAt: session.startedAt?.toISOString() || null,
    endedAt: session.endedAt?.toISOString() || null,
    durationMinutes,
    goal: session.goal || null,
  };
}
