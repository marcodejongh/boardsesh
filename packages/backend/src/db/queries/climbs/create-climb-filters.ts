import { eq, gte, sql, like, notLike, inArray, SQL, getTableName } from 'drizzle-orm';
import { TableSet, type BoardName } from '../util/table-select';
import type { SizeEdges } from '../util/product-sizes-data';
import { boardseshTicks, boardProductSizes } from '@boardsesh/db/schema';
import type { HoldState } from '@boardsesh/shared-schema';

export interface ClimbSearchParams {
  // Pagination
  page?: number;
  pageSize?: number;
  // Filters
  gradeAccuracy?: number;
  minGrade?: number;
  maxGrade?: number;
  minRating?: number;
  minAscents?: number;
  sortBy?: string;
  sortOrder?: string;
  name?: string;
  settername?: string[];
  onlyClassics?: boolean;
  onlyTallClimbs?: boolean;
  // Hold filters - accepts all HoldState values (currently only 'ANY' and 'NOT' are processed)
  holdsFilter?: Record<string, HoldState>;
  // Personal progress filters
  hideAttempted?: boolean;
  hideCompleted?: boolean;
  showOnlyAttempted?: boolean;
  showOnlyCompleted?: boolean;
}

export interface ParsedBoardRouteParameters {
  board_name: BoardName;
  layout_id: number;
  size_id: number;
  set_ids: number[];
  angle: number;
}

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
  searchParams: ClimbSearchParams,
  sizeEdges: SizeEdges,
  userId?: string,
) => {
  // Process hold filters
  const holdsToFilter = Object.entries(searchParams.holdsFilter || {}).map(([key, state]) => [
    key.replace('hold_', ''),
    state,
  ]);

  const anyHolds = holdsToFilter.filter(([, value]) => value === 'ANY').map(([key]) => Number(key));
  const notHolds = holdsToFilter.filter(([, value]) => value === 'NOT').map(([key]) => Number(key));

  // Base conditions for filtering climbs that don't reference the product sizes table
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

  // Tall climbs filter condition
  // Only applies for Kilter Homewall (layout_id = 8) on the largest size
  // A "tall climb" is one that uses holds in the bottom rows that are only available on the largest size
  const tallClimbsConditions: SQL[] = [];
  const KILTER_HOMEWALL_LAYOUT_ID = 8;
  const KILTER_HOMEWALL_PRODUCT_ID = 7;

  if (searchParams.onlyTallClimbs && params.board_name === 'kilter' && params.layout_id === KILTER_HOMEWALL_LAYOUT_ID) {
    // Find the maximum edge_bottom of all sizes smaller than the current size
    // Climbs with edge_bottom below this threshold use "tall only" holds
    // For Kilter Homewall (productId=7), 7x10/10x10 sizes have edgeBottom=24, 8x12/10x12 have edgeBottom=-12
    // So "tall climbs" are those with edgeBottom < 24 (using holds only available on 12-tall sizes)
    const productSizesTable = getTableName(boardProductSizes);
    tallClimbsConditions.push(
      sql`${tables.climbs.edgeBottom} < (
        SELECT MAX(ps.edge_bottom)
        FROM ${sql.identifier(productSizesTable)} ps
        WHERE ps.product_id = ${KILTER_HOMEWALL_PRODUCT_ID}
        AND ps.board_type = 'kilter'
        AND ps.id != ${params.size_id}
      )`
    );
  }

  // Personal progress filter conditions (only apply if userId is provided)
  // Uses boardsesh_ticks table which tracks all user attempts
  const personalProgressConditions: SQL[] = [];
  const ticksTable = getTableName(boardseshTicks);
  if (userId) {
    if (searchParams.hideAttempted) {
      // Hide climbs where the user has any tick (attempted or completed)
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${sql.identifier(ticksTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND board_type = ${params.board_name}
          AND angle = ${params.angle}
        )`
      );
    }

    if (searchParams.hideCompleted) {
      // Hide climbs where the user has completed (flash or send)
      personalProgressConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${sql.identifier(ticksTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND board_type = ${params.board_name}
          AND angle = ${params.angle}
          AND status IN ('flash', 'send')
        )`
      );
    }

    if (searchParams.showOnlyAttempted) {
      // Show only climbs where the user has any tick
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${sql.identifier(ticksTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND board_type = ${params.board_name}
          AND angle = ${params.angle}
        )`
      );
    }

    if (searchParams.showOnlyCompleted) {
      // Show only climbs where the user has completed (flash or send)
      personalProgressConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${sql.identifier(ticksTable)}
          WHERE climb_uuid = ${tables.climbs.uuid}
          AND user_id = ${userId}
          AND board_type = ${params.board_name}
          AND angle = ${params.angle}
          AND status IN ('flash', 'send')
        )`
      );
    }
  }

  // User-specific logbook data selectors
  // Uses boardsesh_ticks table which tracks all user attempts
  const getUserLogbookSelects = () => {
    return {
      userAscents: sql<number>`(
        SELECT COUNT(*)
        FROM ${sql.identifier(ticksTable)}
        WHERE climb_uuid = ${tables.climbs.uuid}
        AND user_id = ${userId || ''}
        AND board_type = ${params.board_name}
        AND angle = ${params.angle}
        AND status IN ('flash', 'send')
      )`,
      userAttempts: sql<number>`(
        SELECT COUNT(*)
        FROM ${sql.identifier(ticksTable)}
        WHERE climb_uuid = ${tables.climbs.uuid}
        AND user_id = ${userId || ''}
        AND board_type = ${params.board_name}
        AND angle = ${params.angle}
        AND status = 'attempt'
      )`,
    };
  };

  return {
    // Helper function to get all climb filtering conditions
    getClimbWhereConditions: () => [...baseConditions, ...nameCondition, ...setterNameCondition, ...holdConditions, ...tallClimbsConditions, ...personalProgressConditions],

    // Size-specific conditions
    getSizeConditions: () => sizeConditions,

    // Helper function to get all climb stats conditions
    getClimbStatsConditions: () => climbStatsConditions,

    // For use in the subquery with left join
    getClimbStatsJoinConditions: () => [
      eq(tables.climbStats.climbUuid, tables.climbs.uuid),
      eq(tables.climbStats.boardType, params.board_name),
      eq(tables.climbStats.angle, params.angle),
    ],

    // For use in getHoldHeatmapData - joins climbStats via climbHolds
    getHoldHeatmapClimbStatsConditions: () => [
      eq(tables.climbStats.climbUuid, tables.climbHolds.climbUuid),
      eq(tables.climbStats.boardType, params.board_name),
      eq(tables.climbStats.angle, params.angle),
    ],

    // For use when joining climbHolds to climbs
    getClimbHoldsJoinConditions: () => [
      eq(tables.climbHolds.climbUuid, tables.climbs.uuid),
      eq(tables.climbHolds.boardType, params.board_name),
    ],

    // User-specific logbook data selectors
    getUserLogbookSelects,

    // Raw parts, in case you need direct access to these
    baseConditions,
    climbStatsConditions,
    nameCondition,
    setterNameCondition,
    holdConditions,
    tallClimbsConditions,
    sizeConditions,
    personalProgressConditions,
    anyHolds,
    notHolds,
  };
};
