import { sql } from 'drizzle-orm';
import { db } from '../../client';
import { getBoardTables, type BoardName } from '../util/table-select';
import type { Climb, LitUpHoldsMap, HoldState } from '@boardsesh/shared-schema';

// Hold state mapping for converting frames string to lit up holds map
type HoldColor = string;
type HoldCode = number;

const HOLD_STATE_MAP: Record<
  BoardName,
  Record<HoldCode, { name: HoldState; color: HoldColor; displayColor?: HoldColor }>
> = {
  kilter: {
    42: { name: 'STARTING', color: '#00FF00' },
    43: { name: 'HAND', color: '#00FFFF' },
    44: { name: 'FINISH', color: '#FF00FF' },
    45: { name: 'FOOT', color: '#FFA500' },
    12: { name: 'STARTING', color: '#00FF00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFA500' },
  },
  tension: {
    1: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    2: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    3: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    4: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
    5: { name: 'STARTING', displayColor: '#00DD00', color: '#00FF00' },
    6: { name: 'HAND', displayColor: '#4444FF', color: '#0000FF' },
    7: { name: 'FINISH', displayColor: '#FF0000', color: '#FF0000' },
    8: { name: 'FOOT', displayColor: '#FF00FF', color: '#FF00FF' },
  },
};

// Warned hold states to avoid log spam
const warnedHoldStates = new Set<string>();

/**
 * Convert lit up holds string to a map
 * Returns only the first frame for single-frame climbs
 */
function convertLitUpHoldsStringToMap(litUpHolds: string, board: BoardName): Record<number, LitUpHoldsMap> {
  return litUpHolds
    .split(',')
    .filter((frame) => frame)
    .reduce(
      (frameMap, frameString, frameIndex) => {
        const frameHoldsMap = Object.fromEntries(
          frameString
            .split('p')
            .filter((hold) => hold)
            .map((holdData) => holdData.split('r').map((str) => Number(str)))
            .map(([holdId, stateCode]) => {
              const stateInfo = HOLD_STATE_MAP[board]?.[stateCode];
              if (!stateInfo) {
                // Rate-limit warnings to avoid log spam
                const warnKey = `${board}:${stateCode}`;
                if (!warnedHoldStates.has(warnKey)) {
                  warnedHoldStates.add(warnKey);
                  console.warn(
                    `HOLD_STATE_MAP is missing values for ${board} status code: ${stateCode} (this warning is only shown once per status code)`,
                  );
                }
                return [holdId || 0, { state: `${holdId}=${stateCode}` as HoldState, color: '#FFF', displayColor: '#FFF' }];
              }
              const { name, color, displayColor } = stateInfo;
              return [holdId, { state: name, color, displayColor: displayColor || color }];
            }),
        );
        frameMap[frameIndex] = frameHoldsMap as LitUpHoldsMap;
        return frameMap;
      },
      {} as Record<number, LitUpHoldsMap>,
    );
}

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
