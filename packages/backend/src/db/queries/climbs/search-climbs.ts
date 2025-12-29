import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../client.js';
import { getBoardTables, type BoardName } from '../util/table-select.js';
import { createClimbFilters, type ClimbSearchParams, type ParsedBoardRouteParameters } from './create-climb-filters.js';
import { getSizeEdges } from '../util/product-sizes-data.js';
import type { Climb, ClimbSearchResult, LitUpHoldsMap, HoldState } from '@boardsesh/shared-schema';

// Hold state mapping for converting frames string to lit up holds map
type HoldColor = string;
type HoldCode = number;

// Use a broader type for HOLD_STATE_MAP to support future board types
type BoardNameWithFuture = BoardName | 'decoy';

const HOLD_STATE_MAP: Record<
  BoardNameWithFuture,
  Record<HoldCode, { name: HoldState; color: HoldColor; displayColor?: HoldColor }>
> = {
  kilter: {
    42: { name: 'STARTING', color: '#00FF00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    12: { name: 'STARTING', color: '#00FF00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    1: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    2: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    3: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    4: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
    5: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    6: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    7: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    8: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
  },
  decoy: {
    // TODO: Verify actual hold state codes for decoy board from Aurora API
    // Placeholder values based on kilter/tension pattern
    42: { name: 'STARTING', color: '#00FF00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
  },
};


/**
 * Convert lit up holds string to a map
 * Returns only the first frame for single-frame climbs
 */
function convertLitUpHoldsStringToMap(litUpHolds: string, board: BoardName): Record<number, LitUpHoldsMap> {
  return litUpHolds
    .split(',')
    .filter((frame) => frame)
    .reduce(
      (frameMap, frameString, frameIndex) => {
        const frameHoldsMap = Object.fromEntries(
          frameString
            .split('p')
            .filter((hold) => hold)
            .map((holdData) => holdData.split('r').map((str) => Number(str)))
            .map(([holdId, stateCode]) => {
              const stateInfo = HOLD_STATE_MAP[board]?.[stateCode];
              if (!stateInfo) {
                return [holdId || 0, { state: `${holdId}=${stateCode}` as HoldState, color: '#FFF', displayColor: '#FFF' }];
              }
              const { name, color, displayColor } = stateInfo;
              return [holdId, { state: name, color, displayColor: displayColor || color }];
            }),
        );
        frameMap[frameIndex] = frameHoldsMap as LitUpHoldsMap;
        return frameMap;
      },
      {} as Record<number, LitUpHoldsMap>,
    );
}

export const searchClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: ClimbSearchParams,
  userId?: number,
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
        eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
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
      benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
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
