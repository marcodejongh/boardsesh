import { eq, and, inArray, desc, sql, or, isNull, asc } from 'drizzle-orm';
import type { ConnectionContext, Climb, BoardName } from '@boardsesh/shared-schema';
import { SUPPORTED_BOARDS } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import {
  GetUserPlaylistsInputSchema,
  GetAllUserPlaylistsInputSchema,
  GetPlaylistsForClimbInputSchema,
  GetPlaylistClimbsInputSchema,
  DiscoverPlaylistsInputSchema,
  GetPlaylistCreatorsInputSchema,
  SearchPlaylistsInputSchema,
} from '../../../validation/schemas';
import { getBoardTables, isValidBoardName } from '../../../db/queries/util/table-select';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';
import { convertLitUpHoldsStringToMap } from '../../../db/queries/util/hold-state';

/**
 * Batch-fetch followerCount and isFollowedByMe for a list of playlist UUIDs.
 * Returns a Map keyed by playlist UUID.
 */
export async function getPlaylistFollowStats(
  playlistUuids: string[],
  currentUserId: string | null,
): Promise<Map<string, { followerCount: number; isFollowedByMe: boolean }>> {
  const result = new Map<string, { followerCount: number; isFollowedByMe: boolean }>();

  if (playlistUuids.length === 0) return result;

  // Follower counts
  const followerCounts = await db
    .select({
      playlistUuid: dbSchema.playlistFollows.playlistUuid,
      count: sql<number>`count(*)::int`,
    })
    .from(dbSchema.playlistFollows)
    .where(inArray(dbSchema.playlistFollows.playlistUuid, playlistUuids))
    .groupBy(dbSchema.playlistFollows.playlistUuid);

  const countMap = new Map(followerCounts.map(r => [r.playlistUuid, r.count]));

  // Is-followed-by-me check (only if authenticated)
  const followedSet = new Set<string>();
  if (currentUserId) {
    const followed = await db
      .select({ playlistUuid: dbSchema.playlistFollows.playlistUuid })
      .from(dbSchema.playlistFollows)
      .where(
        and(
          eq(dbSchema.playlistFollows.followerId, currentUserId),
          inArray(dbSchema.playlistFollows.playlistUuid, playlistUuids),
        )
      );
    for (const r of followed) {
      followedSet.add(r.playlistUuid);
    }
  }

  for (const uuid of playlistUuids) {
    result.set(uuid, {
      followerCount: countMap.get(uuid) ?? 0,
      isFollowedByMe: followedSet.has(uuid),
    });
  }

  return result;
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
        lastAccessedAt: dbSchema.playlists.lastAccessedAt,
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
      .orderBy(
        desc(sql`COALESCE(${dbSchema.playlists.lastAccessedAt}, ${dbSchema.playlists.updatedAt})`),
      );

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

    // Fetch follow stats for all playlists
    const followStats = await getPlaylistFollowStats(
      userPlaylists.map(p => p.uuid),
      userId,
    );

    return userPlaylists.map(p => {
      const stats = followStats.get(p.uuid) ?? { followerCount: 0, isFollowedByMe: false };
      return {
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
        lastAccessedAt: p.lastAccessedAt?.toISOString() ?? null,
        climbCount: countMap.get(p.id.toString()) || 0,
        userRole: p.role,
        followerCount: stats.followerCount,
        isFollowedByMe: stats.isFollowedByMe,
      };
    });
  },

  /**
   * Get all playlists owned by the authenticated user, optionally filtered by board type.
   * No layoutId filter — shows playlists across all layouts.
   */
  allUserPlaylists: async (
    _: unknown,
    { input }: { input: { boardType?: string } },
    ctx: ConnectionContext
  ): Promise<unknown[]> => {
    requireAuthenticated(ctx);
    validateInput(GetAllUserPlaylistsInputSchema, input, 'input');

    const userId = ctx.userId!;

    const conditions = [eq(dbSchema.playlistOwnership.userId, userId)];

    if (input.boardType) {
      conditions.push(eq(dbSchema.playlists.boardType, input.boardType));
    }

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
        lastAccessedAt: dbSchema.playlists.lastAccessedAt,
        role: dbSchema.playlistOwnership.role,
      })
      .from(dbSchema.playlists)
      .innerJoin(
        dbSchema.playlistOwnership,
        eq(dbSchema.playlistOwnership.playlistId, dbSchema.playlists.id)
      )
      .where(and(...conditions))
      .orderBy(
        desc(sql`COALESCE(${dbSchema.playlists.lastAccessedAt}, ${dbSchema.playlists.updatedAt})`),
      );

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

    // Fetch follow stats for all playlists
    const followStats = await getPlaylistFollowStats(
      userPlaylists.map(p => p.uuid),
      userId,
    );

    return userPlaylists.map(p => {
      const stats = followStats.get(p.uuid) ?? { followerCount: 0, isFollowedByMe: false };
      return {
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
        lastAccessedAt: p.lastAccessedAt?.toISOString() ?? null,
        climbCount: countMap.get(p.id.toString()) || 0,
        userRole: p.role,
        followerCount: stats.followerCount,
        isFollowedByMe: stats.isFollowedByMe,
      };
    });
  },

  /**
   * Get a specific playlist by ID
   * Public playlists are viewable by anyone; private playlists require ownership
   */
  playlist: async (
    _: unknown,
    { playlistId }: { playlistId: string },
    ctx: ConnectionContext
  ): Promise<unknown | null> => {
    const userId = ctx.userId;

    // Fetch the playlist by UUID without ownership filter
    const playlistResult = await db
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
        lastAccessedAt: dbSchema.playlists.lastAccessedAt,
      })
      .from(dbSchema.playlists)
      .where(eq(dbSchema.playlists.uuid, playlistId))
      .limit(1);

    if (playlistResult.length === 0) return null;

    const playlist = playlistResult[0];

    // Check user's role if authenticated
    let userRole: string | null = null;
    if (userId) {
      const ownershipResult = await db
        .select({ role: dbSchema.playlistOwnership.role })
        .from(dbSchema.playlistOwnership)
        .where(
          and(
            eq(dbSchema.playlistOwnership.playlistId, playlist.id),
            eq(dbSchema.playlistOwnership.userId, userId)
          )
        )
        .limit(1);

      if (ownershipResult.length > 0) {
        userRole = ownershipResult[0].role;
      }
    }

    // If playlist is private and user is not an owner/member, deny access
    if (!playlist.isPublic && !userRole) {
      return null;
    }

    // Get climb count
    const climbCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.playlistClimbs)
      .where(eq(dbSchema.playlistClimbs.playlistId, playlist.id))
      .limit(1);

    // Get follow stats
    const followStats = await getPlaylistFollowStats([playlist.uuid], userId ?? null);
    const stats = followStats.get(playlist.uuid) ?? { followerCount: 0, isFollowedByMe: false };

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
      lastAccessedAt: playlist.lastAccessedAt?.toISOString() ?? null,
      climbCount: climbCount[0]?.count || 0,
      userRole,
      followerCount: stats.followerCount,
      isFollowedByMe: stats.isFollowedByMe,
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
   * Get climbs in a playlist with full climb data.
   * Supports two modes:
   * - Specific-board mode (when boardName is provided): filters by board type, layout, and size edges
   * - All-boards mode (when boardName is omitted): returns climbs across all board types
   */
  playlistClimbs: async (
    _: unknown,
    { input }: { input: {
      playlistId: string;
      boardName?: string;
      layoutId?: number;
      sizeId?: number;
      setIds?: string;
      angle?: number;
      page?: number;
      pageSize?: number;
    } },
    ctx: ConnectionContext
  ): Promise<{ climbs: Climb[]; totalCount: number; hasMore: boolean }> => {
    validateInput(GetPlaylistClimbsInputSchema, input, 'input');

    const userId = ctx.userId;
    const page = input.page ?? 0;
    const pageSize = input.pageSize ?? 20;

    // Verify the user has access to this playlist
    const playlistResult = await db
      .select({
        id: dbSchema.playlists.id,
        isPublic: dbSchema.playlists.isPublic,
      })
      .from(dbSchema.playlists)
      .where(eq(dbSchema.playlists.uuid, input.playlistId))
      .limit(1);

    if (playlistResult.length === 0) {
      throw new Error('Playlist not found or access denied');
    }

    // If playlist is private, require ownership
    if (!playlistResult[0].isPublic) {
      if (!userId) {
        throw new Error('Playlist not found or access denied');
      }

      const ownershipResult = await db
        .select({ role: dbSchema.playlistOwnership.role })
        .from(dbSchema.playlistOwnership)
        .where(
          and(
            eq(dbSchema.playlistOwnership.playlistId, playlistResult[0].id),
            eq(dbSchema.playlistOwnership.userId, userId)
          )
        )
        .limit(1);

      if (ownershipResult.length === 0) {
        throw new Error('Playlist not found or access denied');
      }
    }

    const playlistId = playlistResult[0].id;

    // Get total count of climbs in the playlist
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dbSchema.playlistClimbs)
      .where(eq(dbSchema.playlistClimbs.playlistId, playlistId));

    const totalCount = countResult[0]?.count || 0;

    if (input.boardName) {
      // === Specific-board mode ===
      const boardName = input.boardName as BoardName;
      if (!isValidBoardName(boardName)) {
        throw new Error(`Invalid board name: ${boardName}. Must be one of: ${SUPPORTED_BOARDS.join(', ')}`);
      }

      const tables = getBoardTables(boardName);

      // Build climb join conditions
      const climbJoinConditions = [
        eq(tables.climbs.uuid, dbSchema.playlistClimbs.climbUuid),
        eq(tables.climbs.boardType, boardName),
      ];

      // Filter by layout if provided
      if (input.layoutId != null) {
        climbJoinConditions.push(eq(tables.climbs.layoutId, input.layoutId));
      }

      // Filter by size edges if sizeId is provided
      if (input.sizeId != null) {
        const sizeEdges = getSizeEdges(boardName, input.sizeId);
        if (sizeEdges && boardName !== 'moonboard') {
          climbJoinConditions.push(
            sql`${tables.climbs.edgeLeft} > ${sizeEdges.edgeLeft}`,
            sql`${tables.climbs.edgeRight} < ${sizeEdges.edgeRight}`,
            sql`${tables.climbs.edgeBottom} > ${sizeEdges.edgeBottom}`,
            sql`${tables.climbs.edgeTop} < ${sizeEdges.edgeTop}`,
          );
        }
      }

      const inputAngle = input.angle ?? 40;

      const results = await db
        .select({
          climbUuid: dbSchema.playlistClimbs.climbUuid,
          playlistAngle: dbSchema.playlistClimbs.angle,
          position: dbSchema.playlistClimbs.position,
          uuid: tables.climbs.uuid,
          layoutId: tables.climbs.layoutId,
          setter_username: tables.climbs.setterUsername,
          name: tables.climbs.name,
          description: tables.climbs.description,
          frames: tables.climbs.frames,
          ascensionist_count: tables.climbStats.ascensionistCount,
          difficulty: tables.difficultyGrades.boulderName,
          quality_average: sql<number>`ROUND(${tables.climbStats.qualityAverage}::numeric, 2)`,
          difficulty_error: sql<number>`ROUND(${tables.climbStats.difficultyAverage}::numeric - ${tables.climbStats.displayDifficulty}::numeric, 2)`,
          benchmark_difficulty: tables.climbStats.benchmarkDifficulty,
        })
        .from(dbSchema.playlistClimbs)
        .innerJoin(
          tables.climbs,
          and(...climbJoinConditions)
        )
        .leftJoin(
          tables.climbStats,
          and(
            eq(tables.climbStats.climbUuid, dbSchema.playlistClimbs.climbUuid),
            eq(tables.climbStats.boardType, boardName),
            eq(tables.climbStats.angle, inputAngle)
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

      const hasMore = results.length > pageSize;
      const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

      const climbs: Climb[] = trimmedResults.map((result) => ({
        uuid: result.uuid || result.climbUuid,
        layoutId: result.layoutId,
        setter_username: result.setter_username || '',
        name: result.name || '',
        description: result.description || '',
        frames: result.frames || '',
        angle: inputAngle,
        ascensionist_count: Number(result.ascensionist_count || 0),
        difficulty: result.difficulty || '',
        quality_average: result.quality_average?.toString() || '0',
        stars: Math.round((Number(result.quality_average) || 0) * 5),
        difficulty_error: result.difficulty_error?.toString() || '0',
        benchmark_difficulty: result.benchmark_difficulty && result.benchmark_difficulty > 0 ? result.benchmark_difficulty.toString() : null,
        litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', boardName)[0],
        boardType: boardName,
      }));

      return { climbs, totalCount, hasMore };
    } else {
      // === All-boards mode ===
      // Query across all board types, following the setterClimbsFull all-boards pattern
      const DEFAULT_ANGLE = 40;
      const tables = getBoardTables('kilter'); // All unified — just need table refs

      const results = await db
        .select({
          climbUuid: dbSchema.playlistClimbs.climbUuid,
          position: dbSchema.playlistClimbs.position,
          playlistAngle: dbSchema.playlistClimbs.angle,
          uuid: tables.climbs.uuid,
          layoutId: tables.climbs.layoutId,
          boardType: tables.climbs.boardType,
          setter_username: tables.climbs.setterUsername,
          name: tables.climbs.name,
          description: tables.climbs.description,
          frames: tables.climbs.frames,
          statsAngle: tables.climbStats.angle,
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
          // No boardType filter — join across all boards
        )
        .leftJoin(
          tables.climbStats,
          and(
            eq(tables.climbStats.boardType, tables.climbs.boardType),
            eq(tables.climbStats.climbUuid, tables.climbs.uuid),
            eq(tables.climbStats.angle, sql`(
              SELECT s.angle FROM board_climb_stats s
              WHERE s.board_type = ${tables.climbs.boardType}
                AND s.climb_uuid = ${tables.climbs.uuid}
              ORDER BY s.ascensionist_count DESC NULLS LAST
              LIMIT 1
            )`)
          )
        )
        .leftJoin(
          tables.difficultyGrades,
          and(
            eq(tables.difficultyGrades.boardType, tables.climbs.boardType),
            eq(tables.difficultyGrades.difficulty, sql`CAST(${tables.climbStats.displayDifficulty} AS INTEGER)`)
          )
        )
        .where(eq(dbSchema.playlistClimbs.playlistId, playlistId))
        .orderBy(asc(dbSchema.playlistClimbs.position), asc(dbSchema.playlistClimbs.addedAt))
        .limit(pageSize + 1)
        .offset(page * pageSize);

      const hasMore = results.length > pageSize;
      const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

      const climbs: Climb[] = trimmedResults.map((result) => {
        const bt = (result.boardType || 'kilter') as BoardName;
        return {
          uuid: result.uuid || result.climbUuid,
          layoutId: result.layoutId,
          setter_username: result.setter_username || '',
          name: result.name || '',
          description: result.description || '',
          frames: result.frames || '',
          angle: result.playlistAngle ?? result.statsAngle ?? DEFAULT_ANGLE,
          ascensionist_count: Number(result.ascensionist_count || 0),
          difficulty: result.difficulty || '',
          quality_average: result.quality_average?.toString() || '0',
          stars: Math.round((Number(result.quality_average) || 0) * 5),
          difficulty_error: result.difficulty_error?.toString() || '0',
          benchmark_difficulty: result.benchmark_difficulty && result.benchmark_difficulty > 0 ? result.benchmark_difficulty.toString() : null,
          litUpHoldsMap: convertLitUpHoldsStringToMap(result.frames || '', bt)[0],
          boardType: bt,
        };
      });

      return { climbs, totalCount, hasMore };
    }
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
      sortBy?: 'recent' | 'popular';
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

    // Get playlists with creator info and climb counts in a single query
    const results = await db
      .select({
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
        climbCount: sql<number>`count(DISTINCT ${dbSchema.playlistClimbs.id})::int`,
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
      .groupBy(
        dbSchema.playlists.id,
        dbSchema.playlists.uuid,
        dbSchema.playlists.boardType,
        dbSchema.playlists.layoutId,
        dbSchema.playlists.name,
        dbSchema.playlists.description,
        dbSchema.playlists.color,
        dbSchema.playlists.icon,
        dbSchema.playlists.createdAt,
        dbSchema.playlists.updatedAt,
        dbSchema.playlistOwnership.userId,
        dbSchema.users.name,
      )
      .orderBy(
        input.sortBy === 'popular'
          ? desc(sql`count(DISTINCT ${dbSchema.playlistClimbs.id})`)
          : desc(dbSchema.playlists.createdAt),
        desc(dbSchema.playlists.updatedAt),
      )
      .limit(pageSize + 1)
      .offset(page * pageSize);

    // Check if there are more results
    const hasMore = results.length > pageSize;
    const trimmedResults = hasMore ? results.slice(0, pageSize) : results;

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
      climbCount: p.climbCount,
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

  /**
   * Search public playlists globally by name.
   * No authentication required.
   */
  searchPlaylists: async (
    _: unknown,
    { input }: { input: unknown },
    _ctx: ConnectionContext
  ): Promise<{ playlists: unknown[]; totalCount: number; hasMore: boolean }> => {
    const validatedInput = validateInput(SearchPlaylistsInputSchema, input, 'input');

    const limit = validatedInput.limit ?? 20;
    const offset = validatedInput.offset ?? 0;

    // Build conditions
    const conditions = [
      eq(dbSchema.playlists.isPublic, true),
    ];

    // Name filter (required, ILIKE partial match)
    const escapedQuery = validatedInput.query.replace(/[%_\\]/g, '\\$&');
    conditions.push(sql`LOWER(${dbSchema.playlists.name}) LIKE LOWER(${'%' + escapedQuery + '%'})`);

    // Optional board type filter
    if (validatedInput.boardType) {
      conditions.push(eq(dbSchema.playlists.boardType, validatedInput.boardType));
    }

    // Get total count of matching playlists with at least 1 climb
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

    // Get playlists with creator info
    const results = await db
      .select({
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
        climbCount: sql<number>`count(DISTINCT ${dbSchema.playlistClimbs.id})::int`,
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
      .groupBy(
        dbSchema.playlists.id,
        dbSchema.playlists.uuid,
        dbSchema.playlists.boardType,
        dbSchema.playlists.layoutId,
        dbSchema.playlists.name,
        dbSchema.playlists.description,
        dbSchema.playlists.color,
        dbSchema.playlists.icon,
        dbSchema.playlists.createdAt,
        dbSchema.playlists.updatedAt,
        dbSchema.playlistOwnership.userId,
        dbSchema.users.name,
      )
      .orderBy(
        desc(sql`count(DISTINCT ${dbSchema.playlistClimbs.id})`),
        desc(dbSchema.playlists.createdAt),
      )
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const trimmedResults = hasMore ? results.slice(0, limit) : results;

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
      climbCount: p.climbCount,
      creatorId: p.creatorId,
      creatorName: p.creatorName,
    }));

    return {
      playlists,
      totalCount,
      hasMore,
    };
  },
};
