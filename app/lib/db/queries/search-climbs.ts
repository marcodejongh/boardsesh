import { and, eq, between, gte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dbz as db } from '../db';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import {
  Climb,
  ParsedBoardRouteParameters,
  SearchClimbsResult,
  SearchRequest,
  SearchRequestPagination,
} from '../../types';
import { getBoardTables } from './util/table-select';

export const searchClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<SearchClimbsResult> => {
  const allowedSortColumns: Record<SearchRequest['sortBy'], string> = {
    ascents: 'ascensionist_count',
    difficulty: 'display_difficulty',
    name: 'name',
    quality: 'quality_average',
  };

  const safeSortBy = allowedSortColumns[searchParams.sortBy] || 'ascensionist_count';

  const tables = getBoardTables(params.board_name);
  const ps = alias(tables.productSizes, 'ps');

  const baseQuery = db
    .select({
      uuid: tables.climbs.uuid,
      setter_username: tables.climbs.setterUsername,
      name: tables.climbs.name,
      description: tables.climbs.description,
      frames: tables.climbs.frames,
      angle: tables.climbStats.angle,
      ascensionist_count: tables.climbStats.ascensionistCount,
      difficulty: tables.difficultyGrades.boulderName,
      quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
      difficulty_error: sql<number>`ROUND(${tables.climbStats.difficultyAverage}::numeric - ${tables.climbStats.displayDifficulty}::numeric, 2)`,
      benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
      totalCount: sql<number>`count(*) over()`,
    })
    .from(tables.climbs)
    .leftJoin(tables.climbStats, eq(tables.climbStats.climbUuid, tables.climbs.uuid))
    .leftJoin(
      tables.difficultyGrades,
      eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
    )
    .innerJoin(ps, eq(ps.id, params.size_id))
    .where(
      and(
        eq(tables.climbs.layoutId, params.layout_id),
        eq(tables.climbs.isListed, true),
        eq(tables.climbs.isDraft, false),
        eq(tables.climbs.framesCount, 1),
        eq(ps.id, params.size_id),
        eq(tables.climbStats.angle, params.angle),
        gte(tables.climbStats.ascensionistCount, searchParams.minAscents),
        sql`${tables.climbs.edgeLeft} > ${ps.edgeLeft}`,
        sql`${tables.climbs.edgeRight} < ${ps.edgeRight}`,
        sql`${tables.climbs.edgeBottom} > ${ps.edgeBottom}`,
        sql`${tables.climbs.edgeTop} < ${ps.edgeTop}`,
        ...(searchParams.minGrade && searchParams.maxGrade
          ? [
              sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) BETWEEN ${searchParams.minGrade} AND ${searchParams.maxGrade}`,
            ]
          : []),
        sql`${tables.climbStats.qualityAverage} >= ${searchParams.minRating}`,
        sql`ABS(ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) - ${tables.climbStats.difficultyAverage}::numeric) <= ${searchParams.gradeAccuracy}`,
        ...(searchParams.name ? [sql`${tables.climbs.name} ILIKE ${`%${searchParams.name}%`}`] : []),
      ),
    )
    .orderBy(sql`${safeSortBy} ${searchParams.sortOrder === 'asc' ? sql`ASC` : sql`DESC`}`, tables.climbs.uuid)
    .limit(searchParams.pageSize)
    .offset(searchParams.page * searchParams.pageSize);

  const results = await baseQuery;

  // Transform the results into the complete Climb type
  const climbs: Climb[] = results.map(({ totalCount, ...result }) => ({
    uuid: result.uuid,
    setter_username: result.setter_username || '',
    name: result.name || '',
    description: result.description || '',
    frames: result.frames || '',
    angle: Number(result.angle),
    ascensionist_count: Number(result.ascensionist_count),
    difficulty: result.difficulty || '',
    quality_average: result.quality_average.toString(),
    stars: Math.round(result.quality_average * 5),
    difficulty_error: result.difficulty_error.toString(),
    benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
    litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', params.board_name),
  }));

  return {
    climbs: climbs,
    totalCount: results.length > 0 ? Number(results[0].totalCount) : 0,
  };
};