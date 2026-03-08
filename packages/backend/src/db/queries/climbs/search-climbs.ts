import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../client';
import { getBoardTables, type BoardName } from '../util/table-select';
import { createClimbFilters, type ClimbSearchParams, type ParsedBoardRouteParameters } from './create-climb-filters';
import { getSizeEdges } from '../util/product-sizes-data';
import type { Climb, ClimbSearchResult } from '@boardsesh/shared-schema';
import { boardClimbStats, boardClimbStatsHistory } from '@boardsesh/db/schema';
import { convertLitUpHoldsStringToMap } from '../util/hold-state';

export const searchClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: ClimbSearchParams,
  userId?: string,
): Promise<ClimbSearchResult> => {
  const tables = getBoardTables(params.board_name);

  // Get hardcoded size edges (eliminates database query)
  const sizeEdges = getSizeEdges(params.board_name, params.size_id);
  if (!sizeEdges) {
    return { climbs: [], totalCount: 0, hasMore: false };
  }

  // Default pagination values
  const page = searchParams.page ?? 0;
  const pageSize = searchParams.pageSize ?? 20;

  // Use the shared filter creator with static edge values and optional userId
  const filters = createClimbFilters(tables, params, searchParams, sizeEdges, userId);

  // Define sort columns with explicit SQL expressions where needed
  const allowedSortColumns: Record<string, ReturnType<typeof sql>> = {
    ascents: sql`${tables.climbStats.ascensionistCount}`,
    difficulty: sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0)`,
    name: sql`${tables.climbs.name}`,
    quality: sql`${tables.climbStats.qualityAverage}`,
    // Popular: sum of ascents across ALL angles for this climb (using unified table)
    popular: sql`(
      SELECT COALESCE(SUM(cs.ascensionist_count), 0)
      FROM ${boardClimbStats} cs
      WHERE cs.board_type = ${params.board_name} AND cs.climb_uuid = ${tables.climbs.uuid}
    )`,
    // Trending: % increase in ascents over last 7 days
    trending: sql`(
      SELECT CASE
        WHEN earliest.ascensionist_count > 0
        THEN ((latest.ascensionist_count - earliest.ascensionist_count)::float / earliest.ascensionist_count) * 100
        ELSE 0
      END
      FROM (
        SELECT ${boardClimbStatsHistory.ascensionistCount} as ascensionist_count
        FROM ${boardClimbStatsHistory}
        WHERE ${boardClimbStatsHistory.boardType} = ${params.board_name}
          AND ${boardClimbStatsHistory.climbUuid} = ${tables.climbs.uuid}
          AND ${boardClimbStatsHistory.angle} = ${params.angle}
          AND ${boardClimbStatsHistory.createdAt} >= NOW() - INTERVAL '7 days'
        ORDER BY ${boardClimbStatsHistory.createdAt} ASC LIMIT 1
      ) earliest,
      (
        SELECT ${boardClimbStatsHistory.ascensionistCount} as ascensionist_count
        FROM ${boardClimbStatsHistory}
        WHERE ${boardClimbStatsHistory.boardType} = ${params.board_name}
          AND ${boardClimbStatsHistory.climbUuid} = ${tables.climbs.uuid}
          AND ${boardClimbStatsHistory.angle} = ${params.angle}
          AND ${boardClimbStatsHistory.createdAt} >= NOW() - INTERVAL '7 days'
        ORDER BY ${boardClimbStatsHistory.createdAt} DESC LIMIT 1
      ) latest
    )`,
    // Hot: absolute increase in ascents over last 7 days
    hot: sql`(
      SELECT COALESCE(latest.ascensionist_count - earliest.ascensionist_count, 0)
      FROM (
        SELECT ${boardClimbStatsHistory.ascensionistCount} as ascensionist_count
        FROM ${boardClimbStatsHistory}
        WHERE ${boardClimbStatsHistory.boardType} = ${params.board_name}
          AND ${boardClimbStatsHistory.climbUuid} = ${tables.climbs.uuid}
          AND ${boardClimbStatsHistory.angle} = ${params.angle}
          AND ${boardClimbStatsHistory.createdAt} >= NOW() - INTERVAL '7 days'
        ORDER BY ${boardClimbStatsHistory.createdAt} ASC LIMIT 1
      ) earliest,
      (
        SELECT ${boardClimbStatsHistory.ascensionistCount} as ascensionist_count
        FROM ${boardClimbStatsHistory}
        WHERE ${boardClimbStatsHistory.boardType} = ${params.board_name}
          AND ${boardClimbStatsHistory.climbUuid} = ${tables.climbs.uuid}
          AND ${boardClimbStatsHistory.angle} = ${params.angle}
          AND ${boardClimbStatsHistory.createdAt} >= NOW() - INTERVAL '7 days'
        ORDER BY ${boardClimbStatsHistory.createdAt} DESC LIMIT 1
      ) latest
    )`,
  };

  // Get the selected sort column or fall back to ascensionist_count
  const sortColumn = allowedSortColumns[searchParams.sortBy || 'ascents'] || sql`${tables.climbStats.ascensionistCount}`;

  const whereConditions = [
    ...filters.getClimbWhereConditions(),
    ...filters.getSizeConditions(),
    ...filters.getClimbStatsConditions(),
  ];

  try {
    // Base fields for the query
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

    const sortOrder = searchParams.sortOrder === 'asc' ? 'asc' : 'desc';

    const baseQuery = db
      .select(selectFields)
      .from(tables.climbs)
      .leftJoin(tables.climbStats, and(...filters.getClimbStatsJoinConditions()))
      .leftJoin(
        tables.difficultyGrades,
        and(
          eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
          eq(tables.difficultyGrades.boardType, params.board_name),
        ),
      )
      .where(and(...whereConditions))
      .orderBy(
        sortOrder === 'asc' ? sql`${sortColumn} ASC NULLS FIRST` : sql`${sortColumn} DESC NULLS LAST`,
        desc(tables.climbs.uuid),
      )
      // Fetch one extra row to detect if there are more results (hasMore)
      .limit(pageSize + 1)
      .offset(page * pageSize);

    const results = await baseQuery;

    // Check if there are more results available
    const hasMore = results.length > pageSize;
    // Only return up to pageSize results
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

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
      benchmark_difficulty: result.benchmark_difficulty && result.benchmark_difficulty > 0 ? result.benchmark_difficulty.toString() : null,
      // TODO: Multiframe support should remove the hardcoded [0]
      litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', params.board_name)[0],
      // Add user-specific fields if they exist
      userAscents: userId ? Number((result as Record<string, unknown>)?.userAscents || 0) : undefined,
      userAttempts: userId ? Number((result as Record<string, unknown>)?.userAttempts || 0) : undefined,
    }));

    return {
      climbs,
      hasMore,
      totalCount: 0, // Will be filled by countClimbs if needed
    };
  } catch (error) {
    console.error('Error in searchClimbs:', error);
    throw error;
  }
};
