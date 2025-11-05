import { sql } from 'drizzle-orm';
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
      .where(
        sql`${tables.climbStats.layoutId} = ${params.layout_id}
            AND ${tables.climbStats.sizeId} = ${params.size_id}
            AND ${tables.climbStats.angle} = ${params.angle}
            AND ${tables.climbs.setterUsername} IS NOT NULL
            AND ${tables.climbs.setterUsername} != ''`,
      )
      .groupBy(tables.climbs.setterUsername)
      .orderBy(sql`count(*) DESC`);

    return result;
  } catch (error) {
    console.error('Error fetching setter stats:', error);
    throw error;
  }
};
