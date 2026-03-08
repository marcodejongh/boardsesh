import { eq, sql } from 'drizzle-orm';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers';
import { TrendingClimbFeedInputSchema } from '../../../validation/schemas';
import type { TrendingClimbItem, TrendingClimbFeedResult } from '@boardsesh/shared-schema';

async function resolveBoardFilter(boardUuid: string | null | undefined) {
  if (!boardUuid) return { boardTypeFilter: null, layoutIdFilter: null };

  const board = await db
    .select({ boardType: dbSchema.userBoards.boardType, layoutId: dbSchema.userBoards.layoutId })
    .from(dbSchema.userBoards)
    .where(eq(dbSchema.userBoards.uuid, boardUuid))
    .limit(1)
    .then(rows => rows[0]);

  return {
    boardTypeFilter: board?.boardType ?? null,
    layoutIdFilter: board?.layoutId ?? null,
  };
}

async function queryTrendingOrHot(
  input: Record<string, unknown> | undefined,
  mode: 'trending' | 'hot',
): Promise<TrendingClimbFeedResult> {
  const validated = validateInput(TrendingClimbFeedInputSchema, input || {}, 'input');
  const limit = validated.limit ?? 20;
  const offset = validated.offset ?? 0;
  const days = validated.timePeriodDays ?? 7;

  const { boardTypeFilter, layoutIdFilter } = await resolveBoardFilter(validated.boardUuid);

  const boardFilterSql = boardTypeFilter
    ? sql`AND h.board_type = ${boardTypeFilter}`
    : sql``;

  const layoutFilterSql = layoutIdFilter !== null
    ? sql`AND c.layout_id = ${layoutIdFilter}`
    : sql``;

  // For trending: exclude climbs that went from 0 ascents (pct change is meaningless)
  // For hot: include all climbs with increases
  const trendingFilter = mode === 'trending'
    ? sql`AND f_ascensionist_count > 0`
    : sql``;

  const orderBy = mode === 'trending'
    ? sql`ascent_pct_change DESC NULLS LAST`
    : sql`ascent_delta DESC`;

  type TrendingRow = {
    climb_uuid: string;
    angle: number;
    board_type: string;
    current_ascents: number;
    ascent_delta: number;
    ascent_pct_change: number | null;
    climb_name: string | null;
    setter_username: string | null;
    layout_id: number;
    frames: string | null;
    quality_average: number | null;
    difficulty_name: string | null;
  };

  // db.execute() returns QueryResult (neon-serverless) with .rows property
  const result = await db.execute(sql`
    WITH stats_window AS (
      SELECT
        h.climb_uuid,
        h.angle,
        h.ascensionist_count,
        h.board_type,
        ROW_NUMBER() OVER (PARTITION BY h.climb_uuid, h.angle ORDER BY h.created_at ASC) as rn_first,
        ROW_NUMBER() OVER (PARTITION BY h.climb_uuid, h.angle ORDER BY h.created_at DESC) as rn_last
      FROM board_climb_stats_history h
      WHERE h.created_at >= NOW() - (${days} || ' days')::interval
        ${boardFilterSql}
    ),
    deltas AS (
      SELECT
        f.climb_uuid,
        f.angle,
        f.board_type,
        l.ascensionist_count AS current_ascents,
        (l.ascensionist_count - f.ascensionist_count) AS ascent_delta,
        CASE
          WHEN f.ascensionist_count > 0
          THEN ((l.ascensionist_count - f.ascensionist_count)::float / f.ascensionist_count) * 100
          ELSE NULL
        END AS ascent_pct_change,
        f.ascensionist_count AS f_ascensionist_count
      FROM
        (SELECT * FROM stats_window WHERE rn_first = 1) f
        JOIN (SELECT * FROM stats_window WHERE rn_last = 1) l
          ON f.climb_uuid = l.climb_uuid AND f.angle = l.angle
      WHERE l.ascensionist_count > f.ascensionist_count
        AND (l.ascensionist_count - f.ascensionist_count) >= 2
        ${trendingFilter}
    )
    SELECT
      d.climb_uuid,
      d.angle,
      d.board_type,
      d.current_ascents,
      d.ascent_delta,
      d.ascent_pct_change,
      c.name AS climb_name,
      c.setter_username,
      c.layout_id,
      c.frames,
      s.quality_average,
      g.boulder_name AS difficulty_name
    FROM deltas d
    JOIN board_climbs c
      ON c.uuid = d.climb_uuid AND c.board_type = d.board_type
    LEFT JOIN board_climb_stats s
      ON s.climb_uuid = d.climb_uuid AND s.angle = d.angle AND s.board_type = d.board_type
    LEFT JOIN board_difficulty_grades g
      ON g.board_type = d.board_type AND g.difficulty = s.display_difficulty
    WHERE 1=1
      ${layoutFilterSql}
    ORDER BY ${orderBy}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `);

  const rows = (result as unknown as { rows: TrendingRow[] }).rows;
  const hasMore = rows.length > limit;
  const items: TrendingClimbItem[] = rows.slice(0, limit).map((row) => ({
    climbUuid: row.climb_uuid,
    climbName: row.climb_name || 'Unknown',
    setterUsername: row.setter_username,
    boardType: row.board_type,
    layoutId: Number(row.layout_id),
    angle: Number(row.angle),
    frames: row.frames,
    difficultyName: row.difficulty_name,
    qualityAverage: row.quality_average != null ? Number(row.quality_average) : null,
    currentAscents: Number(row.current_ascents),
    ascentDelta: Number(row.ascent_delta),
    ascentPctChange: row.ascent_pct_change != null ? Number(row.ascent_pct_change) : null,
  }));

  // Get total count (separate query for efficiency)
  const countResult = await db.execute(sql`
    WITH stats_window AS (
      SELECT
        h.climb_uuid,
        h.angle,
        h.ascensionist_count,
        h.board_type,
        ROW_NUMBER() OVER (PARTITION BY h.climb_uuid, h.angle ORDER BY h.created_at ASC) as rn_first,
        ROW_NUMBER() OVER (PARTITION BY h.climb_uuid, h.angle ORDER BY h.created_at DESC) as rn_last
      FROM board_climb_stats_history h
      WHERE h.created_at >= NOW() - (${days} || ' days')::interval
        ${boardFilterSql}
    ),
    deltas AS (
      SELECT
        f.climb_uuid,
        f.angle,
        f.board_type,
        (l.ascensionist_count - f.ascensionist_count) AS ascent_delta,
        f.ascensionist_count AS f_ascensionist_count
      FROM
        (SELECT * FROM stats_window WHERE rn_first = 1) f
        JOIN (SELECT * FROM stats_window WHERE rn_last = 1) l
          ON f.climb_uuid = l.climb_uuid AND f.angle = l.angle
      WHERE l.ascensionist_count > f.ascensionist_count
        AND (l.ascensionist_count - f.ascensionist_count) >= 2
        ${trendingFilter}
    )
    SELECT COUNT(*) as total
    FROM deltas d
    JOIN board_climbs c
      ON c.uuid = d.climb_uuid AND c.board_type = d.board_type
    WHERE 1=1
      ${layoutFilterSql}
  `);

  const countRows = (countResult as unknown as { rows: Array<{ total: number }> }).rows;
  const totalCount = Number(countRows[0]?.total ?? 0);

  return { items, totalCount, hasMore };
}

export const trendingFeedQueries = {
  trendingClimbs: async (
    _: unknown,
    { input }: { input?: Record<string, unknown> },
  ) => queryTrendingOrHot(input, 'trending'),

  hotClimbs: async (
    _: unknown,
    { input }: { input?: Record<string, unknown> },
  ) => queryTrendingOrHot(input, 'hot'),
};
