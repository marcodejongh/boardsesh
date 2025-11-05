import { eq, sql, and } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParameters } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';

export interface SetterStat {
  setter_username: string;
  climb_count: number;
}

export const getSetterStats = async (
  params: ParsedBoardRouteParameters,
): Promise<SetterStat[]> => {
  const tables = getBoardTables(params.board_name);

  try {
    const result = await db
      .select({
        setter_username: tables.climbs.setterUsername,
        climb_count: sql<number>`count(*)::int`,
      })
      .from(tables.climbs)
      .innerJoin(tables.climbStats, sql`${tables.climbStats.climbUuid} = ${tables.climbs.uuid}`)
      .innerJoin(tables.productSizes, eq(tables.productSizes.id, params.size_id))
      .where(
        and(
          eq(tables.climbs.layoutId, params.layout_id),
          eq(tables.climbStats.angle, params.angle),
          sql`${tables.climbs.edgeLeft} > ${tables.productSizes.edgeLeft}`,
          sql`${tables.climbs.edgeRight} < ${tables.productSizes.edgeRight}`,
          sql`${tables.climbs.edgeBottom} > ${tables.productSizes.edgeBottom}`,
          sql`${tables.climbs.edgeTop} < ${tables.productSizes.edgeTop}`,
          sql`${tables.climbs.setterUsername} IS NOT NULL`,
          sql`${tables.climbs.setterUsername} != ''`,
        )
      )
      .groupBy(tables.climbs.setterUsername)
      .orderBy(sql`count(*) DESC`);

    // Filter out any nulls that might have slipped through
    return result.filter((stat): stat is SetterStat => stat.setter_username !== null);
  } catch (error) {
    console.error('Error fetching setter stats:', error);
    throw error;
  }
};
