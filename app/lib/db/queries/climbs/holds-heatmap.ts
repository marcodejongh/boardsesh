import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters } from './create-climb-filters';

export interface HoldHeatmapData {
  holdId: number;
  totalUses: number;
  startingUses: number;
  totalAscents: number;
  handUses: number;
  footUses: number;
  finishUses: number;
  averageDifficulty: number | null;
}

export const getHoldHeatmapData = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<HoldHeatmapData[]> => {
  const tables = getBoardTables(params.board_name);
  const climbHolds = tables.climbHolds;

  // Create the product sizes alias
  const ps = alias(tables.productSizes, 'ps');

  // Use the shared filter creator with the PS alias
  const filters = createClimbFilters(tables, params, searchParams, ps);

  try {
    // We'll use a more direct approach that mirrors the search climbs query
    // This ensures all filtering conditions are applied consistently
    const holdStats = await db
      .select({
        holdId: climbHolds.holdId,
        totalUses: sql<number>`count(*)`,
        totalAscents: sql<number>`sum(${tables.climbStats.ascensionistCount})`,
        startingUses: sql<number>`sum(case when ${climbHolds.holdState} = 'STARTING' then 1 else 0 end)`,
        handUses: sql<number>`sum(case when ${climbHolds.holdState} = 'HAND' then 1 else 0 end)`,
        footUses: sql<number>`sum(case when ${climbHolds.holdState} = 'FOOT' then 1 else 0 end)`,
        finishUses: sql<number>`sum(case when ${climbHolds.holdState} = 'FINISH' then 1 else 0 end)`,
        averageDifficulty: sql<number>`avg(${tables.climbStats.displayDifficulty})`,
      })
      .from(climbHolds)
      .innerJoin(tables.climbs, eq(tables.climbs.uuid, climbHolds.climbUuid))
      .innerJoin(ps, eq(ps.id, params.size_id))
      .leftJoin(
        tables.climbStats,
        and(eq(tables.climbStats.climbUuid, climbHolds.climbUuid), eq(tables.climbStats.angle, params.angle)),
      )
      .where(
        and(
          // Apply the same base conditions as search query
          ...filters.getClimbWhereConditions(),
          // Add product size-specific conditions
          ...filters.getSizeConditions(),
          // Apply the climb stats conditions in WHERE clause
          ...filters.getClimbStatsConditions(),
        ),
      )
      .groupBy(climbHolds.holdId);

    return holdStats.map(normalizeStats);
  } catch (error) {
    console.error('Error in getHoldHeatmapData:', error);
    throw error;
  }
};

function normalizeStats(stats: Record<string, number>): HoldHeatmapData {
  return {
    holdId: Number(stats.holdId),
    totalUses: Number(stats.totalUses || 0),
    totalAscents: Number(stats.totalAscents || 0),
    startingUses: Number(stats.startingUses || 0),
    handUses: Number(stats.handUses || 0),
    footUses: Number(stats.footUses || 0),
    finishUses: Number(stats.finishUses || 0),
    averageDifficulty: stats.averageDifficulty ? Number(stats.averageDifficulty) : null,
  };
}
