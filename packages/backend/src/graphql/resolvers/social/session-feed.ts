import { eq, and, desc, sql, count as drizzleCount, isNull } from 'drizzle-orm';
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

    // Build conditions for tick filtering
    const tickConditions: ReturnType<typeof sql>[] = [];

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

    // Build the session grouping query using a CTE
    // Step 1: Compute an effective session ID per tick using COALESCE
    // Step 2: Group by (effective_session_id) and aggregate stats
    // Step 3: Sort + paginate
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

    // Use raw SQL CTE for the complex session grouping.
    // Handles three cases:
    //   1. Party mode ticks (session_id set) — grouped by session_id
    //   2. Inferred session ticks (inferred_session_id set) — grouped by inferred_session_id
    //   3. Ungrouped ticks (neither set) — grouped at read time using LAG() window function
    //      to detect 4-hour gaps per user, then assigned synthetic session IDs
    let sessionRows;
    try {
      sessionRows = await db.execute(sql`
        WITH all_ticks AS (
          SELECT
            t.uuid AS tick_uuid,
            t.user_id,
            t.climbed_at,
            t.status,
            t.board_type,
            t.difficulty,
            t.session_id,
            t.inferred_session_id,
            CASE
              WHEN t.session_id IS NOT NULL THEN 'party'
              WHEN t.inferred_session_id IS NOT NULL THEN 'inferred'
              ELSE 'ungrouped'
            END AS session_type
          FROM boardsesh_ticks t
          LEFT JOIN board_climbs c
            ON c.uuid = t.climb_uuid AND c.board_type = t.board_type
          WHERE 1=1
            ${boardFilterSql}
            ${layoutFilterSql}
        ),
        ungrouped_breaks AS (
          SELECT
            tick_uuid, user_id, climbed_at, status, board_type, difficulty,
            session_id, inferred_session_id, session_type,
            CASE
              WHEN LAG(climbed_at) OVER (PARTITION BY user_id ORDER BY climbed_at) IS NULL THEN 1
              WHEN EXTRACT(EPOCH FROM (climbed_at - LAG(climbed_at) OVER (PARTITION BY user_id ORDER BY climbed_at))) > 14400 THEN 1
              ELSE 0
            END AS is_break
          FROM all_ticks
          WHERE session_type = 'ungrouped'
        ),
        ungrouped_sessions AS (
          SELECT
            tick_uuid, user_id, climbed_at, status, board_type, difficulty,
            session_id, inferred_session_id, session_type, is_break,
            SUM(is_break) OVER (
              PARTITION BY user_id ORDER BY climbed_at
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS grp
          FROM ungrouped_breaks
        ),
        tick_sessions AS (
          SELECT
            tick_uuid, user_id, climbed_at, status, board_type, difficulty,
            COALESCE(session_id, inferred_session_id) AS effective_session_id,
            session_type
          FROM all_ticks
          WHERE session_type != 'ungrouped'
          UNION ALL
          SELECT
            tick_uuid, user_id, climbed_at, status, board_type, difficulty,
            'ug:' || user_id || ':' || grp::text AS effective_session_id,
            'inferred'::text AS session_type
          FROM ungrouped_sessions
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

    // Enrich with participant info and grade distribution
    const sessions: SessionFeedItem[] = await Promise.all(
      resultRows.map(async (row) => {
        // For ungrouped sessions (synthetic IDs), use time-range filter
        const isUngrouped = row.session_id.startsWith('ug:');
        const ungroupedFilter: UngroupedFilter | undefined = isUngrouped
          ? {
              userIds: row.user_ids,
              from: typeof row.session_first_tick === 'object'
                ? (row.session_first_tick as unknown as Date).toISOString()
                : String(row.session_first_tick),
              to: typeof row.session_last_tick === 'object'
                ? (row.session_last_tick as unknown as Date).toISOString()
                : String(row.session_last_tick),
            }
          : undefined;

        const [participants, gradeDistribution, sessionMeta] = await Promise.all([
          fetchParticipants(row.session_id, row.session_type, row.user_ids, ungroupedFilter),
          fetchGradeDistribution(row.session_id, row.session_type, ungroupedFilter),
          fetchSessionMeta(row.session_id, row.session_type),
        ]);

        const firstTime = new Date(row.session_first_tick).getTime();
        const lastTime = new Date(row.session_last_tick).getTime();
        const durationMinutes = Math.round((lastTime - firstTime) / 60000) || null;

        return {
          sessionId: row.session_id,
          sessionType: row.session_type as 'party' | 'inferred',
          sessionName: sessionMeta?.name || null,
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
      }),
    );

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

    // Handle ungrouped sessions (synthetic IDs like "ug:userId:groupNumber")
    const ungroupedMatch = sessionId.match(/^ug:(.+):(\d+)$/);
    if (ungroupedMatch) {
      return resolveUngroupedSession(sessionId, ungroupedMatch[1], parseInt(ungroupedMatch[2], 10));
    }

    // Check if it's a party mode session
    const [partySession] = await db
      .select()
      .from(dbSchema.boardSessions)
      .where(eq(dbSchema.boardSessions.id, sessionId))
      .limit(1);

    const isParty = !!partySession;

    // Check if it's an inferred session
    if (!isParty) {
      const [inferredSession] = await db
        .select()
        .from(dbSchema.inferredSessions)
        .where(eq(dbSchema.inferredSessions.id, sessionId))
        .limit(1);

      if (!inferredSession) return null;
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

    return {
      sessionId,
      sessionType: isParty ? 'party' : 'inferred',
      sessionName: isParty ? partySession?.name || null : null,
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
      goal: isParty ? partySession?.goal || null : null,
      ticks,
      upvotes: voteData ? Number(voteData.upvotes) : 0,
      downvotes: voteData ? Number(voteData.downvotes) : 0,
      voteScore: voteData ? Number(voteData.score) : 0,
      commentCount: commentData ? Number(commentData.count) : 0,
    };
  },
};


/** Filter for ungrouped session tick lookups (by user + time range) */
interface UngroupedFilter {
  userIds: string[];
  from: string;
  to: string;
}

/**
 * Build WHERE clause for tick lookups.
 * - Party mode: filter by session_id
 * - Inferred: filter by inferred_session_id
 * - Ungrouped: filter by user_id + time range + no session assigned
 */
function tickSessionFilter(
  sessionId: string,
  sessionType: string,
  ungrouped?: UngroupedFilter,
) {
  if (ungrouped) {
    // Ungrouped sessions are per-user, so userIds always has one entry.
    // Use IN (...) with individual params to avoid array-passing issues.
    const userIdConditions = sql.join(
      ungrouped.userIds.map((id) => sql`${id}`),
      sql`, `,
    );
    return sql`t.user_id IN (${userIdConditions})
      AND t.session_id IS NULL
      AND t.inferred_session_id IS NULL
      AND t.climbed_at >= ${ungrouped.from}::timestamp
      AND t.climbed_at <= ${ungrouped.to}::timestamp`;
  }
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
  ungrouped?: UngroupedFilter,
): Promise<SessionFeedParticipant[]> {
  if (userIds.length === 0) return [];

  const whereClause = tickSessionFilter(sessionId, sessionType, ungrouped);

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
  ungrouped?: UngroupedFilter,
): Promise<SessionGradeDistributionItem[]> {
  const whereClause = tickSessionFilter(sessionId, sessionType, ungrouped);

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
 * Fetch session metadata (name, goal) from party mode sessions table
 */
async function fetchSessionMeta(
  sessionId: string,
  sessionType: string,
): Promise<{ name: string | null; goal: string | null } | null> {
  if (sessionType !== 'party') return null;

  const [session] = await db
    .select({ name: dbSchema.boardSessions.name, goal: dbSchema.boardSessions.goal })
    .from(dbSchema.boardSessions)
    .where(eq(dbSchema.boardSessions.id, sessionId))
    .limit(1);

  return session || null;
}

/**
 * Resolve an ungrouped session by re-running the LAG window query
 * for a specific user and finding the group matching the given number.
 */
async function resolveUngroupedSession(
  sessionId: string,
  userId: string,
  groupNumber: number,
): Promise<SessionDetail | null> {
  // Re-run the LAG window query to find the time range for this group
  const groupResult = await db.execute(sql`
    WITH ungrouped_ticks AS (
      SELECT
        uuid,
        climbed_at,
        CASE
          WHEN LAG(climbed_at) OVER (ORDER BY climbed_at) IS NULL THEN 1
          WHEN EXTRACT(EPOCH FROM (climbed_at - LAG(climbed_at) OVER (ORDER BY climbed_at))) > 14400 THEN 1
          ELSE 0
        END AS is_break
      FROM boardsesh_ticks
      WHERE user_id = ${userId}
        AND session_id IS NULL
        AND inferred_session_id IS NULL
    ),
    grouped AS (
      SELECT
        uuid,
        climbed_at,
        SUM(is_break) OVER (ORDER BY climbed_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp
      FROM ungrouped_ticks
    )
    SELECT
      MIN(climbed_at) AS range_start,
      MAX(climbed_at) AS range_end
    FROM grouped
    WHERE grp = ${groupNumber}
  `);

  const groupRows = (groupResult as unknown as { rows: Array<{
    range_start: string | Date | null;
    range_end: string | Date | null;
  }> }).rows;

  if (groupRows.length === 0 || !groupRows[0].range_start || !groupRows[0].range_end) {
    return null;
  }

  const rangeStart = typeof groupRows[0].range_start === 'object'
    ? (groupRows[0].range_start as Date).toISOString()
    : String(groupRows[0].range_start);
  const rangeEnd = typeof groupRows[0].range_end === 'object'
    ? (groupRows[0].range_end as Date).toISOString()
    : String(groupRows[0].range_end);

  const ungroupedFilter: UngroupedFilter = {
    userIds: [userId],
    from: rangeStart,
    to: rangeEnd,
  };

  // Fetch ticks using the existing tickSessionFilter with UngroupedFilter
  const whereClause = tickSessionFilter(sessionId, 'ungrouped', ungroupedFilter);

  const tickRows = await db.execute(sql`
    SELECT
      t.uuid,
      t.user_id,
      t.climb_uuid,
      t.board_type,
      t.climbed_at,
      t.status,
      t.attempt_count,
      t.difficulty,
      t.quality,
      t.angle,
      t.is_mirror,
      t.is_benchmark,
      t.comment,
      c.name AS climb_name,
      c.setter_username,
      c.layout_id,
      c.frames,
      dg.boulder_name AS difficulty_name
    FROM boardsesh_ticks t
    LEFT JOIN board_climbs c
      ON c.uuid = t.climb_uuid AND c.board_type = t.board_type
    LEFT JOIN board_difficulty_grades dg
      ON dg.difficulty = t.difficulty AND dg.board_type = t.board_type
    WHERE ${whereClause}
    ORDER BY t.climbed_at DESC
  `);

  const rows = (tickRows as unknown as { rows: Array<{
    uuid: string;
    user_id: string;
    climb_uuid: string;
    board_type: string;
    climbed_at: string | Date;
    status: string;
    attempt_count: number;
    difficulty: number | null;
    quality: number | null;
    angle: number;
    is_mirror: boolean | null;
    is_benchmark: boolean | null;
    comment: string | null;
    climb_name: string | null;
    setter_username: string | null;
    layout_id: number | null;
    frames: string | null;
    difficulty_name: string | null;
  }> }).rows;

  if (rows.length === 0) return null;

  // Build ticks
  const ticks: SessionDetailTick[] = rows.map((r) => ({
    uuid: r.uuid,
    climbUuid: r.climb_uuid,
    climbName: r.climb_name || null,
    boardType: r.board_type,
    layoutId: r.layout_id,
    angle: r.angle,
    status: r.status,
    attemptCount: r.attempt_count,
    difficulty: r.difficulty,
    difficultyName: r.difficulty_name || null,
    quality: r.quality,
    isMirror: r.is_mirror ?? false,
    isBenchmark: r.is_benchmark ?? false,
    comment: r.comment || null,
    frames: r.frames || null,
    setterUsername: r.setter_username || null,
    climbedAt: typeof r.climbed_at === 'object' ? (r.climbed_at as Date).toISOString() : String(r.climbed_at),
  }));

  // Compute aggregates
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const boardTypes = [...new Set(rows.map((r) => r.board_type))];

  let totalSends = 0;
  let totalFlashes = 0;
  let totalAttempts = 0;
  for (const row of rows) {
    if (row.status === 'flash') { totalFlashes++; totalSends++; }
    else if (row.status === 'send') { totalSends++; }
    else if (row.status === 'attempt') { totalAttempts++; }
  }

  const participants = await fetchParticipants(sessionId, 'ungrouped', userIds, ungroupedFilter);
  const gradeDistribution = buildGradeDistributionFromTicks(
    rows.map((r) => ({
      tick: { status: r.status, difficulty: r.difficulty, boardType: r.board_type },
      difficultyName: r.difficulty_name,
    })),
  );

  // Timestamps
  const sortedRows = [...rows].sort(
    (a, b) => new Date(a.climbed_at).getTime() - new Date(b.climbed_at).getTime(),
  );
  const firstTickAt = typeof sortedRows[0].climbed_at === 'object'
    ? (sortedRows[0].climbed_at as Date).toISOString()
    : String(sortedRows[0].climbed_at);
  const lastTickAt = typeof sortedRows[sortedRows.length - 1].climbed_at === 'object'
    ? (sortedRows[sortedRows.length - 1].climbed_at as Date).toISOString()
    : String(sortedRows[sortedRows.length - 1].climbed_at);
  const durationMinutes = Math.round(
    (new Date(lastTickAt).getTime() - new Date(firstTickAt).getTime()) / 60000,
  ) || null;

  // Hardest grade
  const gradesSorted = rows
    .filter((r) => r.difficulty_name && (r.status === 'flash' || r.status === 'send'))
    .sort((a, b) => (b.difficulty ?? 0) - (a.difficulty ?? 0));
  const hardestGrade = gradesSorted.length > 0 ? gradesSorted[0].difficulty_name : null;

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

  return {
    sessionId,
    sessionType: 'inferred',
    sessionName: null,
    participants,
    totalSends,
    totalFlashes,
    totalAttempts,
    tickCount: rows.length,
    gradeDistribution,
    boardTypes,
    hardestGrade,
    firstTickAt,
    lastTickAt,
    durationMinutes,
    goal: null,
    ticks,
    upvotes: voteData ? Number(voteData.upvotes) : 0,
    downvotes: voteData ? Number(voteData.downvotes) : 0,
    voteScore: voteData ? Number(voteData.score) : 0,
    commentCount: commentData ? Number(commentData.count) : 0,
  };
}
