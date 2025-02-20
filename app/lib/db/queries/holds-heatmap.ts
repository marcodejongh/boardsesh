import { and, eq, between, gte, sql, like, notLike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dbz as db } from '../db';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '../../types';
import { getBoardTables } from './util/table-select';

export interface HoldHeatmapData {
  holdId: number;
  totalUses: number;
  startingUses: number;
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
  const ps = alias(tables.productSizes, 'ps');
  const climbHolds = tables.climbHolds;

  // Process holds filters
  const { anyHolds, notHolds } = processHoldFilters(searchParams.holdsFilter);

  try {
    // First get the filtered climbs subquery
    const filteredClimbsSubquery = db
      .select({ uuid: tables.climbs.uuid })
      .from(tables.climbs)
      .innerJoin(ps, eq(ps.id, params.size_id))
      .where(
        and(
          eq(tables.climbs.layoutId, params.layout_id),
          eq(tables.climbs.isListed, true),
          eq(tables.climbs.isDraft, false),
          eq(tables.climbs.framesCount, 1),
          sql`${tables.climbs.edgeLeft} > ${ps.edgeLeft}`,
          sql`${tables.climbs.edgeRight} < ${ps.edgeRight}`,
          sql`${tables.climbs.edgeBottom} > ${ps.edgeBottom}`,
          sql`${tables.climbs.edgeTop} < ${ps.edgeTop}`,
          ...anyHolds.map((holdId) => like(tables.climbs.frames, `%${holdId}r%`)),
          ...notHolds.map((holdId) => notLike(tables.climbs.frames, `%${holdId}r%`)),
        ),
      )
      .as('filtered_climbs');

    // Main query using the filtered climbs
    const holdStats = await db
      .select({
        holdId: climbHolds.holdId,
        totalUses: sql<number>`count(*)`,
        startingUses: sql<number>`sum(case when ${climbHolds.holdState} = 'STARTING' then 1 else 0 end)`,
        handUses: sql<number>`sum(case when ${climbHolds.holdState} = 'HAND' then 1 else 0 end)`,
        footUses: sql<number>`sum(case when ${climbHolds.holdState} = 'FOOT' then 1 else 0 end)`,
        finishUses: sql<number>`sum(case when ${climbHolds.holdState} = 'FINISH' then 1 else 0 end)`,
        averageDifficulty: sql<number>`avg(${tables.climbStats.displayDifficulty})`,
      })
      .from(climbHolds)
      .innerJoin(filteredClimbsSubquery, eq(filteredClimbsSubquery.uuid, climbHolds.climbUuid))
      .leftJoin(
        tables.climbStats,
        and(
          eq(tables.climbStats.climbUuid, climbHolds.climbUuid), 
          eq(tables.climbStats.angle, params.angle),
          ...buildClimbStatsSearchConditions(tables, searchParams)
        ),
      )
      .groupBy(climbHolds.holdId);

    return holdStats.map(normalizeStats);
  } catch (error) {
    console.error('Error in getHoldHeatmapData:', error);
    throw error;
  }
};

// Helper functions
function processHoldFilters(holdsFilter: Record<string, string>) {
  return Object.entries(holdsFilter).reduce(
    (acc, [key, state]) => {
      const holdId = Number(key.replace('hold_', ''));
      if (state === 'ANY') acc.anyHolds.push(holdId);
      if (state === 'NOT') acc.notHolds.push(holdId);
      return acc;
    },
    { anyHolds: [] as number[], notHolds: [] as number[] },
  );
}

function buildClimbStatsSearchConditions(tables: any, searchParams: SearchRequestPagination) {
  const conditions = [];

  if (searchParams.minAscents) {
    conditions.push(gte(tables.climbStats.ascensionistCount, searchParams.minAscents));
  }

  if (searchParams.minGrade && searchParams.maxGrade) {
    conditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) BETWEEN ${searchParams.minGrade} AND ${searchParams.maxGrade}`,
    );
  } else if (searchParams.minGrade) {
    conditions.push(sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) >= ${searchParams.minGrade}`);
  } else if (searchParams.maxGrade) {
    conditions.push(sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) <= ${searchParams.maxGrade}`);
  }

  if (searchParams.minRating) {
    conditions.push(sql`${tables.climbStats.qualityAverage} >= ${searchParams.minRating}`);
  }

  if (searchParams.gradeAccuracy) {
    conditions.push(
      sql`ABS(ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) - ${tables.climbStats.difficultyAverage}::numeric) <= ${searchParams.gradeAccuracy}`,
    );
  }

  return conditions;
}

function normalizeStats(stats: any): HoldHeatmapData {
  return {
    holdId: Number(stats.holdId),
    totalUses: Number(stats.totalUses || 0),
    startingUses: Number(stats.startingUses || 0),
    handUses: Number(stats.handUses || 0),
    footUses: Number(stats.footUses || 0),
    finishUses: Number(stats.finishUses || 0),
    averageDifficulty: stats.averageDifficulty ? Number(stats.averageDifficulty) : null,
  };
}
