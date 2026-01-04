import { eq, sql, and, ilike } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters } from '@/app/lib/types';
import { UNIFIED_TABLES } from '@/lib/db/queries/util/table-select';
import { getSizeEdges } from '@/app/lib/__generated__/product-sizes-data';

export interface SetterStat {
  setter_username: string;
  climb_count: number;
}

export const getSetterStats = async (
  params: ParsedBoardRouteParameters,
  searchQuery?: string,
): Promise<SetterStat[]> => {
  const { climbs, climbStats } = UNIFIED_TABLES;

  // Get hardcoded size edges (eliminates database query)
  const sizeEdges = getSizeEdges(params.board_name, params.size_id);
  if (!sizeEdges) {
    return [];
  }

  try {
    // Build WHERE conditions
    const whereConditions = [
      eq(climbs.boardType, params.board_name),
      eq(climbs.layoutId, params.layout_id),
      eq(climbStats.angle, params.angle),
      sql`${climbs.edgeLeft} > ${sizeEdges.edgeLeft}`,
      sql`${climbs.edgeRight} < ${sizeEdges.edgeRight}`,
      sql`${climbs.edgeBottom} > ${sizeEdges.edgeBottom}`,
      sql`${climbs.edgeTop} < ${sizeEdges.edgeTop}`,
      sql`${climbs.setterUsername} IS NOT NULL`,
      sql`${climbs.setterUsername} != ''`,
    ];

    // Add search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      whereConditions.push(ilike(climbs.setterUsername, `%${searchQuery}%`));
    }

    const result = await db
      .select({
        setter_username: climbs.setterUsername,
        climb_count: sql<number>`count(*)::int`,
      })
      .from(climbs)
      .innerJoin(climbStats, and(
        eq(climbStats.climbUuid, climbs.uuid),
        eq(climbStats.boardType, params.board_name),
      ))
      .where(and(...whereConditions))
      .groupBy(climbs.setterUsername)
      .orderBy(sql`count(*) DESC`)
      .limit(50); // Limit results for performance

    // Filter out any nulls that might have slipped through
    return result.filter((stat): stat is SetterStat => stat.setter_username !== null);
  } catch (error) {
    console.error('Error fetching setter stats:', error);
    throw error;
  }
};
