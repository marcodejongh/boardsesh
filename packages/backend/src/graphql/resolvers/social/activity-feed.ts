import { eq, and, desc, sql, lt, or } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { ActivityFeedInputSchema } from '../../../validation/schemas';
import { encodeCursor, decodeCursor, encodeOffsetCursor, decodeOffsetCursor } from '../../../utils/feed-cursor';

/**
 * Map validated time period to a parameterized SQL interval condition.
 * Avoids sql.raw() — each interval is an explicit SQL fragment.
 */
function timePeriodIntervalSql(column: unknown, period: string) {
  switch (period) {
    case 'hour':  return sql`${column} > NOW() - INTERVAL '1 hour'`;
    case 'day':   return sql`${column} > NOW() - INTERVAL '1 day'`;
    case 'week':  return sql`${column} > NOW() - INTERVAL '7 days'`;
    case 'month': return sql`${column} > NOW() - INTERVAL '30 days'`;
    case 'year':  return sql`${column} > NOW() - INTERVAL '365 days'`;
    default:      return null;
  }
}

function mapFeedItemToGraphQL(row: typeof dbSchema.feedItems.$inferSelect) {
  const meta = (row.metadata || {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    type: row.type,
    entityType: row.entityType,
    entityId: row.entityId,
    boardUuid: row.boardUuid,
    actorId: row.actorId,
    actorDisplayName: (meta.actorDisplayName as string) ?? null,
    actorAvatarUrl: (meta.actorAvatarUrl as string) ?? null,
    climbName: (meta.climbName as string) ?? null,
    climbUuid: (meta.climbUuid as string) ?? null,
    boardType: (meta.boardType as string) ?? null,
    layoutId: (meta.layoutId as number) ?? null,
    gradeName: (meta.gradeName as string) ?? null,
    status: (meta.status as string) ?? null,
    angle: (meta.angle as number) ?? null,
    frames: (meta.frames as string) ?? null,
    setterUsername: (meta.setterUsername as string) ?? null,
    commentBody: (meta.commentBody as string) ?? null,
    isMirror: (meta.isMirror as boolean) ?? null,
    isBenchmark: (meta.isBenchmark as boolean) ?? null,
    difficulty: (meta.difficulty as number) ?? null,
    difficultyName: (meta.difficultyName as string) ?? null,
    quality: (meta.quality as number) ?? null,
    attemptCount: (meta.attemptCount as number) ?? null,
    comment: (meta.comment as string) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const activityFeedQueries = {
  /**
   * Materialized activity feed for authenticated user (fan-out-on-write).
   * Reads from feed_items table with cursor-based pagination.
   */
  activityFeed: async (
    _: unknown,
    { input }: { input?: Record<string, unknown> },
    ctx: ConnectionContext
  ) => {
    requireAuthenticated(ctx);
    const myUserId = ctx.userId!;

    const validatedInput = validateInput(ActivityFeedInputSchema, input || {}, 'input');
    const limit = validatedInput.limit ?? 20;
    const sortBy = validatedInput.sortBy ?? 'new';

    // Build base conditions
    const conditions = [eq(dbSchema.feedItems.recipientId, myUserId)];

    if (validatedInput.boardUuid) {
      conditions.push(eq(dbSchema.feedItems.boardUuid, validatedInput.boardUuid));
    }

    // Apply time period filter for top/controversial/hot sorts
    if (sortBy !== 'new' && validatedInput.topPeriod && validatedInput.topPeriod !== 'all') {
      const intervalCond = timePeriodIntervalSql(dbSchema.feedItems.createdAt, validatedInput.topPeriod);
      if (intervalCond) conditions.push(intervalCond);
    }

    if (sortBy === 'new') {
      // Keyset pagination for chronological sort (stable — order doesn't change)
      if (validatedInput.cursor) {
        const cursor = decodeCursor(validatedInput.cursor);
        if (cursor) {
          conditions.push(
            or(
              lt(dbSchema.feedItems.createdAt, new Date(cursor.createdAt)),
              and(
                eq(dbSchema.feedItems.createdAt, new Date(cursor.createdAt)),
                lt(dbSchema.feedItems.id, cursor.id)
              )
            )!
          );
        }
      }

      const whereClause = and(...conditions);
      const rows = await db
        .select()
        .from(dbSchema.feedItems)
        .where(whereClause)
        .orderBy(desc(dbSchema.feedItems.createdAt), desc(dbSchema.feedItems.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const resultRows = hasMore ? rows.slice(0, limit) : rows;
      const items = resultRows.map(mapFeedItemToGraphQL);

      let nextCursor: string | null = null;
      if (hasMore && resultRows.length > 0) {
        const lastRow = resultRows[resultRows.length - 1];
        nextCursor = encodeCursor(lastRow.createdAt, lastRow.id);
      }

      return { items, cursor: nextCursor, hasMore };
    }

    // Vote-based sort modes use offset pagination because scores can change
    // between requests, making keyset cursors unstable (items shift/duplicate).
    const offset = validatedInput.cursor
      ? (decodeOffsetCursor(validatedInput.cursor) ?? 0)
      : 0;

    const whereClause = and(...conditions);

    // LEFT JOIN vote_counts instead of GROUP BY derived subquery
    const scoredRows = await db
      .select({
        feedItem: dbSchema.feedItems,
        score: sql<number>`COALESCE(${dbSchema.voteCounts.score}, 0)`.as('sort_score'),
        upvotes: sql<number>`COALESCE(${dbSchema.voteCounts.upvotes}, 0)`.as('sort_upvotes'),
        downvotes: sql<number>`COALESCE(${dbSchema.voteCounts.downvotes}, 0)`.as('sort_downvotes'),
      })
      .from(dbSchema.feedItems)
      .leftJoin(
        dbSchema.voteCounts,
        and(
          eq(dbSchema.feedItems.entityId, dbSchema.voteCounts.entityId),
          eq(dbSchema.feedItems.entityType, dbSchema.voteCounts.entityType),
        )
      )
      .where(whereClause)
      .orderBy(
        sortBy === 'top'
          // Top: highest net score first
          ? desc(sql`COALESCE(${dbSchema.voteCounts.score}, 0)`)
          : sortBy === 'controversial'
            // Controversial: most total votes with balanced ratio
            ? desc(sql`
                CASE WHEN COALESCE(${dbSchema.voteCounts.upvotes}, 0) + COALESCE(${dbSchema.voteCounts.downvotes}, 0) = 0 THEN 0
                ELSE LEAST(COALESCE(${dbSchema.voteCounts.upvotes}, 0), COALESCE(${dbSchema.voteCounts.downvotes}, 0))::float
                     / (COALESCE(${dbSchema.voteCounts.upvotes}, 0) + COALESCE(${dbSchema.voteCounts.downvotes}, 0))
                     * LN(COALESCE(${dbSchema.voteCounts.upvotes}, 0) + COALESCE(${dbSchema.voteCounts.downvotes}, 0) + 1)
                END`)
            : // Hot: compute at query time using vote score + entity creation time
              // Uses feedItems.createdAt (the entity's actual creation time) rather than
              // vote_counts.hot_score which incorrectly uses earliest vote time
              desc(sql`SIGN(COALESCE(${dbSchema.voteCounts.score}, 0))
                * LN(GREATEST(ABS(COALESCE(${dbSchema.voteCounts.score}, 0)), 1))
                + EXTRACT(EPOCH FROM ${dbSchema.feedItems.createdAt}) / 45000.0`),
        desc(dbSchema.feedItems.createdAt),
        desc(dbSchema.feedItems.id),
      )
      .offset(offset)
      .limit(limit + 1);

    const hasMore = scoredRows.length > limit;
    const resultRows = hasMore ? scoredRows.slice(0, limit) : scoredRows;
    const items = resultRows.map((r) => mapFeedItemToGraphQL(r.feedItem));

    const nextCursor = hasMore ? encodeOffsetCursor(offset + limit) : null;

    return { items, cursor: nextCursor, hasMore };
  },

  /**
   * Trending feed — public, no auth required.
   * Fan-out-on-read from boardsesh_ticks with JOINs (same pattern as globalAscentsFeed).
   * Returns cursor-based pagination using the ActivityFeedItem shape.
   */
  trendingFeed: async (
    _: unknown,
    { input }: { input?: Record<string, unknown> },
  ) => {
    const validatedInput = validateInput(ActivityFeedInputSchema, input || {}, 'input');
    const limit = validatedInput.limit ?? 20;

    // Build conditions - only successful ascents for trending
    const conditions = [
      sql`${dbSchema.boardseshTicks.status} IN ('flash', 'send')`,
    ];

    // Decode cursor
    if (validatedInput.cursor) {
      const cursor = decodeCursor(validatedInput.cursor);
      if (cursor) {
        conditions.push(
          sql`(${dbSchema.boardseshTicks.climbedAt} < ${cursor.createdAt}
            OR (${dbSchema.boardseshTicks.climbedAt} = ${cursor.createdAt}
                AND ${dbSchema.boardseshTicks.id} < ${cursor.id}))`
        );
      }
    }

    // Time period filter
    if (validatedInput.topPeriod && validatedInput.topPeriod !== 'all') {
      const intervalCond = timePeriodIntervalSql(dbSchema.boardseshTicks.climbedAt, validatedInput.topPeriod);
      if (intervalCond) conditions.push(intervalCond);
    }

    const whereClause = and(...conditions);

    const results = await db
      .select({
        tick: dbSchema.boardseshTicks,
        userName: dbSchema.users.name,
        userImage: dbSchema.users.image,
        userDisplayName: dbSchema.userProfiles.displayName,
        userAvatarUrl: dbSchema.userProfiles.avatarUrl,
        climbName: dbSchema.boardClimbs.name,
        setterUsername: dbSchema.boardClimbs.setterUsername,
        layoutId: dbSchema.boardClimbs.layoutId,
        frames: dbSchema.boardClimbs.frames,
        difficultyName: dbSchema.boardDifficultyGrades.boulderName,
      })
      .from(dbSchema.boardseshTicks)
      .innerJoin(dbSchema.users, eq(dbSchema.boardseshTicks.userId, dbSchema.users.id))
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.boardseshTicks.userId, dbSchema.userProfiles.userId))
      .leftJoin(
        dbSchema.boardClimbs,
        and(
          eq(dbSchema.boardseshTicks.climbUuid, dbSchema.boardClimbs.uuid),
          eq(dbSchema.boardseshTicks.boardType, dbSchema.boardClimbs.boardType)
        )
      )
      .leftJoin(
        dbSchema.boardDifficultyGrades,
        and(
          eq(dbSchema.boardseshTicks.difficulty, dbSchema.boardDifficultyGrades.difficulty),
          eq(dbSchema.boardseshTicks.boardType, dbSchema.boardDifficultyGrades.boardType)
        )
      )
      .where(whereClause)
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt), desc(dbSchema.boardseshTicks.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const resultRows = hasMore ? results.slice(0, limit) : results;

    const items = resultRows.map(({ tick, userName, userImage, userDisplayName, userAvatarUrl, climbName, setterUsername, layoutId, frames, difficultyName }) => ({
      id: tick.id.toString(),
      type: 'ascent' as const,
      entityType: 'tick' as const,
      entityId: tick.uuid,
      boardUuid: null,
      actorId: tick.userId,
      actorDisplayName: userDisplayName || userName || null,
      actorAvatarUrl: userAvatarUrl || userImage || null,
      climbName: climbName || 'Unknown Climb',
      climbUuid: tick.climbUuid,
      boardType: tick.boardType,
      layoutId,
      gradeName: difficultyName,
      status: tick.status,
      angle: tick.angle,
      frames,
      setterUsername,
      commentBody: null,
      isMirror: tick.isMirror ?? false,
      isBenchmark: tick.isBenchmark ?? false,
      difficulty: tick.difficulty,
      difficultyName,
      quality: tick.quality,
      attemptCount: tick.attemptCount,
      comment: tick.comment || null,
      createdAt: tick.climbedAt,
    }));

    let nextCursor: string | null = null;
    if (hasMore && resultRows.length > 0) {
      const lastResult = resultRows[resultRows.length - 1];
      nextCursor = encodeCursor(lastResult.tick.climbedAt, Number(lastResult.tick.id));
    }

    return {
      items,
      cursor: nextCursor,
      hasMore,
    };
  },
};
