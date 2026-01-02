import { eq, and, inArray } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { validateInput } from '../shared/helpers';
import { BoardNameSchema } from '../../../validation/schemas';

export const favoriteQueries = {
  /**
   * Get favorite climb UUIDs for the authenticated user
   * Filters by board name, angle, and optionally by a list of climb UUIDs
   */
  favorites: async (
    _: unknown,
    { boardName, climbUuids, angle }: { boardName: string; climbUuids: string[]; angle: number },
    ctx: ConnectionContext
  ): Promise<string[]> => {
    if (!ctx.isAuthenticated || !ctx.userId) {
      return [];
    }

    validateInput(BoardNameSchema, boardName, 'boardName');

    const favorites = await db
      .select({ climbUuid: dbSchema.userFavorites.climbUuid })
      .from(dbSchema.userFavorites)
      .where(
        and(
          eq(dbSchema.userFavorites.userId, ctx.userId),
          eq(dbSchema.userFavorites.boardName, boardName),
          eq(dbSchema.userFavorites.angle, angle),
          inArray(dbSchema.userFavorites.climbUuid, climbUuids)
        )
      );

    return favorites.map(f => f.climbUuid);
  },
};
