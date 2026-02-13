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

  groupedNotifications: async (
    _: unknown,
    { limit = 20, offset = 0 }: { limit?: number; offset?: number },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    // Group notifications by (type, entity_type, entity_id) and return aggregated results
    interface GroupedRow {
      type: string;
      entityType: string | null;
      entityId: string | null;
      actorCount: string;
      latestUuid: string;
      latestCreatedAt: Date;
      allRead: boolean;
      commentBody: string | null;
      actorIds: string[];
      actorDisplayNames: (string | null)[];
      actorAvatarUrls: (string | null)[];
    }

    const rawResult = await db.execute(sql`
      WITH grouped AS (
        SELECT
          n."type",
          n."entity_type",
          n."entity_id",
          COUNT(DISTINCT n."actor_id") as "actorCount",
          (array_agg(n."uuid" ORDER BY n."created_at" DESC))[1] as "latestUuid",
          MAX(n."created_at") as "latestCreatedAt",
          BOOL_AND(n."read_at" IS NOT NULL) as "allRead",
          (array_agg(c."body" ORDER BY n."created_at" DESC))[1] as "commentBody",
          (array_agg(DISTINCT n."actor_id"))[1:3] as "actorIds"
        FROM "notifications" n
        LEFT JOIN "comments" c ON n."comment_id" = c."id"
        WHERE n."recipient_id" = ${userId}
        GROUP BY n."type", n."entity_type", n."entity_id"
        ORDER BY "latestCreatedAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      )
      SELECT
        g.*,
        array(
          SELECT COALESCE(up."display_name", u."name")
          FROM unnest(g."actorIds") AS aid(id)
          LEFT JOIN "users" u ON u."id" = aid.id
          LEFT JOIN "user_profiles" up ON up."user_id" = aid.id
        ) as "actorDisplayNames",
        array(
          SELECT COALESCE(up."avatar_url", u."image")
          FROM unnest(g."actorIds") AS aid(id)
          LEFT JOIN "users" u ON u."id" = aid.id
          LEFT JOIN "user_profiles" up ON up."user_id" = aid.id
        ) as "actorAvatarUrls"
      FROM grouped g
    `);

    const rows = (rawResult as unknown as { rows: GroupedRow[] }).rows;

    const groups = rows.map((row) => {
      const actorIds = row.actorIds || [];
      const actorDisplayNames = row.actorDisplayNames || [];
      const actorAvatarUrls = row.actorAvatarUrls || [];

      const actors = actorIds
        .filter((id): id is string => id != null)
        .map((id, i) => ({
          id,
          displayName: actorDisplayNames[i] || undefined,
          avatarUrl: actorAvatarUrls[i] || undefined,
        }));

      return {
        uuid: row.latestUuid,
        type: row.type,
        entityType: row.entityType,
        entityId: row.entityId,
        actorCount: Number(row.actorCount),
        actors,
        commentBody: row.commentBody
          ? (row.commentBody.length > 100 ? row.commentBody.slice(0, 100) + '...' : row.commentBody)
          : undefined,
        climbName: undefined,
        climbUuid: undefined,
        boardType: undefined,
        isRead: row.allRead,
        createdAt: row.latestCreatedAt instanceof Date
          ? row.latestCreatedAt.toISOString()
          : String(row.latestCreatedAt),
      };
    });

    // Total group count
    const totalCountResult = await db.execute(sql`
      SELECT COUNT(*) as "count" FROM (
        SELECT 1
        FROM "notifications"
        WHERE "recipient_id" = ${userId}
        GROUP BY "type", "entity_type", "entity_id"
      ) sub
    `);
    const totalCount = Number(
      (totalCountResult as unknown as { rows: { count: string }[] }).rows[0]?.count || 0,
    );

    // Unread count (individual notifications, not groups)
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
      groups,
      totalCount,
      unreadCount,
      hasMore: offset + groups.length < totalCount,
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
    applyRateLimit(ctx, 60, 'notification_read');
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
    applyRateLimit(ctx, 5, 'notification_read_all');
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
