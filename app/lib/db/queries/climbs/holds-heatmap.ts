import { and, eq, sql } from 'drizzle-orm';
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
  const climbHolds = tables.climbHolds;

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

    let holdStats: Record<string, unknown>[];

    if (personalProgressFiltersEnabled && userId) {
      // When personal progress filters are active, we need to compute user-specific hold statistics
      // Since the filters already limit climbs to user's attempted/completed ones,
      // we can use the same base query but the results will be user-filtered
      const baseQuery = db
        .select({
          holdId: climbHolds.holdId,
          totalUses: sql<number>`COUNT(DISTINCT ${climbHolds.climbUuid})`,
          totalAscents: sql<number>`COUNT(DISTINCT ${climbHolds.climbUuid})`, // For user mode, this represents user's climb count per hold
          startingUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'STARTING' THEN 1 ELSE 0 END)`,
          handUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'HAND' THEN 1 ELSE 0 END)`,
          footUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FOOT' THEN 1 ELSE 0 END)`,
          finishUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FINISH' THEN 1 ELSE 0 END)`,
          averageDifficulty: sql<number>`AVG(${tables.climbStats.displayDifficulty})`,
        })
        .from(climbHolds)
        .innerJoin(tables.climbs, eq(tables.climbs.uuid, climbHolds.climbUuid))
        .innerJoin(ps, eq(ps.id, params.size_id))
        .leftJoin(
          tables.climbStats,
          and(eq(tables.climbStats.climbUuid, climbHolds.climbUuid), eq(tables.climbStats.angle, params.angle)),
        )
        .where(
          and(...filters.getClimbWhereConditions(), ...filters.getSizeConditions(), ...filters.getClimbStatsConditions()),
        )
        .groupBy(climbHolds.holdId);

      holdStats = await baseQuery;
    } else {
      // Use global community stats when no personal progress filters are active
      const baseQuery = db
        .select({
          holdId: climbHolds.holdId,
          totalUses: sql<number>`COUNT(DISTINCT ${climbHolds.climbUuid})`,
          totalAscents: sql<number>`SUM(${tables.climbStats.ascensionistCount})`,
          startingUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'STARTING' THEN 1 ELSE 0 END)`,
          handUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'HAND' THEN 1 ELSE 0 END)`,
          footUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FOOT' THEN 1 ELSE 0 END)`,
          finishUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FINISH' THEN 1 ELSE 0 END)`,
          averageDifficulty: sql<number>`AVG(${tables.climbStats.displayDifficulty})`,
        })
        .from(climbHolds)
        .innerJoin(tables.climbs, eq(tables.climbs.uuid, climbHolds.climbUuid))
        .innerJoin(ps, eq(ps.id, params.size_id))
        .leftJoin(
          tables.climbStats,
          and(eq(tables.climbStats.climbUuid, climbHolds.climbUuid), eq(tables.climbStats.angle, params.angle)),
        )
        .where(
          and(...filters.getClimbWhereConditions(), ...filters.getSizeConditions(), ...filters.getClimbStatsConditions()),
        )
        .groupBy(climbHolds.holdId);

      holdStats = await baseQuery;
    }

    // Add user-specific data only if not already computed in the main query
    if (userId && !personalProgressFiltersEnabled) {
      // Only fetch separate user data if we're not already using user-specific main stats
      const ascentsTableName = getTableName(params.board_name, 'ascents');
      const bidsTableName = getTableName(params.board_name, 'bids');
      const climbHoldsTableName = getTableName(params.board_name, 'climb_holds');

      // Query for user ascents per hold
      const userAscentsQuery = await db.execute(sql`
        SELECT ch.hold_id, COUNT(*) as user_ascents
        FROM ${sql.identifier(ascentsTableName)} a
        JOIN ${sql.identifier(climbHoldsTableName)} ch ON a.climb_uuid = ch.climb_uuid
        WHERE a.user_id = ${userId}
          AND a.angle = ${params.angle}
        GROUP BY ch.hold_id
      `);

      const userAttemptsQuery = await db.execute(sql`
        SELECT ch.hold_id, SUM(attempt_count) as user_attempts
        FROM (
          -- Get bid_count from bids table
          SELECT b.climb_uuid, b.bid_count as attempt_count
          FROM ${sql.identifier(bidsTableName)} b
          WHERE b.user_id = ${userId}
            AND b.angle = ${params.angle}
          
          UNION ALL
          
          -- Get bid_count from ascents table
          SELECT a.climb_uuid, a.bid_count as attempt_count
          FROM ${sql.identifier(ascentsTableName)} a
          WHERE a.user_id = ${userId}
            AND a.angle = ${params.angle}
        ) attempts
        JOIN ${sql.identifier(climbHoldsTableName)} ch ON attempts.climb_uuid = ch.climb_uuid
        GROUP BY ch.hold_id
      `);

      // Convert results to Maps for easier lookup
      const ascentsMap = new Map();
      const attemptsMap = new Map();

      for (const row of userAscentsQuery.rows) {
        ascentsMap.set(Number(row.hold_id), Number(row.user_ascents));
      }

      for (const row of userAttemptsQuery.rows) {
        attemptsMap.set(Number(row.hold_id), Number(row.user_attempts));
      }

      // Merge the user data with the hold stats
      holdStats = holdStats.map((stat) => ({
        ...stat,
        userAscents: ascentsMap.get(Number(stat.holdId)) || 0,
        userAttempts: attemptsMap.get(Number(stat.holdId)) || 0,
      }));
    } else if (personalProgressFiltersEnabled && userId) {
      // When using personal progress filters, the main stats ARE the user stats,
      // but we still need to provide the userAscents and userAttempts fields
      // for backward compatibility with the frontend
      holdStats = holdStats.map((stat) => ({
        ...stat,
        userAscents: Number(stat.totalAscents) || 0,
        userAttempts: Number(stat.totalUses) || 0, // Use totalUses as attempts when in user mode
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
