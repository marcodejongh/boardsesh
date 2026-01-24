import { eq, and, inArray, desc, sql, or, isNull, asc } from 'drizzle-orm';
import type { ConnectionContext, Climb, BoardName } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS, convertLitUpHoldsStringToMap } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import {
  GetUserPlaylistsInputSchema,
  GetPlaylistsForClimbInputSchema,
  GetPlaylistClimbsInputSchema,
  DiscoverPlaylistsInputSchema,
  GetPlaylistCreatorsInputSchema,
} from '../../../validation/schemas';
import { getBoardTables, isValidBoardName } from '../../../db/queries/util/table-select';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';

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
      angle: number;
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
      throw new Error(`Invalid board name: ${boardName}. Must be one of: ${SUPPORTED_BOARDS.join(', ')}`);
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
        and(
          eq(tables.climbs.uuid, dbSchema.playlistClimbs.climbUuid),
          eq(tables.climbs.boardType, boardName)
        )
      )
      .leftJoin(
        tables.climbStats,
        and(
          eq(tables.climbStats.climbUuid, dbSchema.playlistClimbs.climbUuid),
          eq(tables.climbStats.boardType, boardName),
          // Use the route angle (from input) to fetch stats for the current board angle
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
      .where(eq(dbSchema.playlistClimbs.playlistId, playlistId))
      .orderBy(asc(dbSchema.playlistClimbs.position), asc(dbSchema.playlistClimbs.addedAt))
      .limit(pageSize + 1)
      .offset(page * pageSize);

    // Check if there are more results available
    const hasMore = results.length > pageSize;
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

    // Transform results to Climb type
    // Use the input angle (route angle) for consistent stats display
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

  /**
   * Discover public playlists with at least 1 climb for a specific board and layout
   * No authentication required
   */
  discoverPlaylists: async (
    _: unknown,
    { input }: { input: {
      boardType: string;
      layoutId: number;
      name?: string;
      creatorIds?: string[];
      page?: number;
      pageSize?: number;
    } },
    _ctx: ConnectionContext
  ): Promise<{ playlists: unknown[]; totalCount: number; hasMore: boolean }> => {
    validateInput(DiscoverPlaylistsInputSchema, input, 'input');

    const page = input.page ?? 0;
    const pageSize = input.pageSize ?? 20;

    // Build conditions for filtering
    const conditions = [
      eq(dbSchema.playlists.isPublic, true),
      eq(dbSchema.playlists.boardType, input.boardType),
      // Include playlists with matching layoutId OR null layoutId (Aurora-synced circuits)
      or(
        eq(dbSchema.playlists.layoutId, input.layoutId),
        isNull(dbSchema.playlists.layoutId)
      ),
    ];

    // Add name filter if provided (case-insensitive partial match)
    if (input.name) {
      conditions.push(sql`LOWER(${dbSchema.playlists.name}) LIKE LOWER(${'%' + input.name + '%'})`);
    }

    // Add creator filter if provided
    if (input.creatorIds && input.creatorIds.length > 0) {
      conditions.push(inArray(dbSchema.playlistOwnership.userId, input.creatorIds));
    }

    // First get total count of matching playlists with at least 1 climb
    const countResult = await db
      .select({ count: sql<number>`count(DISTINCT ${dbSchema.playlists.id})::int` })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.playlistClimbs,
        eq(dbSchema.playlistClimbs.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.users,
        eq(dbSchema.users.id, dbSchema.playlistOwnership.userId)
      )
      .where(and(...conditions, eq(dbSchema.playlistOwnership.role, 'owner')));

    const totalCount = countResult[0]?.count || 0;

    // Get playlists with creator info and climb counts
    const results = await db
      .selectDistinctOn([dbSchema.playlists.id], {
        id: dbSchema.playlists.id,
        uuid: dbSchema.playlists.uuid,
        boardType: dbSchema.playlists.boardType,
        layoutId: dbSchema.playlists.layoutId,
        name: dbSchema.playlists.name,
        description: dbSchema.playlists.description,
        color: dbSchema.playlists.color,
        icon: dbSchema.playlists.icon,
        createdAt: dbSchema.playlists.createdAt,
        updatedAt: dbSchema.playlists.updatedAt,
        creatorId: dbSchema.playlistOwnership.userId,
        creatorName: sql<string>`COALESCE(${dbSchema.users.name}, 'Anonymous')`,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.playlistClimbs,
        eq(dbSchema.playlistClimbs.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.users,
        eq(dbSchema.users.id, dbSchema.playlistOwnership.userId)
      )
      .where(and(...conditions, eq(dbSchema.playlistOwnership.role, 'owner')))
      .orderBy(dbSchema.playlists.id, desc(dbSchema.playlists.updatedAt))
      .limit(pageSize + 1)
      .offset(page * pageSize);

    // Check if there are more results
    const hasMore = results.length > pageSize;
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

    // Get climb counts for each playlist
    const playlistIds = trimmedResults.map(p => p.id);
    const climbCounts = playlistIds.length > 0
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

    const playlists = trimmedResults.map(p => ({
      id: p.id.toString(),
      uuid: p.uuid,
      boardType: p.boardType,
      layoutId: p.layoutId,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      climbCount: countMap.get(p.id.toString()) || 0,
      creatorId: p.creatorId,
      creatorName: p.creatorName,
    }));

    return {
      playlists,
      totalCount,
      hasMore,
    };
  },

  /**
   * Get playlist creators for autocomplete
   * Returns users who have created public playlists with at least 1 climb
   */
  playlistCreators: async (
    _: unknown,
    { input }: { input: {
      boardType: string;
      layoutId: number;
      searchQuery?: string;
    } },
    _ctx: ConnectionContext
  ): Promise<unknown[]> => {
    validateInput(GetPlaylistCreatorsInputSchema, input, 'input');

    // Build base conditions
    const conditions = [
      eq(dbSchema.playlists.isPublic, true),
      eq(dbSchema.playlists.boardType, input.boardType),
      or(
        eq(dbSchema.playlists.layoutId, input.layoutId),
        isNull(dbSchema.playlists.layoutId)
      ),
      eq(dbSchema.playlistOwnership.role, 'owner'),
    ];

    // Add search query filter if provided (only search by name, not email)
    if (input.searchQuery) {
      conditions.push(
        sql`LOWER(${dbSchema.users.name}) LIKE LOWER(${'%' + input.searchQuery + '%'})`
      );
    }

    // Get creators with their playlist counts
    const results = await db
      .select({
        userId: dbSchema.playlistOwnership.userId,
        displayName: sql<string>`COALESCE(${dbSchema.users.name}, 'Anonymous')`,
        playlistCount: sql<number>`count(DISTINCT ${dbSchema.playlists.id})::int`,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.playlistClimbs,
        eq(dbSchema.playlistClimbs.playlistId, dbSchema.playlists.id)
      )
      .innerJoin(
        dbSchema.users,
        eq(dbSchema.users.id, dbSchema.playlistOwnership.userId)
      )
      .where(and(...conditions))
      .groupBy(dbSchema.playlistOwnership.userId, dbSchema.users.name)
      .orderBy(desc(sql`count(DISTINCT ${dbSchema.playlists.id})`))
      .limit(20);

    return results;
  },
};
