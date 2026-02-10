import { eq, gte, sql, like, notLike, inArray, SQL } from 'drizzle-orm';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { UNIFIED_TABLES } from '@/lib/db/queries/util/table-select';
import { SizeEdges } from '@/app/lib/__generated__/product-sizes-data';
import { SUPPORTED_BOARDS } from '@/app/lib/board-data';
import { KILTER_HOMEWALL_LAYOUT_ID, KILTER_HOMEWALL_PRODUCT_ID } from '@/app/lib/board-constants';
import { boardseshTicks } from '@/app/lib/db/schema';

// Type for unified tables used by filters
type UnifiedTables = typeof UNIFIED_TABLES;

/**
 * Creates a shared filtering object that can be used by both search climbs and heatmap queries
 * Uses unified tables (board_climbs, board_climb_stats, etc.) with board_type filtering
 * @param params The route parameters (includes board_name for filtering)
 * @param searchParams The search parameters
 * @param sizeEdges Pre-fetched edge values from product_sizes table
 * @param userId Optional NextAuth user ID to include user-specific ascent and attempt data
 */
export const createClimbFilters = (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  sizeEdges: SizeEdges,
  userId?: string,
) => {
  const tables = UNIFIED_TABLES;
  // Defense in depth: validate board_name before using in SQL queries
  if (!SUPPORTED_BOARDS.includes(params.board_name)) {
    throw new Error(`Invalid board name: ${params.board_name}`);
  }
  // Process hold filters
  // holdsFilter can have values like:
  // - 'ANY': hold must be present in the climb
  // - 'NOT': hold must NOT be present in the climb
  // - { state: 'STARTING' | 'HAND' | 'FOOT' | 'FINISH' }: hold must be present with that specific state
  // - 'STARTING' | 'HAND' | 'FOOT' | 'FINISH': (after URL parsing) same as above
  const holdsToFilter = Object.entries(searchParams.holdsFilter || {}).map(([key, stateOrValue]) => {
    const holdId = key.replace('hold_', '');
    // Handle both object form { state: 'STARTING' } and string form 'STARTING' (after URL parsing)
    const state = typeof stateOrValue === 'object' && stateOrValue !== null
      ? (stateOrValue as { state: string }).state
      : stateOrValue;
    return [holdId, state] as const;
  });

  const anyHolds = holdsToFilter.filter(([, value]) => value === 'ANY').map(([key]) => Number(key));
  const notHolds = holdsToFilter.filter(([, value]) => value === 'NOT').map(([key]) => Number(key));

  // Hold state filters - hold must be present with specific state (STARTING, HAND, FOOT, FINISH)
  const holdStateFilters = holdsToFilter
    .filter(([, value]) => ['STARTING', 'HAND', 'FOOT', 'FINISH'].includes(value as string))
    .map(([key, state]) => ({ holdId: Number(key), state: state as string }));

  // Base conditions for filtering climbs - includes board_type filter for unified tables
  const baseConditions: SQL[] = [
    eq(tables.climbs.boardType, params.board_name),
    eq(tables.climbs.layoutId, params.layout_id),
    eq(tables.climbs.isListed, true),
    eq(tables.climbs.isDraft, false),
    eq(tables.climbs.framesCount, 1),
  ];

  // Size-specific conditions using pre-fetched static edge values
  // This eliminates the need for a JOIN on product_sizes in the main query
  // MoonBoard climbs have NULL edge values (single fixed size), so skip edge filtering
  const sizeConditions: SQL[] = params.board_name === 'moonboard' ? [] : [
    sql`${tables.climbs.edgeLeft} > ${sizeEdges.edgeLeft}`,
    sql`${tables.climbs.edgeRight} < ${sizeEdges.edgeRight}`,
    sql`${tables.climbs.edgeBottom} > ${sizeEdges.edgeBottom}`,
    sql`${tables.climbs.edgeTop} < ${sizeEdges.edgeTop}`,
  ];

  // Conditions for climb stats
  const climbStatsConditions: SQL[] = [];

  if (searchParams.minAscents) {
    climbStatsConditions.push(gte(tables.climbStats.ascensionistCount, searchParams.minAscents));
  }

  if (searchParams.minGrade && searchParams.maxGrade) {
    climbStatsConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) BETWEEN ${searchParams.minGrade} AND ${searchParams.maxGrade}`,
    );
  } else if (searchParams.minGrade) {
    climbStatsConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) >= ${searchParams.minGrade}`,
    );
  } else if (searchParams.maxGrade) {
    climbStatsConditions.push(
      sql`ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) <= ${searchParams.maxGrade}`,
    );
  }

  if (searchParams.minRating) {
    climbStatsConditions.push(sql`${tables.climbStats.qualityAverage} >= ${searchParams.minRating}`);
  }

  if (searchParams.gradeAccuracy) {
    climbStatsConditions.push(
      sql`ABS(ROUND(${tables.climbStats.displayDifficulty}::numeric, 0) - ${tables.climbStats.difficultyAverage}::numeric) <= ${searchParams.gradeAccuracy}`,
    );
  }

  // Name search condition (only used in searchClimbs)
  const nameCondition: SQL[] = searchParams.name ? [sql`${tables.climbs.name} ILIKE ${`%${searchParams.name}%`}`] : [];

  // Setter name filter condition
  const setterNameCondition: SQL[] = searchParams.settername && searchParams.settername.length > 0
    ? [inArray(tables.climbs.setterUsername, searchParams.settername)]
    : [];

  // Hold filter conditions
  const holdConditions: SQL[] = [
    ...anyHolds.map((holdId) => like(tables.climbs.frames, `%${holdId}r%`)),
    ...notHolds.map((holdId) => notLike(tables.climbs.frames, `%${holdId}r%`)),
  ];

  // State-specific hold conditions - use unified board_climb_holds table to filter by hold_id AND hold_state
  const holdStateConditions: SQL[] = holdStateFilters.map(({ holdId, state }) =>
    sql`EXISTS (
      SELECT 1 FROM board_climb_holds ch
      WHERE ch.board_type = ${params.board_name}
      AND ch.climb_uuid = ${tables.climbs.uuid}
      AND ch.hold_id = ${holdId}
      AND ch.hold_state = ${state}
    )`
  );

  // Tall climbs filter condition
  // Only applies for Kilter Homewall (layout_id = 8) on the largest size
  // A "tall climb" is one that uses holds in the bottom rows that are only available on the largest size
  const tallClimbsConditions: SQL[] = [];

  if (searchParams.onlyTallClimbs && params.board_name === 'kilter' && params.layout_id === KILTER_HOMEWALL_LAYOUT_ID) {
    // Find the maximum edge_bottom of all sizes smaller than the current size
    // Climbs with edge_bottom below this threshold use "tall only" holds
    // For Kilter Homewall (productId=7), 7x10/10x10 sizes have edgeBottom=24, 8x12/10x12 have edgeBottom=-12
    // So "tall climbs" are those with edgeBottom < 24 (using holds only available on 12-tall sizes)
    tallClimbsConditions.push(
      sql`${tables.climbs.edgeBottom} < (
        SELECT MAX(ps.edge_bottom)
        FROM board_product_sizes ps
        WHERE ps.board_type = ${params.board_name}
        AND ps.product_id = ${KILTER_HOMEWALL_PRODUCT_ID}
        AND ps.id != ${params.size_id}
      )`
    );
  }

  // Personal progress filter conditions (only apply if userId is provided)
  // Uses boardsesh_ticks with NextAuth userId
  const personalProgressConditions: SQL[] = [];
  if (userId) {
    if (searchParams.hideAttempted) {
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${boardseshTicks}
          WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
          AND ${boardseshTicks.userId} = ${userId}
          AND ${boardseshTicks.boardType} = ${params.board_name}
          AND ${boardseshTicks.angle} = ${params.angle}
          AND ${boardseshTicks.status} = 'attempt'
        )`
      );
    }

    if (searchParams.hideCompleted) {
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${boardseshTicks}
          WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
          AND ${boardseshTicks.userId} = ${userId}
          AND ${boardseshTicks.boardType} = ${params.board_name}
          AND ${boardseshTicks.angle} = ${params.angle}
          AND ${boardseshTicks.status} IN ('flash', 'send')
        )`
      );
    }

    if (searchParams.showOnlyAttempted) {
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${boardseshTicks}
          WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
          AND ${boardseshTicks.userId} = ${userId}
          AND ${boardseshTicks.boardType} = ${params.board_name}
          AND ${boardseshTicks.angle} = ${params.angle}
          AND ${boardseshTicks.status} = 'attempt'
        )`
      );
    }

    if (searchParams.showOnlyCompleted) {
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${boardseshTicks}
          WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
          AND ${boardseshTicks.userId} = ${userId}
          AND ${boardseshTicks.boardType} = ${params.board_name}
          AND ${boardseshTicks.angle} = ${params.angle}
          AND ${boardseshTicks.status} IN ('flash', 'send')
        )`
      );
    }
  }

  // User-specific logbook data selectors using boardsesh_ticks
  const getUserLogbookSelects = () => {
    return {
      userAscents: sql<number>`(
        SELECT COUNT(*)
        FROM ${boardseshTicks}
        WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
        AND ${boardseshTicks.userId} = ${userId || ''}
        AND ${boardseshTicks.boardType} = ${params.board_name}
        AND ${boardseshTicks.angle} = ${params.angle}
        AND ${boardseshTicks.status} IN ('flash', 'send')
      )`,
      userAttempts: sql<number>`(
        SELECT COUNT(*)
        FROM ${boardseshTicks}
        WHERE ${boardseshTicks.climbUuid} = ${tables.climbs.uuid}
        AND ${boardseshTicks.userId} = ${userId || ''}
        AND ${boardseshTicks.boardType} = ${params.board_name}
        AND ${boardseshTicks.angle} = ${params.angle}
        AND ${boardseshTicks.status} = 'attempt'
      )`,
    };
  };

  // Hold-specific user data selectors for heatmap using boardsesh_ticks
  const getHoldUserLogbookSelects = (climbHoldsTable: typeof tables.climbHolds) => {
    return {
      userAscents: sql<number>`(
        SELECT COUNT(*)
        FROM ${boardseshTicks}
        WHERE ${boardseshTicks.climbUuid} = ${climbHoldsTable.climbUuid}
        AND ${boardseshTicks.userId} = ${userId || ''}
        AND ${boardseshTicks.boardType} = ${params.board_name}
        AND ${boardseshTicks.angle} = ${params.angle}
        AND ${boardseshTicks.status} IN ('flash', 'send')
      )`,
      userAttempts: sql<number>`(
        SELECT COUNT(*)
        FROM ${boardseshTicks}
        WHERE ${boardseshTicks.climbUuid} = ${climbHoldsTable.climbUuid}
        AND ${boardseshTicks.userId} = ${userId || ''}
        AND ${boardseshTicks.boardType} = ${params.board_name}
        AND ${boardseshTicks.angle} = ${params.angle}
        AND ${boardseshTicks.status} = 'attempt'
      )`,
    };
  };

  return {
    // Helper function to get all climb filtering conditions
    getClimbWhereConditions: () => [...baseConditions, ...nameCondition, ...setterNameCondition, ...holdConditions, ...holdStateConditions, ...tallClimbsConditions, ...personalProgressConditions],

    // Size-specific conditions
    getSizeConditions: () => sizeConditions,

    // Helper function to get all climb stats conditions
    getClimbStatsConditions: () => climbStatsConditions,

    // For use in the subquery with left join - includes board_type for unified tables
    getClimbStatsJoinConditions: () => [
      eq(tables.climbStats.climbUuid, tables.climbs.uuid),
      eq(tables.climbStats.boardType, params.board_name),
      eq(tables.climbStats.angle, params.angle),
    ],

    // For use in getHoldHeatmapData - includes board_type for unified tables
    getHoldHeatmapClimbStatsConditions: () => [
      eq(tables.climbStats.climbUuid, tables.climbHolds.climbUuid),
      eq(tables.climbStats.boardType, params.board_name),
      eq(tables.climbStats.angle, params.angle),
    ],

    // For use when joining climbHolds - includes board_type for unified tables
    getClimbHoldsJoinConditions: () => [
      eq(tables.climbHolds.climbUuid, tables.climbs.uuid),
      eq(tables.climbHolds.boardType, params.board_name),
    ],

    // User-specific logbook data selectors
    getUserLogbookSelects,

    // Hold-specific user data selectors for heatmap
    getHoldUserLogbookSelects,

    // Raw parts, in case you need direct access to these
    baseConditions,
    climbStatsConditions,
    nameCondition,
    setterNameCondition,
    holdConditions,
    holdStateConditions,
    tallClimbsConditions,
    sizeConditions,
    personalProgressConditions,
    anyHolds,
    notHolds,
    holdStateFilters,
  };
};
