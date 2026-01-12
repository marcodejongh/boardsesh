import { sql, and } from 'drizzle-orm';
import { db } from '../../client';
import { getBoardTables } from '../util/table-select';
import { createClimbFilters, type ClimbSearchParams, type ParsedBoardRouteParameters } from './create-climb-filters';
import type { SizeEdges } from '../util/product-sizes-data';

/**
 * Counts the total number of climbs matching the search criteria.
 * This is a separate query from searchClimbs to avoid the expensive count(*) over()
 * window function that forces a full table scan.
 *
 * This query is only executed when the `totalCount` field is requested in the GraphQL query.
 * The ClimbSearchResult type uses field-level resolvers, so if a client only requests
 * `climbs` and `hasMore`, this count query is never executed - improving performance.
 *
 * @see resolvers.ts ClimbSearchResult.totalCount for the field resolver
 */
export const countClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: ClimbSearchParams,
  sizeEdges: SizeEdges,
  userId?: string,
): Promise<number> => {
  const tables = getBoardTables(params.board_name);

  // Use the shared filter creator with static edge values
  const filters = createClimbFilters(tables, params, searchParams, sizeEdges, userId);

  const whereConditions = [
    ...filters.getClimbWhereConditions(),
    ...filters.getSizeConditions(),
    ...filters.getClimbStatsConditions(),
  ];

  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tables.climbs)
      .leftJoin(tables.climbStats, and(...filters.getClimbStatsJoinConditions()))
      .where(and(...whereConditions));

    return Number(result[0]?.count ?? 0);
  } catch (error) {
    console.error('Error in countClimbs:', error);
    throw error;
  }
};
