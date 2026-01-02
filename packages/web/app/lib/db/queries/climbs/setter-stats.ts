import { eq, sql, and, ilike } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBoardTables, BoardName as AuroraBoardName } from '@/lib/db/queries/util/table-select';

export interface SetterStat {
  setter_username: string;
  climb_count: number;
}

export const getSetterStats = async (
  params: ParsedBoardRouteParameters,
  searchQuery?: string,
): Promise<SetterStat[]> => {
  const tables = getBoardTables(params.board_name as AuroraBoardName);

  try {
    // Build WHERE conditions
    const whereConditions = [
      eq(tables.climbs.layoutId, params.layout_id),
      eq(tables.climbStats.angle, params.angle),
      sql`${tables.climbs.edgeLeft} > ${tables.productSizes.edgeLeft}`,
      sql`${tables.climbs.edgeRight} < ${tables.productSizes.edgeRight}`,
      sql`${tables.climbs.edgeBottom} > ${tables.productSizes.edgeBottom}`,
      sql`${tables.climbs.edgeTop} < ${tables.productSizes.edgeTop}`,
      sql`${tables.climbs.setterUsername} IS NOT NULL`,
      sql`${tables.climbs.setterUsername} != ''`,
    ];

    // Add search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      whereConditions.push(ilike(tables.climbs.setterUsername, `%${searchQuery}%`));
    }

    const result = await db
      .select({
        setter_username: tables.climbs.setterUsername,
        climb_count: sql<number>`count(*)::int`,
      })
      .from(tables.climbs)
      .innerJoin(tables.climbStats, sql`${tables.climbStats.climbUuid} = ${tables.climbs.uuid}`)
      .innerJoin(tables.productSizes, eq(tables.productSizes.id, params.size_id))
      .where(and(...whereConditions))
      .groupBy(tables.climbs.setterUsername)
      .orderBy(sql`count(*) DESC`)
      .limit(50); // Limit results for performance

    // Filter out any nulls that might have slipped through
    return result.filter((stat): stat is SetterStat => stat.setter_username !== null);
  } catch (error) {
    console.error('Error fetching setter stats:', error);
    throw error;
  }
};
