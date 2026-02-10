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
  resolveProposalVoteRecipients,
  resolveProposalApprovalRecipients,
  resolveProposalRejectionRecipients,
} from './recipient-resolution';
import { fanoutFeedItems } from './feed-fanout';
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
        case 'proposal.voted':
          await this.handleProposalVoted(event);
          break;
        case 'proposal.approved':
          await this.handleProposalApproved(event);
          break;
        case 'proposal.rejected':
          await this.handleProposalRejected(event);
          break;
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
    await fanoutFeedItems(event);
  }

  private async handleProposalVoted(event: SocialEvent): Promise<void> {
    const recipients = await resolveProposalVoteRecipients(event.entityId);

    for (const recipient of recipients) {
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

  private async handleProposalApproved(event: SocialEvent): Promise<void> {
    const recipients = await resolveProposalApprovalRecipients(event.entityId);

    for (const recipient of recipients) {
      await this.createAndPublishNotification(
        recipient.recipientId,
        event.actorId,
        recipient.notificationType,
        event.entityType,
        event.entityId,
      );
    }
  }

  private async handleProposalRejected(event: SocialEvent): Promise<void> {
    const recipients = await resolveProposalRejectionRecipients(event.entityId);

    for (const recipient of recipients) {
      await this.createAndPublishNotification(
        recipient.recipientId,
        event.actorId,
        recipient.notificationType,
        event.entityType,
        event.entityId,
      );
    }
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
