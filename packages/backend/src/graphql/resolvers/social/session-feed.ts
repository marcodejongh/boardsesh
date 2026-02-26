import { eq, and, desc, sql, count as drizzleCount, isNull, inArray } from 'drizzle-orm';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers';
import { ActivityFeedInputSchema } from '../../../validation/schemas';
import { encodeOffsetCursor, decodeOffsetCursor } from '../../../utils/feed-cursor';
import type { SessionFeedItem, SessionDetail, SessionGradeDistributionItem, SessionFeedParticipant, SessionDetailTick } from '@boardsesh/shared-schema';

/**
 * Map validated time period to a parameterized SQL interval condition.
 */
function timePeriodIntervalSql(column: unknown, period: string) {
  switch (period) {
    case 'hour':  return sql`${column} > NOW() - INTERVAL '1 hour'`;
    case 'day':   return sql`${column} > NOW() - INTERVAL '1 day'`;
    case 'week':  return sql`${column} > NOW() - INTERVAL '7 days'`;
    case 'month': return sql`${column} > NOW() - INTERVAL '30 days'`;
    case 'year':  return sql`${column} > NOW() - INTERVAL '365 days'`;
    default:      return null;
  }
}

export const sessionFeedQueries = {
  /**
   * Session-grouped activity feed (public, no auth required).
   * Groups ticks into sessions based on party mode sessionId or inferred sessions.
   * Every tick now has either session_id or inferred_session_id set.
   * Uses offset pagination since session groups are computed at read time.
   */
  sessionGroupedFeed: async (
    _: unknown,
    { input }: { input?: Record<string, unknown> },
  ) => {
    const validatedInput = validateInput(ActivityFeedInputSchema, input || {}, 'input');
    const limit = validatedInput.limit ?? 20;
    const sortBy = validatedInput.sortBy ?? 'new';

    const offset = validatedInput.cursor
      ? (decodeOffsetCursor(validatedInput.cursor) ?? 0)
      : 0;

    // Board filter
    let boardTypeFilter: string | null = null;
    let layoutIdFilter: number | null = null;
    if (validatedInput.boardUuid) {
      const board = await db
        .select({ boardType: dbSchema.userBoards.boardType, layoutId: dbSchema.userBoards.layoutId })
        .from(dbSchema.userBoards)
        .where(eq(dbSchema.userBoards.uuid, validatedInput.boardUuid))
        .limit(1)
        .then(rows => rows[0]);

      if (board) {
        boardTypeFilter = board.boardType;
        layoutIdFilter = board.layoutId;
      }
    }

    // Time period filter for vote-based sorts
    let timePeriodCond: ReturnType<typeof sql> | null = null;
    if (sortBy !== 'new' && validatedInput.topPeriod && validatedInput.topPeriod !== 'all') {
      timePeriodCond = timePeriodIntervalSql(sql`session_last_tick`, validatedInput.topPeriod);
    }

    const boardFilterSql = boardTypeFilter
      ? sql`AND t.board_type = ${boardTypeFilter}`
      : sql``;

    const layoutFilterSql = layoutIdFilter !== null
      ? sql`AND c.layout_id = ${layoutIdFilter}`
      : sql``;

    const timePeriodSql = timePeriodCond
      ? sql`WHERE ${timePeriodCond}`
      : sql``;

    // Build sort expression
    let sortExpression: ReturnType<typeof sql>;
    if (sortBy === 'new') {
      sortExpression = sql`session_last_tick DESC`;
    } else if (sortBy === 'top') {
      sortExpression = sql`vote_score DESC, session_last_tick DESC`;
    } else if (sortBy === 'controversial') {
      sortExpression = sql`
        CASE WHEN vote_up + vote_down = 0 THEN 0
        ELSE LEAST(vote_up, vote_down)::float
             / (vote_up + vote_down)
             * LN(vote_up + vote_down + 1)
        END DESC, session_last_tick DESC`;
    } else {
      // hot
      sortExpression = sql`
        SIGN(vote_score)
        * LN(GREATEST(ABS(vote_score), 1))
        + EXTRACT(EPOCH FROM session_last_tick) / 45000.0 DESC, session_last_tick DESC`;
    }

    // Simplified CTE: every tick now has either session_id or inferred_session_id.
    // No more ungrouped handling needed.
    let sessionRows;
    try {
      sessionRows = await db.execute(sql`
        WITH tick_sessions AS (
          SELECT
            t.uuid AS tick_uuid,
            t.user_id,
            t.climbed_at,
            t.status,
            t.board_type,
            t.difficulty,
            COALESCE(t.session_id, t.inferred_session_id) AS effective_session_id,
            CASE WHEN t.session_id IS NOT NULL THEN 'party' ELSE 'inferred' END AS session_type
          FROM boardsesh_ticks t
          LEFT JOIN board_climbs c
            ON c.uuid = t.climb_uuid AND c.board_type = t.board_type
          WHERE COALESCE(t.session_id, t.inferred_session_id) IS NOT NULL
            ${boardFilterSql}
            ${layoutFilterSql}
        ),
        session_agg AS (
          SELECT
            ts.effective_session_id AS session_id,
            MAX(ts.session_type) AS session_type,
            MIN(ts.climbed_at) AS session_first_tick,
            MAX(ts.climbed_at) AS session_last_tick,
            COUNT(*) AS tick_count,
            COUNT(*) FILTER (WHERE ts.status IN ('flash', 'send')) AS total_sends,
            COUNT(*) FILTER (WHERE ts.status = 'flash') AS total_flashes,
            COUNT(*) FILTER (WHERE ts.status = 'attempt') AS total_attempts,
            ARRAY_AGG(DISTINCT ts.board_type) AS board_types,
            ARRAY_AGG(DISTINCT ts.user_id) AS user_ids
          FROM tick_sessions ts
          GROUP BY ts.effective_session_id
        ),
        scored AS (
          SELECT
            sa.*,
            COALESCE(vc.score, 0) AS vote_score,
            COALESCE(vc.upvotes, 0) AS vote_up,
            COALESCE(vc.downvotes, 0) AS vote_down,
            COALESCE(cc.comment_count, 0) AS comment_count
          FROM session_agg sa
          LEFT JOIN vote_counts vc
            ON vc.entity_type = 'session' AND vc.entity_id = sa.session_id
          LEFT JOIN (
            SELECT entity_id, COUNT(*) AS comment_count
            FROM comments
            WHERE entity_type = 'session' AND deleted_at IS NULL
            GROUP BY entity_id
          ) cc ON cc.entity_id = sa.session_id
          ${timePeriodSql}
        )
        SELECT *
        FROM scored
        ORDER BY ${sortExpression}
        OFFSET ${offset}
        LIMIT ${limit + 1}
      `);
    } catch (err) {
      console.error('[sessionGroupedFeed] SQL error:', err);
      throw err;
    }

    // db.execute() returns QueryResult (neon-serverless) with .rows property
    const rows = (sessionRows as unknown as { rows: Array<{
      session_id: string;
      session_type: string;
      session_first_tick: string;
      session_last_tick: string;
      tick_count: number;
      total_sends: number;
      total_flashes: number;
      total_attempts: number;
      board_types: string[];
      user_ids: string[];
      vote_score: number;
      vote_up: number;
      vote_down: number;
      comment_count: number;
    }> }).rows;

    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;

    // Batch enrichment: 3 queries total instead of 3 per session
    const sessionIds = resultRows.map((r) => r.session_id);
    const sessionTypes = new Map(resultRows.map((r) => [r.session_id, r.session_type]));

    const [participantMap, gradeDistMap, metaMap] = await Promise.all([
      fetchParticipantsBatch(sessionIds, sessionTypes),
      fetchGradeDistributionBatch(sessionIds, sessionTypes),
      fetchSessionMetaBatch(sessionIds, sessionTypes),
    ]);

    const sessions: SessionFeedItem[] = resultRows.map((row) => {
      const participants = participantMap.get(row.session_id) ?? [];
      const gradeDistribution = gradeDistMap.get(row.session_id) ?? [];
      const sessionMeta = metaMap.get(row.session_id) ?? null;

      const firstTime = new Date(row.session_first_tick).getTime();
      const lastTime = new Date(row.session_last_tick).getTime();
      const durationMinutes = Math.round((lastTime - firstTime) / 60000) || null;

      return {
        sessionId: row.session_id,
        sessionType: row.session_type as 'party' | 'inferred',
        sessionName: sessionMeta?.name || null,
        ownerUserId: sessionMeta?.ownerUserId || null,
        participants,
        totalSends: Number(row.total_sends),
        totalFlashes: Number(row.total_flashes),
        totalAttempts: Number(row.total_attempts),
        tickCount: Number(row.tick_count),
        gradeDistribution,
        boardTypes: row.board_types,
        hardestGrade: gradeDistribution.length > 0 ? gradeDistribution[0].grade : null,
        firstTickAt: typeof row.session_first_tick === 'object'
          ? (row.session_first_tick as unknown as Date).toISOString()
          : String(row.session_first_tick),
        lastTickAt: typeof row.session_last_tick === 'object'
          ? (row.session_last_tick as unknown as Date).toISOString()
          : String(row.session_last_tick),
        durationMinutes,
        goal: sessionMeta?.goal || null,
        upvotes: Number(row.vote_up),
        downvotes: Number(row.vote_down),
        voteScore: Number(row.vote_score),
        commentCount: Number(row.comment_count),
      };
    });

    const nextCursor = hasMore ? encodeOffsetCursor(offset + limit) : null;

    return { sessions, cursor: nextCursor, hasMore };
  },

  /**
   * Get full detail for a single session.
   */
  sessionDetail: async (
    _: unknown,
    { sessionId }: { sessionId: string },
  ): Promise<SessionDetail | null> => {
    if (!sessionId) return null;

    // Check if it's a party mode session
    const [partySession] = await db
      .select()
      .from(dbSchema.boardSessions)
      .where(eq(dbSchema.boardSessions.id, sessionId))
      .limit(1);

    const isParty = !!partySession;

    // Check if it's an inferred session
    let inferredSession: typeof dbSchema.inferredSessions.$inferSelect | undefined;
    if (!isParty) {
      const [result] = await db
        .select()
        .from(dbSchema.inferredSessions)
        .where(eq(dbSchema.inferredSessions.id, sessionId))
        .limit(1);

      if (!result) return null;
      inferredSession = result;
    }

    // Fetch ticks for this session
    const tickCondition = isParty
      ? eq(dbSchema.boardseshTicks.sessionId, sessionId)
      : eq(dbSchema.boardseshTicks.inferredSessionId, sessionId);

    const tickRows = await db
      .select({
        tick: dbSchema.boardseshTicks,
        climbName: dbSchema.boardClimbs.name,
        setterUsername: dbSchema.boardClimbs.setterUsername,
        layoutId: dbSchema.boardClimbs.layoutId,
        frames: dbSchema.boardClimbs.frames,
        difficultyName: dbSchema.boardDifficultyGrades.boulderName,
      })
      .from(dbSchema.boardseshTicks)
      .leftJoin(
        dbSchema.boardClimbs,
        and(
          eq(dbSchema.boardseshTicks.climbUuid, dbSchema.boardClimbs.uuid),
          eq(dbSchema.boardseshTicks.boardType, dbSchema.boardClimbs.boardType),
        ),
      )
      .leftJoin(
        dbSchema.boardDifficultyGrades,
        and(
          eq(dbSchema.boardseshTicks.difficulty, dbSchema.boardDifficultyGrades.difficulty),
          eq(dbSchema.boardseshTicks.boardType, dbSchema.boardDifficultyGrades.boardType),
        ),
      )
      .where(tickCondition)
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

    if (tickRows.length === 0) return null;

    // Build ticks
    const ticks: SessionDetailTick[] = tickRows.map((row) => ({
      uuid: row.tick.uuid,
      userId: row.tick.userId,
      climbUuid: row.tick.climbUuid,
      climbName: row.climbName || null,
      boardType: row.tick.boardType,
      layoutId: row.layoutId,
      angle: row.tick.angle,
      status: row.tick.status,
      attemptCount: row.tick.attemptCount,
      difficulty: row.tick.difficulty,
      difficultyName: row.difficultyName || null,
      quality: row.tick.quality,
      isMirror: row.tick.isMirror ?? false,
      isBenchmark: row.tick.isBenchmark ?? false,
      comment: row.tick.comment || null,
      frames: row.frames || null,
      setterUsername: row.setterUsername || null,
      climbedAt: row.tick.climbedAt,
    }));

    // Compute aggregates
    const userIds = [...new Set(tickRows.map((r) => r.tick.userId))];
    const boardTypes = [...new Set(tickRows.map((r) => r.tick.boardType))];

    let totalSends = 0;
    let totalFlashes = 0;
    let totalAttempts = 0;
    for (const row of tickRows) {
      if (row.tick.status === 'flash') { totalFlashes++; totalSends++; }
      else if (row.tick.status === 'send') { totalSends++; }
      else if (row.tick.status === 'attempt') { totalAttempts++; }
    }

    const participants = await fetchParticipants(sessionId, isParty ? 'party' : 'inferred', userIds);
    const gradeDistribution = buildGradeDistributionFromTicks(tickRows);

    // Timestamps
    const sortedTicks = [...tickRows].sort(
      (a, b) => new Date(a.tick.climbedAt).getTime() - new Date(b.tick.climbedAt).getTime(),
    );
    const firstTickAt = sortedTicks[0].tick.climbedAt;
    const lastTickAt = sortedTicks[sortedTicks.length - 1].tick.climbedAt;
    const durationMinutes = Math.round(
      (new Date(lastTickAt).getTime() - new Date(firstTickAt).getTime()) / 60000,
    ) || null;

    // Hardest grade
    const gradesSorted = tickRows
      .filter((r) => r.difficultyName && (r.tick.status === 'flash' || r.tick.status === 'send'))
      .sort((a, b) => (b.tick.difficulty ?? 0) - (a.tick.difficulty ?? 0));
    const hardestGrade = gradesSorted.length > 0 ? gradesSorted[0].difficultyName : null;

    // Vote/comment counts
    const [voteData] = await db
      .select({
        upvotes: sql<number>`COALESCE(upvotes, 0)`,
        downvotes: sql<number>`COALESCE(downvotes, 0)`,
        score: sql<number>`COALESCE(score, 0)`,
      })
      .from(dbSchema.voteCounts)
      .where(
        and(
          sql`${dbSchema.voteCounts.entityType} = 'session'`,
          eq(dbSchema.voteCounts.entityId, sessionId),
        ),
      )
      .limit(1);

    const [commentData] = await db
      .select({ count: drizzleCount() })
      .from(dbSchema.comments)
      .where(
        and(
          sql`${dbSchema.comments.entityType} = 'session'`,
          eq(dbSchema.comments.entityId, sessionId),
          isNull(dbSchema.comments.deletedAt),
        ),
      );

    // Session metadata
    const sessionName = isParty
      ? partySession?.name || null
      : inferredSession?.name || null;
    const goal = isParty
      ? partySession?.goal || null
      : inferredSession?.description || null;
    const ownerUserId = isParty
      ? partySession?.createdByUserId || null
      : inferredSession?.userId || null;

    return {
      sessionId,
      sessionType: isParty ? 'party' : 'inferred',
      sessionName,
      ownerUserId,
      participants,
      totalSends,
      totalFlashes,
      totalAttempts,
      tickCount: tickRows.length,
      gradeDistribution,
      boardTypes,
      hardestGrade,
      firstTickAt,
      lastTickAt,
      durationMinutes,
      goal,
      ticks,
      upvotes: voteData ? Number(voteData.upvotes) : 0,
      downvotes: voteData ? Number(voteData.downvotes) : 0,
      voteScore: voteData ? Number(voteData.score) : 0,
      commentCount: commentData ? Number(commentData.count) : 0,
    };
  },
};

/**
 * Build WHERE clause for tick lookups.
 * - Party mode: filter by session_id
 * - Inferred: filter by inferred_session_id
 */
function tickSessionFilter(sessionId: string, sessionType: string) {
  return sessionType === 'party'
    ? sql`t.session_id = ${sessionId}`
    : sql`t.inferred_session_id = ${sessionId}`;
}

/**
 * Fetch participant info for a session
 */
async function fetchParticipants(
  sessionId: string,
  sessionType: string,
  userIds: string[],
): Promise<SessionFeedParticipant[]> {
  if (userIds.length === 0) return [];

  const whereClause = tickSessionFilter(sessionId, sessionType);

  const participantRows = await db.execute(sql`
    SELECT
      t.user_id AS "userId",
      COALESCE(up.display_name, u.name) AS "displayName",
      COALESCE(up.avatar_url, u.image) AS "avatarUrl",
      COUNT(*) FILTER (WHERE t.status IN ('flash', 'send'))::int AS sends,
      COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flashes,
      COUNT(*) FILTER (WHERE t.status = 'attempt')::int AS attempts
    FROM boardsesh_ticks t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN user_profiles up ON up.user_id = t.user_id
    WHERE ${whereClause}
    GROUP BY t.user_id, up.display_name, u.name, up.avatar_url, u.image
    ORDER BY sends DESC
  `);

  // db.execute() returns QueryResult with .rows property
  return ((participantRows as unknown as { rows: Array<{
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    sends: number;
    flashes: number;
    attempts: number;
  }> }).rows).map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    sends: r.sends,
    flashes: r.flashes,
    attempts: r.attempts,
  }));
}

/**
 * Fetch grade distribution for a session
 */
async function fetchGradeDistribution(
  sessionId: string,
  sessionType: string,
): Promise<SessionGradeDistributionItem[]> {
  const whereClause = tickSessionFilter(sessionId, sessionType);

  const rows = await db.execute(sql`
    SELECT
      dg.boulder_name AS grade,
      dg.difficulty AS diff_num,
      COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flash,
      COUNT(*) FILTER (WHERE t.status = 'send')::int AS send,
      COUNT(*) FILTER (WHERE t.status = 'attempt')::int AS attempt
    FROM boardsesh_ticks t
    LEFT JOIN board_difficulty_grades dg
      ON dg.difficulty = t.difficulty AND dg.board_type = t.board_type
    WHERE ${whereClause}
      AND t.difficulty IS NOT NULL
    GROUP BY dg.boulder_name, dg.difficulty
    ORDER BY dg.difficulty DESC
  `);

  // db.execute() returns QueryResult with .rows property
  return ((rows as unknown as { rows: Array<{
    grade: string | null;
    diff_num: number;
    flash: number;
    send: number;
    attempt: number;
  }> }).rows)
    .filter((r): r is typeof r & { grade: string } => r.grade != null)
    .map((r) => ({
      grade: r.grade,
      flash: r.flash,
      send: r.send,
      attempt: r.attempt,
    }));
}

/**
 * Build grade distribution from pre-fetched tick rows (for session detail)
 */
function buildGradeDistributionFromTicks(
  tickRows: Array<{
    tick: { status: string; difficulty: number | null; boardType: string };
    difficultyName: string | null;
  }>,
): SessionGradeDistributionItem[] {
  const gradeMap = new Map<string, { grade: string; difficulty: number; flash: number; send: number; attempt: number }>();

  for (const row of tickRows) {
    if (row.tick.difficulty == null || !row.difficultyName) continue;
    const key = `${row.difficultyName}:${row.tick.difficulty}`;
    const existing = gradeMap.get(key) ?? { grade: row.difficultyName, difficulty: row.tick.difficulty, flash: 0, send: 0, attempt: 0 };

    if (row.tick.status === 'flash') existing.flash++;
    else if (row.tick.status === 'send') existing.send++;
    else if (row.tick.status === 'attempt') existing.attempt++;

    gradeMap.set(key, existing);
  }

  return [...gradeMap.values()]
    .sort((a, b) => b.difficulty - a.difficulty)
    .map(({ grade, flash, send, attempt }) => ({ grade, flash, send, attempt }));
}

/**
 * Fetch session metadata (name, goal) from party mode or inferred sessions
 */
async function fetchSessionMeta(
  sessionId: string,
  sessionType: string,
): Promise<{ name: string | null; goal: string | null; ownerUserId: string | null } | null> {
  if (sessionType === 'party') {
    const [session] = await db
      .select({
        name: dbSchema.boardSessions.name,
        goal: dbSchema.boardSessions.goal,
        createdByUserId: dbSchema.boardSessions.createdByUserId,
      })
      .from(dbSchema.boardSessions)
      .where(eq(dbSchema.boardSessions.id, sessionId))
      .limit(1);

    if (!session) return null;
    return { name: session.name, goal: session.goal, ownerUserId: session.createdByUserId };
  }

  // Inferred session — look up name, description, and owner
  const [session] = await db
    .select({
      name: dbSchema.inferredSessions.name,
      description: dbSchema.inferredSessions.description,
      userId: dbSchema.inferredSessions.userId,
    })
    .from(dbSchema.inferredSessions)
    .where(eq(dbSchema.inferredSessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  return {
    name: session.name || null,
    goal: session.description || null,
    ownerUserId: session.userId,
  };
}

// ============================================
// Batched enrichment functions for feed (3 queries instead of 3×N)
// ============================================

/**
 * Fetch participants for multiple sessions in a single query.
 * Returns a Map from sessionId to participants array.
 */
async function fetchParticipantsBatch(
  sessionIds: string[],
  sessionTypes: Map<string, string>,
): Promise<Map<string, SessionFeedParticipant[]>> {
  if (sessionIds.length === 0) return new Map();

  const result = await db.execute(sql`
    SELECT
      COALESCE(t.session_id, t.inferred_session_id) AS effective_session_id,
      t.user_id AS "userId",
      COALESCE(up.display_name, u.name) AS "displayName",
      COALESCE(up.avatar_url, u.image) AS "avatarUrl",
      COUNT(*) FILTER (WHERE t.status IN ('flash', 'send'))::int AS sends,
      COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flashes,
      COUNT(*) FILTER (WHERE t.status = 'attempt')::int AS attempts
    FROM boardsesh_ticks t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN user_profiles up ON up.user_id = t.user_id
    WHERE COALESCE(t.session_id, t.inferred_session_id) IN ${sql`(${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`}
    GROUP BY effective_session_id, t.user_id, up.display_name, u.name, up.avatar_url, u.image
    ORDER BY sends DESC
  `);

  const rows = (result as unknown as { rows: Array<{
    effective_session_id: string;
    userId: string;
    displayName: string | null;
    avatarUrl: string | null;
    sends: number;
    flashes: number;
    attempts: number;
  }> }).rows;

  const map = new Map<string, SessionFeedParticipant[]>();
  for (const r of rows) {
    const participants = map.get(r.effective_session_id) ?? [];
    participants.push({
      userId: r.userId,
      displayName: r.displayName,
      avatarUrl: r.avatarUrl,
      sends: r.sends,
      flashes: r.flashes,
      attempts: r.attempts,
    });
    map.set(r.effective_session_id, participants);
  }
  return map;
}

/**
 * Fetch grade distributions for multiple sessions in a single query.
 * Returns a Map from sessionId to grade distribution array.
 */
async function fetchGradeDistributionBatch(
  sessionIds: string[],
  sessionTypes: Map<string, string>,
): Promise<Map<string, SessionGradeDistributionItem[]>> {
  if (sessionIds.length === 0) return new Map();

  const result = await db.execute(sql`
    SELECT
      COALESCE(t.session_id, t.inferred_session_id) AS effective_session_id,
      dg.boulder_name AS grade,
      dg.difficulty AS diff_num,
      COUNT(*) FILTER (WHERE t.status = 'flash')::int AS flash,
      COUNT(*) FILTER (WHERE t.status = 'send')::int AS send,
      COUNT(*) FILTER (WHERE t.status = 'attempt')::int AS attempt
    FROM boardsesh_ticks t
    LEFT JOIN board_difficulty_grades dg
      ON dg.difficulty = t.difficulty AND dg.board_type = t.board_type
    WHERE COALESCE(t.session_id, t.inferred_session_id) IN ${sql`(${sql.join(sessionIds.map(id => sql`${id}`), sql`, `)})`}
      AND t.difficulty IS NOT NULL
    GROUP BY effective_session_id, dg.boulder_name, dg.difficulty
    ORDER BY dg.difficulty DESC
  `);

  const rows = (result as unknown as { rows: Array<{
    effective_session_id: string;
    grade: string | null;
    diff_num: number;
    flash: number;
    send: number;
    attempt: number;
  }> }).rows;

  const map = new Map<string, SessionGradeDistributionItem[]>();
  for (const r of rows) {
    if (r.grade == null) continue;
    const distribution = map.get(r.effective_session_id) ?? [];
    distribution.push({ grade: r.grade, flash: r.flash, send: r.send, attempt: r.attempt });
    map.set(r.effective_session_id, distribution);
  }
  return map;
}

/**
 * Fetch session metadata (name, goal, ownerUserId) for multiple sessions in 2 queries.
 * Returns a Map from sessionId to metadata.
 */
async function fetchSessionMetaBatch(
  sessionIds: string[],
  sessionTypes: Map<string, string>,
): Promise<Map<string, { name: string | null; goal: string | null; ownerUserId: string | null }>> {
  if (sessionIds.length === 0) return new Map();

  const partyIds = sessionIds.filter((id) => sessionTypes.get(id) === 'party');
  const inferredIds = sessionIds.filter((id) => sessionTypes.get(id) === 'inferred');

  const map = new Map<string, { name: string | null; goal: string | null; ownerUserId: string | null }>();

  // Batch fetch party sessions
  if (partyIds.length > 0) {
    const partyRows = await db
      .select({
        id: dbSchema.boardSessions.id,
        name: dbSchema.boardSessions.name,
        goal: dbSchema.boardSessions.goal,
        createdByUserId: dbSchema.boardSessions.createdByUserId,
      })
      .from(dbSchema.boardSessions)
      .where(inArray(dbSchema.boardSessions.id, partyIds));

    for (const r of partyRows) {
      map.set(r.id, { name: r.name, goal: r.goal, ownerUserId: r.createdByUserId });
    }
  }

  // Batch fetch inferred sessions
  if (inferredIds.length > 0) {
    const inferredRows = await db
      .select({
        id: dbSchema.inferredSessions.id,
        name: dbSchema.inferredSessions.name,
        description: dbSchema.inferredSessions.description,
        userId: dbSchema.inferredSessions.userId,
      })
      .from(dbSchema.inferredSessions)
      .where(inArray(dbSchema.inferredSessions.id, inferredIds));

    for (const r of inferredRows) {
      map.set(r.id, { name: r.name || null, goal: r.description || null, ownerUserId: r.userId });
    }
  }

  return map;
}
