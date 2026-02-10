import { eq, and, isNull, count, sql } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, applyRateLimit } from '../shared/helpers';
import { pubsub } from '../../../pubsub/index';
import { createAsyncIterator } from '../shared/async-iterators';
import type { NotificationEvent } from '@boardsesh/shared-schema';

interface NotificationRow {
  uuid: string;
  type: string;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  commentId: number | null;
  readAt: Date | null;
  createdAt: Date;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  actorName: string | null;
  actorImage: string | null;
  commentBody: string | null;
}

function mapNotificationRow(row: NotificationRow) {
  return {
    uuid: row.uuid,
    type: row.type,
    actorId: row.actorId,
    actorDisplayName: row.actorDisplayName || row.actorName || undefined,
    actorAvatarUrl: row.actorAvatarUrl || row.actorImage || undefined,
    entityType: row.entityType,
    entityId: row.entityId,
    commentBody: row.commentBody
      ? (row.commentBody.length > 100 ? row.commentBody.slice(0, 100) + '...' : row.commentBody)
      : undefined,
    climbName: undefined,
    climbUuid: undefined,
    boardType: undefined,
    isRead: row.readAt !== null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

export const socialNotificationQueries = {
  notifications: async (
    _: unknown,
    { unreadOnly, limit = 20, offset = 0 }: { unreadOnly?: boolean; limit?: number; offset?: number },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    // Build where clause
    const unreadFilter = unreadOnly ? sql`AND n."read_at" IS NULL` : sql``;

    // Main query
    const rawResult = await db.execute(sql`
      SELECT
        n."uuid",
        n."type",
        n."actor_id" as "actorId",
        n."entity_type" as "entityType",
        n."entity_id" as "entityId",
        n."comment_id" as "commentId",
        n."read_at" as "readAt",
        n."created_at" as "createdAt",
        up."display_name" as "actorDisplayName",
        up."avatar_url" as "actorAvatarUrl",
        u."name" as "actorName",
        u."image" as "actorImage",
        c."body" as "commentBody"
      FROM "notifications" n
      LEFT JOIN "users" u ON n."actor_id" = u."id"
      LEFT JOIN "user_profiles" up ON n."actor_id" = up."user_id"
      LEFT JOIN "comments" c ON n."comment_id" = c."id"
      WHERE n."recipient_id" = ${userId}
        ${unreadFilter}
      ORDER BY n."created_at" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const rows = (rawResult as unknown as { rows: NotificationRow[] }).rows;
    const notifications = rows.map(mapNotificationRow);

    // Total count
    const totalCountResult = await db
      .select({ count: count() })
      .from(dbSchema.notifications)
      .where(eq(dbSchema.notifications.recipientId, userId));
    const totalCount = Number(totalCountResult[0]?.count || 0);

    // Unread count
    const unreadCountResult = await db
      .select({ count: count() })
      .from(dbSchema.notifications)
      .where(
        and(
          eq(dbSchema.notifications.recipientId, userId),
          isNull(dbSchema.notifications.readAt),
        ),
      );
    const unreadCount = Number(unreadCountResult[0]?.count || 0);

    return {
      notifications,
      totalCount,
      unreadCount,
      hasMore: offset + notifications.length < totalCount,
    };
  },

  unreadNotificationCount: async (
    _: unknown,
    __: unknown,
    ctx: ConnectionContext,
  ): Promise<number> => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    const result = await db
      .select({ count: count() })
      .from(dbSchema.notifications)
      .where(
        and(
          eq(dbSchema.notifications.recipientId, userId),
          isNull(dbSchema.notifications.readAt),
        ),
      );

    return Number(result[0]?.count || 0);
  },
};

export const socialNotificationMutations = {
  markNotificationRead: async (
    _: unknown,
    { notificationUuid }: { notificationUuid: string },
    ctx: ConnectionContext,
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 30);
    const userId = ctx.userId!;

    await db
      .update(dbSchema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(dbSchema.notifications.uuid, notificationUuid),
          eq(dbSchema.notifications.recipientId, userId),
        ),
      );

    return true;
  },

  markAllNotificationsRead: async (
    _: unknown,
    __: unknown,
    ctx: ConnectionContext,
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 10);
    const userId = ctx.userId!;

    await db
      .update(dbSchema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(dbSchema.notifications.recipientId, userId),
          isNull(dbSchema.notifications.readAt),
        ),
      );

    return true;
  },
};

export const socialNotificationSubscriptions = {
  notificationReceived: {
    subscribe: async function* (_: unknown, __: unknown, ctx: ConnectionContext) {
      requireAuthenticated(ctx);
      const userId = ctx.userId!;

      const asyncIterator = await createAsyncIterator<NotificationEvent>((push) => {
        return pubsub.subscribeNotifications(userId, push);
      });

      for await (const event of asyncIterator) {
        yield { notificationReceived: event };
      }
    },
  },
};
