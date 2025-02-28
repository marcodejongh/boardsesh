import { and, eq, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { dbz as db } from '@/app/lib/db/db';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { Climb, ParsedBoardRouteParameters, SearchClimbsResult, SearchRequestPagination } from '@/app/lib/types';
import { SearchRequest } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters } from './create-climb-filters';

export const searchClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<SearchClimbsResult> => {
  const tables = getBoardTables(params.board_name);

  // Create the product sizes alias
  const ps = alias(tables.productSizes, 'ps');

  // Use the shared filter creator with the PS alias
  const filters = createClimbFilters(tables, params, searchParams, ps);

  // Define sort columns with explicit SQL expressions where needed
  const allowedSortColumns: Record<SearchRequest['sortBy'], any> = {
    ascents: tables.climbStats.ascensionistCount,
    difficulty: sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0)`,
    name: tables.climbs.name,
    quality: tables.climbStats.qualityAverage,
  };

  // Get the selected sort column or fall back to ascensionist_count
  const sortColumn = allowedSortColumns[searchParams.sortBy] || tables.climbStats.ascensionistCount;

  const whereConditions = [
    ...filters.getClimbWhereConditions(),
    ...filters.getSizeConditions(),
    // Apply climb stats filters in WHERE clause rather than in the JOIN condition
    ...filters.getClimbStatsConditions().map(
      (condition) =>
        // Handle the case where climb_stats might be NULL
        sql`(${tables.climbStats.climbUuid} IS NOT NULL AND ${condition})`,
    ),
  ];

  try {
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
      .leftJoin(tables.climbStats, and(...filters.getClimbStatsJoinConditions()))
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
      ascensionist_count: Number(result.ascensionist_count || 0),
      difficulty: result.difficulty || '',
      quality_average: result.quality_average?.toString() || '0',
      stars: Math.round((result.quality_average || 0) * 5),
      difficulty_error: result.difficulty_error?.toString() || '0',
      benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
      // TODO: Multiframe support should remove the hardcoded [0]
      litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', params.board_name)[0],
    }));

    return {
      climbs: climbs,
      totalCount: results.length > 0 ? Number(results[0].totalCount) : 0,
    };
  } catch (error) {
    console.error('Error in searchClimbs:', error);
    throw error;
  }
};
