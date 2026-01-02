import { eq, and, inArray, desc, sql, or, isNull, asc } from 'drizzle-orm';
import type { ConnectionContext, Climb } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import {
  GetUserPlaylistsInputSchema,
  GetPlaylistsForClimbInputSchema,
  GetPlaylistClimbsInputSchema,
} from '../../../validation/schemas';
import { getBoardTables, isValidBoardName } from '../../../db/queries/util/table-select';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';
import type { LitUpHoldsMap, HoldState } from '@boardsesh/shared-schema';

// Hold state mapping for converting frames string to lit up holds map
type HoldColor = string;
type HoldCode = number;
type BoardName = 'kilter' | 'tension';

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

export const playlistQueries = {
  /**
   * Get all playlists owned by the authenticated user for a specific board and layout
   */
  userPlaylists: async (
    _: unknown,
    { input }: { input: { boardType: string; layoutId: number } },
    ctx: ConnectionContext
  ): Promise<unknown[]> => {
    requireAuthenticated(ctx);
    validateInput(GetUserPlaylistsInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Get user's playlists with climb counts
    const userPlaylists = await db
      .select({
        id: dbSchema.playlists.id,
        uuid: dbSchema.playlists.uuid,
        boardType: dbSchema.playlists.boardType,
        layoutId: dbSchema.playlists.layoutId,
        name: dbSchema.playlists.name,
        description: dbSchema.playlists.description,
        isPublic: dbSchema.playlists.isPublic,
        color: dbSchema.playlists.color,
        icon: dbSchema.playlists.icon,
        createdAt: dbSchema.playlists.createdAt,
        updatedAt: dbSchema.playlists.updatedAt,
        role: dbSchema.playlistOwnership.role,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .where(
        and(
          eq(dbSchema.playlistOwnership.userId, userId),
          eq(dbSchema.playlists.boardType, input.boardType),
          // Include playlists with matching layoutId OR null layoutId (Aurora-synced circuits)
          or(
            eq(dbSchema.playlists.layoutId, input.layoutId),
            isNull(dbSchema.playlists.layoutId)
          )
        )
      )
      .orderBy(desc(dbSchema.playlists.updatedAt));

    // Get climb counts for each playlist
    const playlistIds = userPlaylists.map(p => p.id);

    const climbCounts =
      playlistIds.length > 0
        ? await db
            .select({
              playlistId: dbSchema.playlistClimbs.playlistId,
              count: sql<number>`count(*)::int`,
            })
            .from(dbSchema.playlistClimbs)
            .where(inArray(dbSchema.playlistClimbs.playlistId, playlistIds))
            .groupBy(dbSchema.playlistClimbs.playlistId)
        : [];

    const countMap = new Map(climbCounts.map(c => [c.playlistId.toString(), c.count]));

    return userPlaylists.map(p => ({
      id: p.id.toString(),
      uuid: p.uuid,
      boardType: p.boardType,
      layoutId: p.layoutId,
      name: p.name,
      description: p.description,
      isPublic: p.isPublic,
      color: p.color,
      icon: p.icon,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      climbCount: countMap.get(p.id.toString()) || 0,
      userRole: p.role,
    }));
  },

  /**
   * Get a specific playlist by ID (requires ownership)
   */
  playlist: async (
    _: unknown,
    { playlistId }: { playlistId: string },
    ctx: ConnectionContext
  ): Promise<unknown | null> => {
    requireAuthenticated(ctx);

    const userId = ctx.userId!;

    // Get playlist with ownership check
    const result = await db
      .select({
        id: dbSchema.playlists.id,
        uuid: dbSchema.playlists.uuid,
        boardType: dbSchema.playlists.boardType,
        layoutId: dbSchema.playlists.layoutId,
        name: dbSchema.playlists.name,
        description: dbSchema.playlists.description,
        isPublic: dbSchema.playlists.isPublic,
        color: dbSchema.playlists.color,
        icon: dbSchema.playlists.icon,
        createdAt: dbSchema.playlists.createdAt,
        updatedAt: dbSchema.playlists.updatedAt,
        role: dbSchema.playlistOwnership.role,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .where(
        and(
          eq(dbSchema.playlists.uuid, playlistId),
          eq(dbSchema.playlistOwnership.userId, userId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const playlist = result[0];

    // Get climb count
    const climbCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.playlistClimbs)
      .where(eq(dbSchema.playlistClimbs.playlistId, playlist.id))
      .limit(1);

    return {
      id: playlist.id.toString(),
      uuid: playlist.uuid,
      boardType: playlist.boardType,
      layoutId: playlist.layoutId,
      name: playlist.name,
      description: playlist.description,
      isPublic: playlist.isPublic,
      color: playlist.color,
      icon: playlist.icon,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      climbCount: climbCount[0]?.count || 0,
      userRole: playlist.role,
    };
  },

  /**
   * Get all playlist IDs that contain a specific climb for the authenticated user
   */
  playlistsForClimb: async (
    _: unknown,
    { input }: { input: { boardType: string; layoutId: number; climbUuid: string } },
    ctx: ConnectionContext
  ): Promise<string[]> => {
    requireAuthenticated(ctx);
    validateInput(GetPlaylistsForClimbInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Get playlists containing this climb (only user's playlists)
    // Returns UUIDs (not numeric IDs) for consistency with mutations
    const results = await db
      .select({ playlistUuid: dbSchema.playlists.uuid })
      .from(dbSchema.playlistClimbs)
      .innerJoin(
        dbSchema.playlists,
        eq(dbSchema.playlists.id, dbSchema.playlistClimbs.playlistId)
      )
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .where(
        and(
          eq(dbSchema.playlistClimbs.climbUuid, input.climbUuid),
          eq(dbSchema.playlists.boardType, input.boardType),
          // Include playlists with matching layoutId OR null layoutId (Aurora-synced circuits)
          or(
            eq(dbSchema.playlists.layoutId, input.layoutId),
            isNull(dbSchema.playlists.layoutId)
          ),
          eq(dbSchema.playlistOwnership.userId, userId)
        )
      );

    return results.map(r => r.playlistUuid);
  },

  /**
   * Get climbs in a playlist with full climb data
   */
  playlistClimbs: async (
    _: unknown,
    { input }: { input: {
      playlistId: string;
      boardName: string;
      layoutId: number;
      sizeId: number;
      setIds: string;
      page?: number;
      pageSize?: number;
    } },
    ctx: ConnectionContext
  ): Promise<{ climbs: Climb[]; totalCount: number; hasMore: boolean }> => {
    requireAuthenticated(ctx);
    validateInput(GetPlaylistClimbsInputSchema, input, 'input');

    const userId = ctx.userId!;
    const boardName = input.boardName as BoardName;

    // Validate board name
    if (!isValidBoardName(boardName)) {
      throw new Error(`Invalid board name: ${boardName}. Must be 'kilter' or 'tension'`);
    }

    // Get size edges for filtering
    const sizeEdges = getSizeEdges(boardName, input.sizeId);
    if (!sizeEdges) {
      throw new Error(`Invalid size ID: ${input.sizeId} for board: ${boardName}`);
    }

    const page = input.page ?? 0;
    const pageSize = input.pageSize ?? 20;

    // First, verify the user has access to this playlist
    const playlistResult = await db
      .select({
        id: dbSchema.playlists.id,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .where(
        and(
          eq(dbSchema.playlists.uuid, input.playlistId),
          eq(dbSchema.playlistOwnership.userId, userId)
        )
      )
      .limit(1);

    if (playlistResult.length === 0) {
      throw new Error('Playlist not found or access denied');
    }

    const playlistId = playlistResult[0].id;
    const tables = getBoardTables(boardName);

    // Get total count of climbs in the playlist
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.playlistClimbs)
      .where(eq(dbSchema.playlistClimbs.playlistId, playlistId));

    const totalCount = countResult[0]?.count || 0;

    // Get playlist climbs with full climb data
    // Note: We use a subquery approach to avoid duplicates when joining stats
    // The issue: when playlistClimbs.angle is NULL, directly using COALESCE causes cartesian product
    const results = await db
      .select({
        // Playlist climb data
        climbUuid: dbSchema.playlistClimbs.climbUuid,
        angle: dbSchema.playlistClimbs.angle,
        position: dbSchema.playlistClimbs.position,
        // Climb data
        uuid: tables.climbs.uuid,
        layoutId: tables.climbs.layoutId,
        setter_username: tables.climbs.setterUsername,
        name: tables.climbs.name,
        description: tables.climbs.description,
        frames: tables.climbs.frames,
        // Stats data - use the angle from playlist if available, otherwise use climb's default angle
        ascensionist_count: tables.climbStats.ascensionistCount,
        difficulty: tables.difficultyGrades.boulderName,
        quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
        difficulty_error: sql<number>`ROUND(${tables.climbStats.difficultyAverage}::numeric - ${tables.climbStats.displayDifficulty}::numeric, 2)`,
        benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
      })
      .from(dbSchema.playlistClimbs)
      .innerJoin(
        tables.climbs,
        eq(tables.climbs.uuid, dbSchema.playlistClimbs.climbUuid)
      )
      .leftJoin(
        tables.climbStats,
        and(
          eq(tables.climbStats.climbUuid, dbSchema.playlistClimbs.climbUuid),
          // Only join stats when we have a specific angle to match
          // Use playlist angle if set, otherwise use climb's default angle
          eq(tables.climbStats.angle, sql`COALESCE(${dbSchema.playlistClimbs.angle}, ${tables.climbs.angle})`)
        )
      )
      .leftJoin(
        tables.difficultyGrades,
        eq(tables.difficultyGrades.difficulty, sql`ROUND(${tables.climbStats.displayDifficulty}::numeric)`)
      )
      .where(eq(dbSchema.playlistClimbs.playlistId, playlistId))
      .orderBy(asc(dbSchema.playlistClimbs.position), asc(dbSchema.playlistClimbs.addedAt))
      .limit(pageSize + 1)
      .offset(page * pageSize);

    // Check if there are more results available
    const hasMore = results.length > pageSize;
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

    // Transform results to Climb type
    const climbs: Climb[] = trimmedResults.map((result) => ({
      uuid: result.uuid || result.climbUuid,
      layoutId: result.layoutId,
      setter_username: result.setter_username || '',
      name: result.name || '',
      description: result.description || '',
      frames: result.frames || '',
      angle: result.angle ?? 0,
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
