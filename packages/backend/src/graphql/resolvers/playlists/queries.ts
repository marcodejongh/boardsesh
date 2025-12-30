import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client.js';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers.js';
import {
  GetUserPlaylistsInputSchema,
  GetPlaylistsForClimbInputSchema,
} from '../../../validation/schemas.js';

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
          eq(dbSchema.playlists.layoutId, input.layoutId)
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
    if (!ctx.isAuthenticated || !ctx.userId) {
      return [];
    }

    validateInput(GetPlaylistsForClimbInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Get playlists containing this climb (only user's playlists)
    const results = await db
      .select({ playlistId: dbSchema.playlistClimbs.playlistId })
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
          eq(dbSchema.playlists.layoutId, input.layoutId),
          eq(dbSchema.playlistOwnership.userId, userId)
        )
      );

    return results.map(r => r.playlistId.toString());
  },
};
