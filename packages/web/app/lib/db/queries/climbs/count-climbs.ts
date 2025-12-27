import { sql, and } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters, SearchRequestPagination } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { createClimbFilters, SizeEdges } from './create-climb-filters';

/**
 * Counts the total number of climbs matching the search filters.
 * This is a separate query from searchClimbs to allow:
 * 1. The main search to return results immediately without counting
 * 2. The count to be cached separately with a longer stale time
 * 3. GraphQL-like patterns where count is a separate field
 */
export const countClimbs = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
  sizeEdges: SizeEdges,
  userId?: number,
): Promise<number> => {
  const tables = getBoardTables(params.board_name);
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
