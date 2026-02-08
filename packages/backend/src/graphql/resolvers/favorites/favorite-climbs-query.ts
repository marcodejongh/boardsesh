import { eq, and, sql, desc } from 'drizzle-orm';
import type { ConnectionContext, Climb, BoardName } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { GetUserFavoriteClimbsInputSchema } from '../../../validation/schemas';
import { getBoardTables, isValidBoardName } from '../../../db/queries/util/table-select';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';
import type { LitUpHoldsMap, HoldState } from '@boardsesh/shared-schema';

// Hold state mapping (same as playlist queries)
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
    45: { name: 'FOOT', color: '#FFAA00' },
    12: { name: 'STARTING', color: '#00FF00' },
    13: { name: 'HAND', color: '#00FFFF' },
    14: { name: 'FINISH', color: '#FF00FF' },
    15: { name: 'FOOT', color: '#FFAA00' },
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
  moonboard: {
    1: { name: 'STARTING', color: '#00FF00' },
    2: { name: 'HAND', color: '#0000FF' },
    3: { name: 'FINISH', color: '#FF0000' },
  },
};

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

export const favoriteClimbsQuery = {
  userFavoriteClimbs: async (
    _: unknown,
    { input }: { input: {
      boardName: string;
      layoutId: number;
      sizeId: number;
      setIds: string;
      angle: number;
      page?: number;
      pageSize?: number;
    } },
    ctx: ConnectionContext
  ): Promise<{ climbs: Climb[]; totalCount: number; hasMore: boolean }> => {
    requireAuthenticated(ctx);
    validateInput(GetUserFavoriteClimbsInputSchema, input, 'input');

    const userId = ctx.userId!;
    const boardName = input.boardName as BoardName;

    if (!isValidBoardName(boardName)) {
      throw new Error(`Invalid board name: ${boardName}. Must be one of: ${SUPPORTED_BOARDS.join(', ')}`);
    }

    const sizeEdges = getSizeEdges(boardName, input.sizeId);
    if (!sizeEdges) {
      throw new Error(`Invalid size ID: ${input.sizeId} for board: ${boardName}`);
    }

    const page = input.page ?? 0;
    const pageSize = input.pageSize ?? 20;
    const tables = getBoardTables(boardName);

    // Get total count of user's favorites for this board
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.userFavorites)
      .where(
        and(
          eq(dbSchema.userFavorites.userId, userId),
          eq(dbSchema.userFavorites.boardName, boardName),
        )
      );

    const totalCount = countResult[0]?.count || 0;

    // Get favorite climbs with full climb data
    const results = await db
      .select({
        climbUuid: dbSchema.userFavorites.climbUuid,
        favoritedAt: dbSchema.userFavorites.createdAt,
        // Climb data
        uuid: tables.climbs.uuid,
        layoutId: tables.climbs.layoutId,
        setter_username: tables.climbs.setterUsername,
        name: tables.climbs.name,
        description: tables.climbs.description,
        frames: tables.climbs.frames,
        // Stats data
        ascensionist_count: tables.climbStats.ascensionistCount,
        difficulty: tables.difficultyGrades.boulderName,
        quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
        difficulty_error: sql<number>`ROUND(${tables.climbStats.difficultyAverage}::numeric - ${tables.climbStats.displayDifficulty}::numeric, 2)`,
        benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
      })
      .from(dbSchema.userFavorites)
      .innerJoin(
        tables.climbs,
        and(
          eq(tables.climbs.uuid, dbSchema.userFavorites.climbUuid),
          eq(tables.climbs.boardType, boardName)
        )
      )
      .leftJoin(
        tables.climbStats,
        and(
          eq(tables.climbStats.climbUuid, dbSchema.userFavorites.climbUuid),
          eq(tables.climbStats.boardType, boardName),
          eq(tables.climbStats.angle, input.angle)
        )
      )
      .leftJoin(
        tables.difficultyGrades,
        and(
          eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`),
          eq(tables.difficultyGrades.boardType, boardName)
        )
      )
      .where(
        and(
          eq(dbSchema.userFavorites.userId, userId),
          eq(dbSchema.userFavorites.boardName, boardName),
        )
      )
      .orderBy(desc(dbSchema.userFavorites.createdAt))
      .limit(pageSize + 1)
      .offset(page * pageSize);

    const hasMore = results.length > pageSize;
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

    const climbs: Climb[] = trimmedResults.map((result) => ({
      uuid: result.uuid || result.climbUuid,
      layoutId: result.layoutId,
      setter_username: result.setter_username || '',
      name: result.name || '',
      description: result.description || '',
      frames: result.frames || '',
      angle: input.angle,
      ascensionist_count: Number(result.ascensionist_count || 0),
      difficulty: result.difficulty || '',
      quality_average: result.quality_average?.toString() || '0',
      stars: Math.round((Number(result.quality_average) || 0) * 5),
      difficulty_error: result.difficulty_error?.toString() || '0',
      benchmark_difficulty: result.benchmark_difficulty?.toString() || null,
      litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', boardName)[0],
    }));

    return {
      climbs,
      totalCount,
      hasMore,
    };
  },
};
