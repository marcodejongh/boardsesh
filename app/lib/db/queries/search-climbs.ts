import { and, eq, between, gte, sql, is, desc, asc } from 'drizzle-orm';
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
  // TODO: use nicer table abstraction from shared syncs here
  const tables = getBoardTables(params.board_name);
  
  // Define sort columns with explicit SQL expressions where needed
  const allowedSortColumns: Record<SearchRequest['sortBy'], any> = {
    ascents: tables.climbStats.ascensionistCount,
    difficulty: sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0)`,
    name: tables.climbs.name,
    quality: tables.climbStats.qualityAverage,
  };

  // Get the selected sort column or fall back to ascensionist_count
  const sortColumn = allowedSortColumns[searchParams.sortBy] || tables.climbStats.ascensionistCount;
  
  const ps = alias(tables.productSizes, 'ps');

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

  // Add optional conditions only if the parameters are defined
  if (searchParams.minAscents) {
    whereConditions.push(gte(tables.climbStats.ascensionistCount, searchParams.minAscents));
  }

  if (searchParams.minGrade && searchParams.maxGrade) {
    whereConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) BETWEEN ${searchParams.minGrade} AND ${searchParams.maxGrade}`,
    );
  } else if (searchParams.minGrade) {
    whereConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) >= ${searchParams.minGrade}`,
    );
  } else if (searchParams.maxGrade) {
    whereConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) <= ${searchParams.maxGrade}`,
    );
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
    .leftJoin(
      tables.climbStats,
      and(eq(tables.climbStats.climbUuid, tables.climbs.uuid), eq(tables.climbStats.angle, params.angle)),
    )
    .leftJoin(
      tables.difficultyGrades,
      eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
    )
    .innerJoin(ps, eq(ps.id, params.size_id))
    .where(and(...whereConditions))
    .orderBy(
      searchParams.sortOrder === 'asc' ? sql`${sortColumn} ASC NULLS FIRST` : sql`${sortColumn} DESC NULLS LAST`,
      // Add secondary sort to ensure consistent ordering
      desc(tables.climbs.uuid),
    )
    .limit(searchParams.pageSize)
    .offset(searchParams.page * searchParams.pageSize);

  const results = await baseQuery;

  // Transform the results into the complete Climb type
  const climbs: Climb[] = results.map((result) => ({
    uuid: result.uuid,
    setter_username: result.setter_username || '',
    name: result.name || '',
    description: result.description || '',
    frames: result.frames || '',
    angle: Number(params.angle),
    ascensionist_count: Number(result.ascensionist_count),
    difficulty: result.difficulty || '',
    quality_average: result.quality_average?.toString(),
    stars: Math.round((result.quality_average || 0) * 5),
    difficulty_error: result.difficulty_error?.toString(),
    benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
    // TODO: Multiframe support should remove the hardcoded [0]
    litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', params.board_name)[0],
  }));

  return {
    climbs: climbs,
    totalCount: results.length > 0 ? Number(results[0].totalCount) : 0,
  };
};