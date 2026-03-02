import { eq, sql } from 'drizzle-orm';
import type {
  SessionEvent,
  SessionFeedParticipant,
  SessionGradeDistributionItem,
} from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { sessions } from '../../../db/schema';

type SessionAggregateRow = {
  total_sends: number;
  total_flashes: number;
  total_attempts: number;
  tick_count: number;
  board_types: string[] | null;
};

type SessionParticipantRow = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  sends: number;
  flashes: number;
  attempts: number;
};

type SessionGradeRow = {
  grade: string;
  difficulty: number;
  flash: number;
  send: number;
  attempt: number;
};

export async function buildSessionStatsUpdatedEvent(
  sessionId: string,
): Promise<Extract<SessionEvent, { __typename: 'SessionStatsUpdated' }> | null> {
  const [sessionRow] = await db
    .select({
      startedAt: sessions.startedAt,
      goal: sessions.goal,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRow) return null;

  const [aggregateResult, participantResult, gradeResult] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE t.status IN ('flash', 'send'))::int AS total_sends,
        COUNT(*) FILTER (WHERE t.status = 'flash')::int AS total_flashes,
        (
          COALESCE(SUM(GREATEST(t.attempt_count - 1, 0)) FILTER (WHERE t.status = 'send'), 0)
          + COALESCE(SUM(t.attempt_count) FILTER (WHERE t.status = 'attempt'), 0)
        )::int AS total_attempts,
        COUNT(*)::int AS tick_count,
        COALESCE(ARRAY_AGG(DISTINCT t.board_type), ARRAY[]::text[]) AS board_types
      FROM boardsesh_ticks t
      WHERE t.session_id = ${sessionId}
    `),
    db.execute(sql`
      SELECT
        t.user_id AS "userId",
        COALESCE(up.display_name, u.name) AS "displayName",
        COALESCE(up.avatar_url, u.image) AS "avatarUrl",
        COUNT(*) FILTER (WHERE t.status IN ('flash', 'send'))::int AS sends,
        COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flashes,
        (
          COALESCE(SUM(GREATEST(t.attempt_count - 1, 0)) FILTER (WHERE t.status = 'send'), 0)
          + COALESCE(SUM(t.attempt_count) FILTER (WHERE t.status = 'attempt'), 0)
        )::int AS attempts
      FROM boardsesh_ticks t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN user_profiles up ON up.user_id = t.user_id
      WHERE t.session_id = ${sessionId}
      GROUP BY t.user_id, up.display_name, up.avatar_url, u.name, u.image
      ORDER BY sends DESC
    `),
    db.execute(sql`
      SELECT
        dg.boulder_name AS grade,
        dg.difficulty AS difficulty,
        COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flash,
        COUNT(*) FILTER (WHERE t.status = 'send')::int AS send,
        (
          COALESCE(SUM(GREATEST(t.attempt_count - 1, 0)) FILTER (WHERE t.status = 'send'), 0)
          + COALESCE(SUM(t.attempt_count) FILTER (WHERE t.status = 'attempt'), 0)
        )::int AS attempt
      FROM boardsesh_ticks t
      LEFT JOIN board_difficulty_grades dg
        ON dg.difficulty = t.difficulty
       AND dg.board_type = t.board_type
      WHERE t.session_id = ${sessionId}
        AND t.difficulty IS NOT NULL
        AND dg.boulder_name IS NOT NULL
      GROUP BY dg.boulder_name, dg.difficulty
      ORDER BY dg.difficulty DESC
    `),
  ]);

  const aggregateRows = (aggregateResult as unknown as { rows: SessionAggregateRow[] }).rows;
  const participantRows = (participantResult as unknown as { rows: SessionParticipantRow[] }).rows;
  const gradeRows = (gradeResult as unknown as { rows: SessionGradeRow[] }).rows;

  const aggregate = aggregateRows[0] ?? {
    total_sends: 0,
    total_flashes: 0,
    total_attempts: 0,
    tick_count: 0,
    board_types: [],
  };

  const participants: SessionFeedParticipant[] = participantRows.map((row) => ({
    userId: row.userId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    sends: Number(row.sends),
    flashes: Number(row.flashes),
    attempts: Number(row.attempts),
  }));

  const gradeDistribution: SessionGradeDistributionItem[] = gradeRows.map((row) => ({
    grade: row.grade,
    flash: Number(row.flash),
    send: Number(row.send),
    attempt: Number(row.attempt),
  }));

  const hardestGrade = gradeDistribution.find((grade) => grade.flash + grade.send > 0)?.grade ?? null;
  const boardTypes = Array.isArray(aggregate.board_types) ? aggregate.board_types : [];

  let durationMinutes: number | null = null;
  if (sessionRow.startedAt) {
    durationMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(sessionRow.startedAt).getTime()) / 60000),
    );
  }

  return {
    __typename: 'SessionStatsUpdated',
    sessionId,
    totalSends: Number(aggregate.total_sends),
    totalFlashes: Number(aggregate.total_flashes),
    totalAttempts: Number(aggregate.total_attempts),
    tickCount: Number(aggregate.tick_count),
    participants,
    gradeDistribution,
    boardTypes,
    hardestGrade,
    durationMinutes,
    goal: sessionRow.goal || null,
  };
}
