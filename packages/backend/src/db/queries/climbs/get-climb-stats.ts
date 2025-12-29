import { sql, inArray, and, eq } from 'drizzle-orm';
import { db } from '../../client.js';
import { getBoardTables, type BoardName } from '../util/table-select.js';
import type { ClimbStats } from '@boardsesh/shared-schema';

interface GetClimbStatsParams {
  board_name: BoardName;
  angle: number;
  climb_uuids: string[];
}

/**
 * Batch fetch climb stats for multiple climbs at a specific angle.
 * This is designed for efficient caching - immutable climb data can be cached
 * separately from mutable stats which change over time.
 */
export const getClimbStats = async (params: GetClimbStatsParams): Promise<ClimbStats[]> => {
  if (params.climb_uuids.length === 0) {
    return [];
  }

  const tables = getBoardTables(params.board_name);

  try {
    const results = await db
      .select({
        climbUuid: tables.climbStats.climbUuid,
        angle: tables.climbStats.angle,
        ascensionist_count: tables.climbStats.ascensionistCount,
        quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
        difficulty_average: tables.climbStats.difficultyAverage,
        display_difficulty: tables.climbStats.displayDifficulty,
        benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
        difficulty_name: tables.difficultyGrades.boulderName,
      })
      .from(tables.climbStats)
      .leftJoin(
        tables.difficultyGrades,
        eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`)
      )
      .where(
        and(
          inArray(tables.climbStats.climbUuid, params.climb_uuids),
          eq(tables.climbStats.angle, params.angle)
        )
      );

    // Transform to ClimbStats type
    return results.map((row) => ({
      climbUuid: row.climbUuid,
      angle: Number(row.angle),
      ascensionist_count: Number(row.ascensionist_count || 0),
      difficulty: row.difficulty_name || '',
      quality_average: row.quality_average?.toString() || '0',
      stars: Math.round((Number(row.quality_average) || 0) * 5),
      difficulty_error: row.difficulty_average && row.display_difficulty
        ? (Number(row.difficulty_average) - Number(row.display_difficulty)).toFixed(2)
        : '0',
      benchmark_difficulty: row.benchmark_difficulty?.toString() || null,
    }));
  } catch (error) {
    console.error('Error in getClimbStats:', error);
    throw error;
  }
};
