import { sql, and } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters } from './create-climb-filters';
import { SizeEdges } from './size-edges';

/**
 * Counts the total number of climbs matching the search criteria.
 * This is a separate query from searchClimbs to avoid the expensive count(*) over()
 * window function that forces a full table scan.
 *
 * This follows the GraphQL pattern where `items` and `totalCount` are separate fields
 * that can be fetched independently.
 */
export const countClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  sizeEdges: SizeEdges,
  userId?: number,
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
