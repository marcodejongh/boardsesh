import { sql } from 'drizzle-orm';
import { db } from '../../client';
import { getBoardTables, type BoardName } from '../util/table-select';
import type { Climb } from '@boardsesh/shared-schema';
import { convertLitUpHoldsStringToMap } from '../util/hold-state';

interface GetClimbParams {
  board_name: BoardName;
  layout_id: number;
  size_id: number;
  angle: number;
  climb_uuid: string;
}

export const getClimbByUuid = async (params: GetClimbParams): Promise<Climb | null> => {
  const tables = getBoardTables(params.board_name);

  try {
    const result = await db
      .select({
        uuid: tables.climbs.uuid,
        setter_username: tables.climbs.setterUsername,
        name: tables.climbs.name,
        description: tables.climbs.description,
        frames: tables.climbs.frames,
        angle: sql<number>`COALESCE(${tables.climbStats.angle}, ${params.angle})`,
        ascensionist_count: sql<number>`COALESCE(${tables.climbStats.ascensionistCount}, 0)`,
        difficulty: tables.difficultyGrades.boulderName,
        quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
        difficulty_error: sql<number>`ROUND(${tables.climbStats.difficultyAverage}::numeric - ${tables.climbStats.displayDifficulty}::numeric, 2)`,
        benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
      })
      .from(tables.climbs)
      .leftJoin(
        tables.climbStats,
        sql`${tables.climbStats.climbUuid} = ${tables.climbs.uuid}
        AND ${tables.climbStats.boardType} = ${params.board_name}
        AND ${tables.climbStats.angle} = ${params.angle}`
      )
      .leftJoin(
        tables.difficultyGrades,
        sql`${tables.difficultyGrades.difficulty} = ROUND(${tables.climbStats.displayDifficulty}::numeric)
        AND ${tables.difficultyGrades.boardType} = ${params.board_name}`
      )
      .where(
        sql`${tables.climbs.boardType} = ${params.board_name}
        AND ${tables.climbs.layoutId} = ${params.layout_id}
        AND ${tables.climbs.uuid} = ${params.climb_uuid}
        AND ${tables.climbs.framesCount} = 1`
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];

    // Transform the result into the complete Climb type
    const climb: Climb = {
      uuid: row.uuid,
      setter_username: row.setter_username || '',
      name: row.name || '',
      description: row.description || '',
      frames: row.frames || '',
      angle: Number(params.angle),
      ascensionist_count: Number(row.ascensionist_count || 0),
      difficulty: row.difficulty || '',
      quality_average: row.quality_average?.toString() || '0',
      stars: Math.round((Number(row.quality_average) || 0) * 5),
      difficulty_error: row.difficulty_error?.toString() || '0',
      benchmark_difficulty: row.benchmark_difficulty?.toString() || null,
      litUpHoldsMap: convertLitUpHoldsStringToMap(row.frames || '', params.board_name)[0] || {},
    };

    return climb;
  } catch (error) {
    console.error('Error in getClimbByUuid:', error);
    throw error;
  }
};
