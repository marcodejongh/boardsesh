import { eq, desc, sql, SQL, and } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { Climb, ParsedBoardRouteParameters, SearchClimbsResult, SearchRequestPagination } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters } from './create-climb-filters';
import { getSizeEdges } from './size-edges';

export const searchClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  userId?: number,
): Promise<SearchClimbsResult> => {
  const tables = getBoardTables(params.board_name);

  // Get hardcoded size edges (eliminates database query)
  const sizeEdges = getSizeEdges(params.board_name, params.size_id);
  if (!sizeEdges) {
    return { climbs: [], totalCount: 0 };
  }

  // Use the shared filter creator with static edge values and optional userId
  const filters = createClimbFilters(tables, params, searchParams, sizeEdges, userId);

  // Define sort columns with explicit SQL expressions where needed
  const allowedSortColumns: Record<string, SQL> = {
    ascents: sql`${tables.climbStats.ascensionistCount}`,
    difficulty: sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0)`,
    name: sql`${tables.climbs.name}`,
    quality: sql`${tables.climbStats.qualityAverage}`,
  };

  // Get the selected sort column or fall back to ascensionist_count
  const sortColumn = allowedSortColumns[searchParams.sortBy] || sql`${tables.climbStats.ascensionistCount}`;

  const whereConditions = [
    ...filters.getClimbWhereConditions(),
    ...filters.getSizeConditions(),
    // Apply climb stats filters in WHERE clause rather than in the JOIN condition
    ...filters.getClimbStatsConditions(),
  ];

  try {
    // Base fields for the query
    // Note: count(*) over() removed - use separate countClimbs() for total count
    const baseSelectFields = {
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
    };

    // Add user-specific fields if userId is provided
    const selectFields = userId
      ? {
          ...baseSelectFields,
          userAscents: filters.getUserLogbookSelects().userAscents,
          userAttempts: filters.getUserLogbookSelects().userAttempts,
        }
      : baseSelectFields;

    const baseQuery = db
      .select(selectFields)
      .from(tables.climbs)
      .leftJoin(tables.climbStats, and(...filters.getClimbStatsJoinConditions()))
      .leftJoin(
        tables.difficultyGrades,
        eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
      )
      // Note: product_sizes JOIN eliminated - using pre-fetched sizeEdges constants instead
      .where(and(...whereConditions))
      .orderBy(
        searchParams.sortOrder === 'asc' ? sql`${sortColumn} ASC NULLS FIRST` : sql`${sortColumn} DESC NULLS LAST`,
        // Add secondary sort to ensure consistent ordering
        desc(tables.climbs.uuid),
      )
      // Fetch one extra row to detect if there are more results (hasMore)
      .limit(searchParams.pageSize + 1)
      .offset(searchParams.page * searchParams.pageSize);

    const results = await baseQuery;

    // Check if there are more results available
    const hasMore = results.length > searchParams.pageSize;
    // Only return up to pageSize results
    const trimmedResults = hasMore ? results.slice(0, searchParams.pageSize) : results;

    // Transform the results into the complete Climb type
    const climbs: Climb[] = trimmedResults.map((result) => ({
      uuid: result.uuid,
      setter_username: result.setter_username || '',
      name: result.name || '',
      description: result.description || '',
      frames: result.frames || '',
      angle: Number(params.angle),
      ascensionist_count: Number(result.ascensionist_count || 0),
      difficulty: result.difficulty || '',
      quality_average: result.quality_average?.toString() || '0',
      stars: Math.round((Number(result.quality_average) || 0) * 5),
      difficulty_error: result.difficulty_error?.toString() || '0',
      benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
      // TODO: Multiframe support should remove the hardcoded [0]
      litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', params.board_name)[0],
      // Add user-specific fields if they exist
      userAscents: userId ? Number((result as Record<string, unknown>)?.userAscents || 0) : undefined,
      userAttempts: userId ? Number((result as Record<string, unknown>)?.userAttempts || 0) : undefined,
    }));

    return {
      climbs: climbs,
      hasMore,
      // totalCount is no longer included - use countClimbs() for separate count query
    };
  } catch (error) {
    console.error('Error in searchClimbs:', error);
    throw error;
  }
};
