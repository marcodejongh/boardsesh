import { and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters } from './create-climb-filters';
import { getTableName } from '@/app/lib/data-sync/aurora/getTableName';

export interface HoldHeatmapData {
  holdId: number;
  totalUses: number;
  startingUses: number;
  totalAscents: number;
  handUses: number;
  footUses: number;
  finishUses: number;
  averageDifficulty: number | null;
  userAscents?: number;
  userAttempts?: number;
}

export const getHoldHeatmapData = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  userId?: number,
): Promise<HoldHeatmapData[]> => {
  const tables = getBoardTables(params.board_name);

  // Create the product sizes alias
  const ps = alias(tables.productSizes, 'ps');

  // Use the shared filter creator with the PS alias
  const filters = createClimbFilters(tables, params, searchParams, ps, userId);

  try {
    // Check if personal progress filters are active - if so, use user-specific counts
    const personalProgressFiltersEnabled =
      searchParams.hideAttempted ||
      searchParams.hideCompleted ||
      searchParams.showOnlyAttempted ||
      searchParams.showOnlyCompleted;

    // Build the WHERE clause conditions
    const whereConditions = and(
      ...filters.getClimbWhereConditions(),
      ...filters.getSizeConditions(),
      ...filters.getClimbStatsConditions(),
    );

    // Get table names for raw SQL
    const climbHoldsTableName = getTableName(params.board_name, 'climb_holds');
    const climbsTableName = getTableName(params.board_name, 'climbs');
    const climbStatsTableName = getTableName(params.board_name, 'climb_stats');
    const productSizesTableName = getTableName(params.board_name, 'product_sizes');
    const ascentsTableName = getTableName(params.board_name, 'ascents');
    const bidsTableName = getTableName(params.board_name, 'bids');

    // Build user data subqueries if user is logged in
    // Use MAX() since user subqueries are pre-aggregated per hold_id
    const userAscentsSelect = userId && !personalProgressFiltersEnabled
      ? sql`, COALESCE(MAX(ua.user_ascents), 0) as "userAscents"`
      : sql``;

    const userAttemptsSelect = userId && !personalProgressFiltersEnabled
      ? sql`, COALESCE(MAX(ut.user_attempts), 0) as "userAttempts"`
      : sql``;

    const userAscentsJoin = userId && !personalProgressFiltersEnabled
      ? sql`
        LEFT JOIN (
          SELECT ch_ua.hold_id, COUNT(*) as user_ascents
          FROM ${sql.identifier(ascentsTableName)} a_ua
          JOIN ${sql.identifier(climbHoldsTableName)} ch_ua ON a_ua.climb_uuid = ch_ua.climb_uuid
          WHERE a_ua.user_id = ${userId}
            AND a_ua.angle = ${params.angle}
          GROUP BY ch_ua.hold_id
        ) ua ON ua.hold_id = ch.hold_id`
      : sql``;

    const userAttemptsJoin = userId && !personalProgressFiltersEnabled
      ? sql`
        LEFT JOIN (
          SELECT ch_ut.hold_id, SUM(attempt_count) as user_attempts
          FROM (
            SELECT b.climb_uuid, b.bid_count as attempt_count
            FROM ${sql.identifier(bidsTableName)} b
            WHERE b.user_id = ${userId}
              AND b.angle = ${params.angle}
            UNION ALL
            SELECT a.climb_uuid, a.bid_count as attempt_count
            FROM ${sql.identifier(ascentsTableName)} a
            WHERE a.user_id = ${userId}
              AND a.angle = ${params.angle}
          ) attempts_sub
          JOIN ${sql.identifier(climbHoldsTableName)} ch_ut ON attempts_sub.climb_uuid = ch_ut.climb_uuid
          GROUP BY ch_ut.hold_id
        ) ut ON ut.hold_id = ch.hold_id`
      : sql``;

    // Build the optimized single query using raw SQL for better performance
    const ascentsField = personalProgressFiltersEnabled && userId
      ? sql`COUNT(DISTINCT ch.climb_uuid)`  // For user mode, count unique climbs per hold
      : sql`SUM(COALESCE(cs.ascensionist_count, 0))`;

    // Construct the full query
    const result = await db.execute(sql`
      SELECT
        ch.hold_id as "holdId",
        COUNT(DISTINCT ch.climb_uuid) as "totalUses",
        ${ascentsField} as "totalAscents",
        SUM(CASE WHEN ch.hold_state = 'STARTING' THEN 1 ELSE 0 END) as "startingUses",
        SUM(CASE WHEN ch.hold_state = 'HAND' THEN 1 ELSE 0 END) as "handUses",
        SUM(CASE WHEN ch.hold_state = 'FOOT' THEN 1 ELSE 0 END) as "footUses",
        SUM(CASE WHEN ch.hold_state = 'FINISH' THEN 1 ELSE 0 END) as "finishUses",
        AVG(cs.display_difficulty) as "averageDifficulty"
        ${userAscentsSelect}
        ${userAttemptsSelect}
      FROM ${sql.identifier(climbHoldsTableName)} ch
      INNER JOIN ${sql.identifier(climbsTableName)} c ON c.uuid = ch.climb_uuid
      INNER JOIN ${sql.identifier(productSizesTableName)} ps ON ps.id = ${params.size_id}
      LEFT JOIN ${sql.identifier(climbStatsTableName)} cs ON cs.climb_uuid = ch.climb_uuid AND cs.angle = ${params.angle}
      ${userAscentsJoin}
      ${userAttemptsJoin}
      WHERE ${whereConditions}
      GROUP BY ch.hold_id
    `);

    let holdStats = result.rows as Record<string, unknown>[];

    // Handle personal progress mode field mapping
    if (personalProgressFiltersEnabled && userId) {
      holdStats = holdStats.map((stat) => ({
        ...stat,
        userAscents: Number(stat.totalAscents) || 0,
        userAttempts: Number(stat.totalUses) || 0,
      }));
    }

    return holdStats.map((stats) => normalizeStats(stats, userId));
  } catch (error) {
    console.error('Error in getHoldHeatmapData:', error);
    throw error;
  }
};

function normalizeStats(stats: Record<string, unknown>, userId?: number): HoldHeatmapData {
  // For numeric fields, ensure we're returning a number and handle null/undefined properly
  const result: HoldHeatmapData = {
    holdId: Number(stats.holdId),
    totalUses: Number(stats.totalUses || 0),
    totalAscents: Number(stats.totalAscents || 0),
    startingUses: Number(stats.startingUses || 0),
    handUses: Number(stats.handUses || 0),
    footUses: Number(stats.footUses || 0),
    finishUses: Number(stats.finishUses || 0),
    averageDifficulty: stats.averageDifficulty ? Number(stats.averageDifficulty) : null,
  };

  // Add user-specific fields if userId was provided
  if (userId) {
    result.userAscents = Number(stats.userAscents || 0);
    result.userAttempts = Number(stats.userAttempts || 0);
  }

  return result;
}
