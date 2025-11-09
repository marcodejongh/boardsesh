import { eq, and, sql, inArray, ne } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { Climb, ParsedBoardRouteParametersWithUuid } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';

export interface SimilarClimb extends Climb {
  totalHolds: number;
  matchingHolds: number;
}

/**
 * Find similar climbs that contain all holds of the current climb plus potentially more.
 * This is useful for finding "bigger" versions of climbs on larger board sizes.
 */
export const getSimilarClimbs = async (
  params: ParsedBoardRouteParametersWithUuid,
  limit: number = 10,
): Promise<SimilarClimb[]> => {
  const tables = getBoardTables(params.board_name);

  try {
    // First, get all hold_ids for the current climb
    const currentClimbHolds = await db
      .select({ holdId: tables.climbHolds.holdId })
      .from(tables.climbHolds)
      .where(eq(tables.climbHolds.climbUuid, params.climb_uuid));

    if (currentClimbHolds.length === 0) {
      return [];
    }

    const currentHoldIds = currentClimbHolds.map((h) => h.holdId);
    const currentHoldCount = currentHoldIds.length;

    // Find climbs that contain all the holds of the current climb
    // Using a subquery to count matching holds per climb
    const results = await db.execute(sql`
      WITH current_climb_holds AS (
        SELECT hold_id
        FROM ${tables.climbHolds}
        WHERE climb_uuid = ${params.climb_uuid}
      ),
      candidate_climbs AS (
        SELECT
          ch.climb_uuid,
          COUNT(DISTINCT ch.hold_id) as matching_holds,
          (SELECT COUNT(*) FROM ${tables.climbHolds} WHERE climb_uuid = ch.climb_uuid) as total_holds
        FROM ${tables.climbHolds} ch
        WHERE ch.hold_id IN (SELECT hold_id FROM current_climb_holds)
          AND ch.climb_uuid != ${params.climb_uuid}
        GROUP BY ch.climb_uuid
        HAVING COUNT(DISTINCT ch.hold_id) = ${currentHoldCount}
      )
      SELECT
        c.uuid,
        c.setter_username,
        c.name,
        c.description,
        c.frames,
        COALESCE(cs.angle, ${params.angle}) as angle,
        COALESCE(cs.ascensionist_count, 0) as ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(cs.quality_average::numeric, 2) as quality_average,
        ROUND(cs.difficulty_average::numeric - cs.display_difficulty::numeric, 2) as difficulty_error,
        cs.benchmark_difficulty,
        cc.total_holds,
        cc.matching_holds
      FROM candidate_climbs cc
      INNER JOIN ${tables.climbs} c ON c.uuid = cc.climb_uuid
      LEFT JOIN ${tables.climbStats} cs ON cs.climb_uuid = c.uuid AND cs.angle = ${params.angle}
      LEFT JOIN ${tables.difficultyGrades} dg ON dg.difficulty = ROUND(cs.display_difficulty::numeric)
      WHERE c.layout_id = ${params.layout_id}
        AND c.frames_count = 1
      ORDER BY cc.total_holds ASC, cs.ascensionist_count DESC NULLS LAST
      LIMIT ${limit}
    `);

    // Transform results to Climb objects
    const climbs: SimilarClimb[] = results.rows.map((row: any) => ({
      uuid: row.uuid,
      setter_username: row.setter_username || '',
      name: row.name || '',
      description: row.description || '',
      frames: row.frames || '',
      angle: Number(row.angle || params.angle),
      ascensionist_count: Number(row.ascensionist_count || 0),
      difficulty: row.difficulty || '',
      quality_average: row.quality_average?.toString() || '0',
      stars: Math.round((Number(row.quality_average) || 0) * 5),
      difficulty_error: row.difficulty_error?.toString() || '0',
      benchmark_difficulty: row.benchmark_difficulty?.toString() || null,
      litUpHoldsMap: convertLitUpHoldsStringToMap(row.frames || '', params.board_name)[0],
      totalHolds: Number(row.total_holds || 0),
      matchingHolds: Number(row.matching_holds || 0),
    }));

    return climbs;
  } catch (error) {
    console.error('Error in getSimilarClimbs:', error);
    throw error;
  }
};
