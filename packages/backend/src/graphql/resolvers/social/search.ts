import { eq, and, or, ilike, sql, count } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { applyRateLimit, validateInput } from '../shared/helpers';
import { SearchUsersInputSchema } from '../../../validation/schemas';

export const socialSearchQueries = {
  /**
   * Search for users by name or email
   */
  searchUsers: async (
    _: unknown,
    { input }: { input: { query: string; boardType?: string; limit?: number; offset?: number } },
    ctx: ConnectionContext
  ) => {
    applyRateLimit(ctx, 20);

    const validatedInput = validateInput(SearchUsersInputSchema, input, 'input');
    const query = validatedInput.query;
    const boardType = validatedInput.boardType;
    const limit = validatedInput.limit ?? 20;
    const offset = validatedInput.offset ?? 0;
    const searchPattern = `%${query}%`;
    const prefixPattern = `${query}%`;

    // Build the base query with user + profile join
    // Search on displayName, users.name, or email prefix
    const searchConditions = or(
      ilike(dbSchema.userProfiles.displayName, searchPattern),
      ilike(dbSchema.users.name, searchPattern),
      ilike(dbSchema.users.email, prefixPattern)
    );

    // Count total matches
    let countQuery = db
      .select({ count: count() })
      .from(dbSchema.users)
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
      .where(searchConditions!);

    if (boardType) {
      countQuery = db
        .select({ count: count() })
        .from(dbSchema.users)
        .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
        .innerJoin(
          dbSchema.userBoardMappings,
          and(
            eq(dbSchema.users.id, dbSchema.userBoardMappings.userId),
            eq(dbSchema.userBoardMappings.boardType, boardType)
          )
        )
        .where(searchConditions!);
    }

    const countResult = await countQuery;
    const totalCount = Number(countResult[0]?.count || 0);

    // Get matching users
    let resultsQuery;
    if (boardType) {
      resultsQuery = db
        .select({
          id: dbSchema.users.id,
          name: dbSchema.users.name,
          email: dbSchema.users.email,
          image: dbSchema.users.image,
          displayName: dbSchema.userProfiles.displayName,
          avatarUrl: dbSchema.userProfiles.avatarUrl,
        })
        .from(dbSchema.users)
        .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
        .innerJoin(
          dbSchema.userBoardMappings,
          and(
            eq(dbSchema.users.id, dbSchema.userBoardMappings.userId),
            eq(dbSchema.userBoardMappings.boardType, boardType)
          )
        )
        .where(searchConditions!)
        .limit(limit)
        .offset(offset);
    } else {
      resultsQuery = db
        .select({
          id: dbSchema.users.id,
          name: dbSchema.users.name,
          email: dbSchema.users.email,
          image: dbSchema.users.image,
          displayName: dbSchema.userProfiles.displayName,
          avatarUrl: dbSchema.userProfiles.avatarUrl,
        })
        .from(dbSchema.users)
        .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
        .where(searchConditions!)
        .limit(limit)
        .offset(offset);
    }

    const results = await resultsQuery;

    // Compute follower/following counts, isFollowedByMe, and recentAscentCount for each user
    const searchResults = await Promise.all(
      results.map(async (row) => {
        const [followerCountResult] = await db
          .select({ count: count() })
          .from(dbSchema.userFollows)
          .where(eq(dbSchema.userFollows.followingId, row.id));

        const [followingCountResult] = await db
          .select({ count: count() })
          .from(dbSchema.userFollows)
          .where(eq(dbSchema.userFollows.followerId, row.id));

        let isFollowedByMe = false;
        if (ctx.isAuthenticated && ctx.userId) {
          const [followCheck] = await db
            .select({ count: count() })
            .from(dbSchema.userFollows)
            .where(
              and(
                eq(dbSchema.userFollows.followerId, ctx.userId),
                eq(dbSchema.userFollows.followingId, row.id)
              )
            );
          isFollowedByMe = Number(followCheck?.count || 0) > 0;
        }

        // Recent ascent count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [recentResult] = await db
          .select({ count: count() })
          .from(dbSchema.boardseshTicks)
          .where(
            and(
              eq(dbSchema.boardseshTicks.userId, row.id),
              sql`${dbSchema.boardseshTicks.createdAt} > ${thirtyDaysAgo.toISOString()}`
            )
          );

        // Determine match reason
        const lowerQuery = query.toLowerCase();
        let matchReason: string | undefined;
        if (row.displayName?.toLowerCase().includes(lowerQuery) || row.name?.toLowerCase().includes(lowerQuery)) {
          matchReason = 'name match';
        } else if (row.email.toLowerCase().startsWith(lowerQuery)) {
          matchReason = 'email match';
        }

        return {
          user: {
            id: row.id,
            displayName: row.displayName || row.name || undefined,
            avatarUrl: row.avatarUrl || row.image || undefined,
            followerCount: Number(followerCountResult?.count || 0),
            followingCount: Number(followingCountResult?.count || 0),
            isFollowedByMe,
          },
          recentAscentCount: Number(recentResult?.count || 0),
          matchReason,
        };
      })
    );

    // Sort: exact prefix matches first, then by recentAscentCount DESC
    searchResults.sort((a, b) => {
      const lowerQuery = query.toLowerCase();
      const aIsPrefix = (a.user.displayName?.toLowerCase().startsWith(lowerQuery) || false) ? 1 : 0;
      const bIsPrefix = (b.user.displayName?.toLowerCase().startsWith(lowerQuery) || false) ? 1 : 0;
      if (aIsPrefix !== bIsPrefix) return bIsPrefix - aIsPrefix;
      return b.recentAscentCount - a.recentAscentCount;
    });

    return {
      results: searchResults,
      totalCount,
      hasMore: offset + searchResults.length < totalCount,
    };
  },
};
