// File: app/lib/db/queries/holds-heatmap.ts
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
  const holdsToFilter = Object.entries(searchParams.holdsFilter).map(([key, state]) => [
    key.replace('hold_', ''),
    state,
  ]);
  const anyHolds = holdsToFilter.filter(([, value]) => value === 'ANY').map(([key]) => Number(key));
  const notHolds = holdsToFilter.filter(([, value]) => value === 'NOT').map(([key]) => Number(key));

  // Build where conditions array dynamically
  const whereConditions = [
    eq(tables.climbs.layoutId, params.layout_id),
    eq(tables.climbs.isListed, true),
    eq(tables.climbs.isDraft, false),
    eq(tables.climbs.framesCount, 1),
    eq(ps.id, params.size_id),
    sql`${tables.climbs.edgeLeft} > ${ps.edgeLeft}`,
    sql`${tables.climbs.edgeRight} < ${ps.edgeRight}`,
    sql`${tables.climbs.edgeBottom} > ${ps.edgeBottom}`,
    sql`${tables.climbs.edgeTop} < ${ps.edgeTop}`,
  ];

  // Add optional conditions
  if (searchParams.minAscents) {
    whereConditions.push(gte(tables.climbStats.ascensionistCount, searchParams.minAscents));
  }

  if (searchParams.minGrade && searchParams.maxGrade) {
    whereConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) BETWEEN ${searchParams.minGrade} AND ${searchParams.maxGrade}`,
    );
  } else if (searchParams.minGrade) {
    whereConditions.push(sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) >= ${searchParams.minGrade}`);
  } else if (searchParams.maxGrade) {
    whereConditions.push(sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) <= ${searchParams.maxGrade}`);
  }

  if (searchParams.minRating) {
    whereConditions.push(sql`${tables.climbStats.qualityAverage} >= ${searchParams.minRating}`);
  }

  if (searchParams.gradeAccuracy) {
    whereConditions.push(
      sql`ABS(ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) - ${tables.climbStats.difficultyAverage}::numeric) <= ${searchParams.gradeAccuracy}`,
    );
  }

  if (searchParams.name) {
    whereConditions.push(sql`${tables.climbs.name} ILIKE ${`%${searchParams.name}%`}`);
  }

  // Add hold filters
  whereConditions.push(
    ...anyHolds.map((holdId) => like(tables.climbs.frames, `%${holdId}r%`)),
    ...notHolds.map((holdId) => notLike(tables.climbs.frames, `%${holdId}r%`)),
  );

  try {
    const baseQuery = db
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
      .innerJoin(tables.climbs, eq(tables.climbs.uuid, climbHolds.climbUuid))
      .leftJoin(
        tables.climbStats,
        and(eq(tables.climbStats.climbUuid, climbHolds.climbUuid), eq(tables.climbStats.angle, params.angle)),
      )
      .leftJoin(
        tables.difficultyGrades,
        eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
      )
      .innerJoin(ps, eq(ps.id, params.size_id))
      .where(and(...whereConditions))
      .groupBy(climbHolds.holdId);

    const holdStats = await baseQuery;

    return holdStats.map((stats) => ({
      holdId: Number(stats.holdId),
      totalUses: Number(stats.totalUses || 0),
      startingUses: Number(stats.startingUses || 0),
      handUses: Number(stats.handUses || 0),
      footUses: Number(stats.footUses || 0),
      finishUses: Number(stats.finishUses || 0),
      averageDifficulty: stats.averageDifficulty ? Number(stats.averageDifficulty) : null,
    }));
  } catch (error) {
    console.error('Error in getHoldHeatmapData:', error);
    throw error;
  }
};
