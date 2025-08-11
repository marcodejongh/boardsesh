import { eq, gte, sql, like, notLike, SQL } from 'drizzle-orm';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { TableSet } from '@/lib/db/queries/util/table-select';
import { getTableName } from '@/app/lib/data-sync/aurora/getTableName';

/**
 * Creates a shared filtering object that can be used by both search climbs and heatmap queries
 * @param tables The board-specific tables from getBoardTables
 * @param params The route parameters
 * @param searchParams The search parameters
 * @param productSizeAlias Optional alias for the product sizes table. If provided, size conditions will use this alias.
 * @param userId Optional user ID to include user-specific ascent and attempt data
 */
export const createClimbFilters = (
  tables: TableSet,
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productSizeAlias?: PgTableWithColumns<any>,
  userId?: number,
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
    eq(tables.climbs.layoutId, params.layout_id),
    eq(tables.climbs.isListed, true),
    eq(tables.climbs.isDraft, false),
    eq(tables.climbs.framesCount, 1),
  ];

  // Get the product sizes table or its alias
  const sizeTable = productSizeAlias || tables.productSizes;

  // Size-specific conditions
  const sizeConditions: SQL[] = [
    eq(sizeTable.id, params.size_id),
    sql`${tables.climbs.edgeLeft} > ${sizeTable.edgeLeft}`,
    sql`${tables.climbs.edgeRight} < ${sizeTable.edgeRight}`,
    sql`${tables.climbs.edgeBottom} > ${sizeTable.edgeBottom}`,
    sql`${tables.climbs.edgeTop} < ${sizeTable.edgeTop}`,
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

  // Hold filter conditions
  const holdConditions: SQL[] = [
    ...anyHolds.map((holdId) => like(tables.climbs.frames, `%${holdId}r%`)),
    ...notHolds.map((holdId) => notLike(tables.climbs.frames, `%${holdId}r%`)),
  ];

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

  // Circuit filter conditions
  const circuitConditions: SQL[] = [];
  if (searchParams.circuitUuids && searchParams.circuitUuids.length > 0) {
    const circuitsClimbsTable = getTableName(params.board_name, 'circuitsClimbs');
    circuitConditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${sql.identifier(circuitsClimbsTable)}
        WHERE climb_uuid = ${tables.climbs.uuid}
        AND circuit_uuid = ANY(${searchParams.circuitUuids})
      )`
    );
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
    getClimbWhereConditions: () => [...baseConditions, ...nameCondition, ...holdConditions, ...personalProgressConditions, ...circuitConditions],

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
    holdConditions,
    sizeConditions,
    personalProgressConditions,
    circuitConditions,
    anyHolds,
    notHolds,
  };
};
