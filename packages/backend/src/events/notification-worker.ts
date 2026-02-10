import { eq, and, sql } from 'drizzle-orm';
import type { SocialEvent } from '@boardsesh/shared-schema';
import type { NotificationType } from '@boardsesh/db/schema';
import { db } from '../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { pubsub } from '../pubsub/index';
import type { EventBroker } from './event-broker';
import {
  resolveCommentRecipients,
  resolveVoteRecipients,
  resolveFollowRecipient,
} from './recipient-resolution';
import crypto from 'crypto';

export class NotificationWorker {
  private eventBroker: EventBroker;

  constructor(eventBroker: EventBroker) {
    this.eventBroker = eventBroker;
  }

  start(): void {
    this.eventBroker.startConsumer(this.processEvent.bind(this));
    console.log('[NotificationWorker] Started');
  }

  private async processEvent(event: SocialEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'comment.created':
          await this.handleCommentCreated(event);
          break;
        case 'comment.reply':
          await this.handleCommentReply(event);
          break;
        case 'vote.cast':
          await this.handleVoteCast(event);
          break;
        case 'follow.created':
          await this.handleFollowCreated(event);
          break;
        case 'ascent.logged':
          await this.handleAscentLogged(event);
          break;
        // Future event types (climb.created, proposal.*) are skipped for now
        default:
          break;
      }
    } catch (error) {
      console.error(`[NotificationWorker] Error processing event ${event.type}:`, error);
    }
  }

  private async handleCommentCreated(event: SocialEvent): Promise<void> {
    const recipients = await resolveCommentRecipients(
      event.entityType,
      event.entityId,
    );

    for (const recipient of recipients) {
      await this.createAndPublishNotification(
        recipient.recipientId,
        event.actorId,
        recipient.notificationType,
        event.entityType,
        event.entityId,
        event.metadata.commentUuid,
      );
    }
  }

  private async handleCommentReply(event: SocialEvent): Promise<void> {
    const recipients = await resolveCommentRecipients(
      event.entityType,
      event.entityId,
      event.metadata.parentCommentId,
    );

    for (const recipient of recipients) {
      await this.createAndPublishNotification(
        recipient.recipientId,
        event.actorId,
        recipient.notificationType,
        event.entityType,
        event.entityId,
        event.metadata.commentUuid,
      );
    }
  }

  private async handleVoteCast(event: SocialEvent): Promise<void> {
    const recipients = await resolveVoteRecipients(
      event.entityType,
      event.entityId,
    );

    for (const recipient of recipients) {
      // Deduplicate: skip if same actor voted on same entity recently (1 hour)
      const isDuplicate = await this.isDuplicate(
        event.actorId,
        recipient.recipientId,
        recipient.notificationType,
        event.entityId,
        60,
      );
      if (isDuplicate) continue;

      await this.createAndPublishNotification(
        recipient.recipientId,
        event.actorId,
        recipient.notificationType,
        event.entityType,
        event.entityId,
      );
    }
  }

  private async handleFollowCreated(event: SocialEvent): Promise<void> {
    const recipient = resolveFollowRecipient(event.metadata);
    if (!recipient) return;

    // Deduplicate follows within 24 hours
    const isDuplicate = await this.isDuplicate(
      event.actorId,
      recipient.recipientId,
      recipient.notificationType,
      event.entityId,
      1440,
    );
    if (isDuplicate) return;

    await this.createAndPublishNotification(
      recipient.recipientId,
      event.actorId,
      recipient.notificationType,
      'user',
      event.entityId,
    );
  }

  private async handleAscentLogged(event: SocialEvent): Promise<void> {
    // Look up actor's followers
    const followers = await db
      .select({ followerId: dbSchema.userFollows.followerId })
      .from(dbSchema.userFollows)
      .where(eq(dbSchema.userFollows.followingId, event.actorId));

    if (followers.length === 0) return;

    // Build feed item rows for each follower
    const feedRows = followers.map((f) => ({
      recipientId: f.followerId,
      actorId: event.actorId,
      type: 'ascent' as const,
      entityType: 'tick' as dbSchema.SocialEntityType,
      entityId: event.entityId,
      boardUuid: event.metadata.boardUuid || null,
      metadata: {
        actorDisplayName: event.metadata.actorDisplayName,
        actorAvatarUrl: event.metadata.actorAvatarUrl,
        climbName: event.metadata.climbName,
        climbUuid: event.metadata.climbUuid,
        boardType: event.metadata.boardType,
        setterUsername: event.metadata.setterUsername,
        layoutId: event.metadata.layoutId ? Number(event.metadata.layoutId) : null,
        frames: event.metadata.frames,
        gradeName: event.metadata.gradeName,
        difficulty: event.metadata.difficulty ? Number(event.metadata.difficulty) : null,
        difficultyName: event.metadata.difficultyName,
        status: event.metadata.status,
        angle: event.metadata.angle ? Number(event.metadata.angle) : null,
        isMirror: event.metadata.isMirror === 'true',
        isBenchmark: event.metadata.isBenchmark === 'true',
        quality: event.metadata.quality ? Number(event.metadata.quality) : null,
        attemptCount: event.metadata.attemptCount ? Number(event.metadata.attemptCount) : null,
        comment: event.metadata.comment,
      },
    }));

    // Batch insert feed items
    await db.insert(dbSchema.feedItems).values(feedRows);
  }

  private async isDuplicate(
    actorId: string,
    recipientId: string,
    type: NotificationType,
    entityId: string,
    intervalMinutes: number,
  ): Promise<boolean> {
    const result = await db.execute(sql`
      SELECT 1 FROM notifications
      WHERE actor_id = ${actorId}
        AND recipient_id = ${recipientId}
        AND type = ${type}
        AND entity_id = ${entityId}
        AND created_at > NOW() - make_interval(mins => ${intervalMinutes})
      LIMIT 1
    `);
    const rows = (result as unknown as { rows: unknown[] }).rows;
    return rows.length > 0;
  }

  private async createAndPublishNotification(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    entityType: string,
    entityId: string,
    commentUuid?: string,
  ): Promise<void> {
    // Guard: don't notify yourself
    if (recipientId === actorId) return;

    const uuid = crypto.randomUUID();

    // Resolve commentId from uuid if provided
    let commentId: number | undefined;
    if (commentUuid) {
      const [comment] = await db
        .select({ id: dbSchema.comments.id })
        .from(dbSchema.comments)
        .where(eq(dbSchema.comments.uuid, commentUuid))
        .limit(1);
      commentId = comment?.id;
    }

    // Persist notification
    await db
      .insert(dbSchema.notifications)
      .values({
        uuid,
        recipientId,
        actorId,
        type,
        entityType: entityType as dbSchema.SocialEntityType,
        entityId,
        commentId,
      });

    // Enrich for real-time delivery
    const enriched = await this.enrichNotification(uuid, actorId, type, entityType, entityId, commentUuid);

    // Push to connected WS clients via PubSub
    pubsub.publishNotificationEvent(recipientId, { notification: enriched });
  }

  private async enrichNotification(
    uuid: string,
    actorId: string,
    type: NotificationType,
    entityType: string,
    entityId: string,
    commentUuid?: string,
  ) {
    // Fetch actor profile
    const [actor] = await db
      .select({
        name: dbSchema.users.name,
        image: dbSchema.users.image,
        displayName: dbSchema.userProfiles.displayName,
        avatarUrl: dbSchema.userProfiles.avatarUrl,
      })
      .from(dbSchema.users)
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
      .where(eq(dbSchema.users.id, actorId))
      .limit(1);

    // Fetch comment body preview if applicable
    let commentBody: string | undefined;
    if (commentUuid) {
      const [comment] = await db
        .select({ body: dbSchema.comments.body })
        .from(dbSchema.comments)
        .where(eq(dbSchema.comments.uuid, commentUuid))
        .limit(1);
      if (comment?.body) {
        commentBody = comment.body.length > 100
          ? comment.body.slice(0, 100) + '...'
          : comment.body;
      }
    }

    return {
      uuid,
      type,
      actorId,
      actorDisplayName: actor?.displayName || actor?.name || undefined,
      actorAvatarUrl: actor?.avatarUrl || actor?.image || undefined,
      entityType: entityType as dbSchema.SocialEntityType,
      entityId,
      commentBody,
      climbName: undefined,
      climbUuid: undefined,
      boardType: undefined,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }
}
