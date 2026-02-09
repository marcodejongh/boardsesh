import type { SocialEvent, NotificationType } from '@boardsesh/shared-schema';
import { EventBroker } from './event-broker';
import { pubsub } from '../pubsub/index';
import { db } from '../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const eventBroker = new EventBroker();

/**
 * Publish a social event. If the EventBroker is initialized (Redis mode),
 * publishes to Redis Streams. Otherwise falls back to inline notification creation.
 */
export async function publishSocialEvent(event: SocialEvent): Promise<void> {
  if (eventBroker.isInitialized()) {
    await eventBroker.publish(event);
  } else {
    // Fallback: inline notification for local-only mode
    await createInlineNotification(event);
  }
}

/**
 * Inline notification creation for when Redis Streams is not available.
 * Handles the most common event types directly.
 */
async function createInlineNotification(event: SocialEvent): Promise<void> {
  try {
    let recipientId: string | null = null;
    let notificationType: dbSchema.NotificationType | null = null;

    switch (event.type) {
      case 'follow.created': {
        recipientId = event.metadata.followedUserId;
        notificationType = 'new_follower';
        break;
      }
      case 'comment.created': {
        if (event.entityType === 'tick') {
          const [tick] = await db
            .select({ userId: dbSchema.boardseshTicks.userId })
            .from(dbSchema.boardseshTicks)
            .where(eq(dbSchema.boardseshTicks.uuid, event.entityId))
            .limit(1);
          if (tick) {
            recipientId = tick.userId;
            notificationType = 'comment_on_tick';
          }
        }
        break;
      }
      case 'comment.reply': {
        if (event.metadata.parentCommentId) {
          const [parent] = await db
            .select({ userId: dbSchema.comments.userId })
            .from(dbSchema.comments)
            .where(eq(dbSchema.comments.uuid, event.metadata.parentCommentId))
            .limit(1);
          if (parent) {
            recipientId = parent.userId;
            notificationType = 'comment_reply';
          }
        }
        break;
      }
      case 'vote.cast': {
        if (event.entityType === 'tick') {
          const [tick] = await db
            .select({ userId: dbSchema.boardseshTicks.userId })
            .from(dbSchema.boardseshTicks)
            .where(eq(dbSchema.boardseshTicks.uuid, event.entityId))
            .limit(1);
          if (tick) {
            recipientId = tick.userId;
            notificationType = 'vote_on_tick';
          }
        } else if (event.entityType === 'comment') {
          const [comment] = await db
            .select({ userId: dbSchema.comments.userId })
            .from(dbSchema.comments)
            .where(eq(dbSchema.comments.uuid, event.entityId))
            .limit(1);
          if (comment) {
            recipientId = comment.userId;
            notificationType = 'vote_on_comment';
          }
        }
        break;
      }
    }

    if (!recipientId || !notificationType || recipientId === event.actorId) return;

    const uuid = crypto.randomUUID();
    await db
      .insert(dbSchema.notifications)
      .values({
        uuid,
        recipientId,
        actorId: event.actorId,
        type: notificationType,
        entityType: event.entityType as dbSchema.SocialEntityType,
        entityId: event.entityId,
      });

    // Enrich and push via PubSub
    const [actor] = await db
      .select({
        name: dbSchema.users.name,
        image: dbSchema.users.image,
        displayName: dbSchema.userProfiles.displayName,
        avatarUrl: dbSchema.userProfiles.avatarUrl,
      })
      .from(dbSchema.users)
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
      .where(eq(dbSchema.users.id, event.actorId))
      .limit(1);

    pubsub.publishNotificationEvent(recipientId, {
      notification: {
        uuid,
        type: notificationType as NotificationType,
        actorId: event.actorId,
        actorDisplayName: actor?.displayName || actor?.name || undefined,
        actorAvatarUrl: actor?.avatarUrl || actor?.image || undefined,
        entityType: event.entityType as dbSchema.SocialEntityType,
        entityId: event.entityId,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Events] Inline notification failed:', error);
  }
}

export { EventBroker } from './event-broker';
export { NotificationWorker } from './notification-worker';
