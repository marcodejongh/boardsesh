import { eq, gte, sql, like, notLike, inArray, SQL } from 'drizzle-orm';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { TableSet } from '@/lib/db/queries/util/table-select';
import { getTableName } from '@/app/lib/data-sync/aurora/getTableName';
import { SizeEdges } from '@/app/lib/__generated__/product-sizes-data';

/**
 * Creates a shared filtering object that can be used by both search climbs and heatmap queries
 * @param tables The board-specific tables from getBoardTables
 * @param params The route parameters
 * @param searchParams The search parameters
 * @param sizeEdges Pre-fetched edge values from product_sizes table
 * @param userId Optional user ID to include user-specific ascent and attempt data
 */
export const createClimbFilters = (
  tables: TableSet,
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  sizeEdges: SizeEdges,
  userId?: number,
) => {
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

  // Base conditions for filtering climbs that don't reference the product sizes table
  const baseConditions: SQL[] = [
    eq(tables.climbs.layoutId, params.layout_id),
    eq(tables.climbs.isListed, true),
    eq(tables.climbs.isDraft, false),
    eq(tables.climbs.framesCount, 1),
  ];

  // Size-specific conditions using pre-fetched static edge values
  // This eliminates the need for a JOIN on product_sizes in the main query
  const sizeConditions: SQL[] = [
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

  // State-specific hold conditions - use climb_holds table to filter by hold_id AND hold_state
  const climbHoldsTable = getTableName(params.board_name, 'climb_holds');
  const holdStateConditions: SQL[] = holdStateFilters.map(({ holdId, state }) =>
    sql`EXISTS (
      SELECT 1 FROM ${sql.identifier(climbHoldsTable)} ch
      WHERE ch.climb_uuid = ${tables.climbs.uuid}
      AND ch.hold_id = ${holdId}
      AND ch.hold_state = ${state}
    )`
  );

  // Tall climbs filter condition
  // Only applies for Kilter Homewall (layout_id = 8) on the largest size
  // A "tall climb" is one that uses holds in the bottom rows that are only available on the largest size
  const tallClimbsConditions: SQL[] = [];
  const KILTER_HOMEWALL_LAYOUT_ID = 8;

  if (searchParams.onlyTallClimbs && params.board_name === 'kilter' && params.layout_id === KILTER_HOMEWALL_LAYOUT_ID) {
    // Find the maximum edge_bottom of all sizes smaller than the current size
    // Climbs with edge_bottom below this threshold use "tall only" holds
    const productSizesTable = getTableName(params.board_name, 'product_sizes');
    const layoutsTable = getTableName(params.board_name, 'layouts');

    tallClimbsConditions.push(
      sql`${tables.climbs.edgeBottom} < (
        SELECT MAX(other_sizes.edge_bottom)
        FROM ${sql.identifier(productSizesTable)} other_sizes
        INNER JOIN ${sql.identifier(layoutsTable)} layouts ON other_sizes.product_id = layouts.product_id
        WHERE layouts.id = ${params.layout_id}
        AND other_sizes.id != ${params.size_id}
        AND other_sizes.edge_bottom < ${sizeEdges.edgeTop}
      )`
    );
  }

  // Personal progress filter conditions (only apply if userId is provided)
  const personalProgressConditions: SQL[] = [];
  if (userId) {
    const ascentsTable = getTableName(params.board_name, 'ascents');
    const bidsTable = getTableName(params.board_name, 'bids');

    if (searchParams.hideAttempted) {
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${sql.identifier(bidsTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND angle = ${params.angle}
        )`
      );
    }

    if (searchParams.hideCompleted) {
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${sql.identifier(ascentsTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND angle = ${params.angle}
        )`
      );
    }

    if (searchParams.showOnlyAttempted) {
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${sql.identifier(bidsTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND angle = ${params.angle}
        )`
      );
    }

    if (searchParams.showOnlyCompleted) {
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${sql.identifier(ascentsTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND angle = ${params.angle}
        )`
      );
    }
  }

  // User-specific logbook data selectors
  const getUserLogbookSelects = () => {
    const ascentsTable = getTableName(params.board_name, 'ascents');
    const bidsTable = getTableName(params.board_name, 'bids');

    return {
      userAscents: sql<number>`(
        SELECT COUNT(*) 
        FROM ${sql.identifier(ascentsTable)} 
        WHERE climb_uuid = ${tables.climbs.uuid} 
        AND user_id = ${userId || ''} 
        AND angle = ${params.angle}
      )`,
      userAttempts: sql<number>`(
        SELECT COUNT(*) 
        FROM ${sql.identifier(bidsTable)} 
        WHERE climb_uuid = ${tables.climbs.uuid} 
        AND user_id = ${userId || ''} 
        AND angle = ${params.angle}
      )`,
    };
  };

  // Hold-specific user data selectors for heatmap
  const getHoldUserLogbookSelects = (climbHoldsTable: typeof tables.climbHolds) => {
    const ascentsTable = getTableName(params.board_name, 'ascents');
    const bidsTable = getTableName(params.board_name, 'bids');

    return {
      userAscents: sql<number>`(
        SELECT COUNT(*) 
        FROM ${sql.identifier(ascentsTable)} a
        WHERE a.climb_uuid = ${climbHoldsTable.climbUuid}
        AND a.user_id = ${userId || ''} 
        AND a.angle = ${params.angle}
      )`,
      userAttempts: sql<number>`(
        SELECT COUNT(*) 
        FROM ${sql.identifier(bidsTable)} b
        WHERE b.climb_uuid = ${climbHoldsTable.climbUuid}
        AND b.user_id = ${userId || ''} 
        AND b.angle = ${params.angle}
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

    // For use in the subquery with left join
    getClimbStatsJoinConditions: () => [
      eq(tables.climbStats.climbUuid, tables.climbs.uuid),
      eq(tables.climbStats.angle, params.angle),
    ],

    // For use in getHoldHeatmapData
    getHoldHeatmapClimbStatsConditions: (climbHoldsTable: typeof tables.climbHolds) => [
      eq(tables.climbStats.climbUuid, climbHoldsTable.climbUuid),
      eq(tables.climbStats.angle, params.angle),
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
