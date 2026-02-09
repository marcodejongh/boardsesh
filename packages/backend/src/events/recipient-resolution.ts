import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import type { NotificationType } from '@boardsesh/db/schema';

interface RecipientInfo {
  recipientId: string;
  notificationType: NotificationType;
}

/**
 * Resolve recipients for a comment event.
 * Returns the entity owner and/or parent comment author.
 */
export async function resolveCommentRecipients(
  entityType: string,
  entityId: string,
  parentCommentId?: string,
): Promise<RecipientInfo[]> {
  const recipients: RecipientInfo[] = [];

  // If this is a reply, notify the parent comment author
  if (parentCommentId) {
    const [parentComment] = await db
      .select({ userId: dbSchema.comments.userId })
      .from(dbSchema.comments)
      .where(eq(dbSchema.comments.uuid, parentCommentId))
      .limit(1);

    if (parentComment) {
      recipients.push({
        recipientId: parentComment.userId,
        notificationType: 'comment_reply',
      });
    }
  }

  // Notify the entity owner
  if (entityType === 'tick') {
    const [tick] = await db
      .select({ userId: dbSchema.boardseshTicks.userId })
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.uuid, entityId))
      .limit(1);

    if (tick) {
      recipients.push({
        recipientId: tick.userId,
        notificationType: 'comment_on_tick',
      });
    }
  }

  // For climb comments, we don't have a single owner to notify
  // (climbs are set by Aurora users, not boardsesh users)

  return recipients;
}

/**
 * Resolve recipients for a vote event.
 */
export async function resolveVoteRecipients(
  entityType: string,
  entityId: string,
): Promise<RecipientInfo[]> {
  if (entityType === 'tick') {
    const [tick] = await db
      .select({ userId: dbSchema.boardseshTicks.userId })
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.uuid, entityId))
      .limit(1);

    if (tick) {
      return [{
        recipientId: tick.userId,
        notificationType: 'vote_on_tick',
      }];
    }
  }

  if (entityType === 'comment') {
    const [comment] = await db
      .select({ userId: dbSchema.comments.userId })
      .from(dbSchema.comments)
      .where(eq(dbSchema.comments.uuid, entityId))
      .limit(1);

    if (comment) {
      return [{
        recipientId: comment.userId,
        notificationType: 'vote_on_comment',
      }];
    }
  }

  return [];
}

/**
 * Resolve recipient for a follow event.
 */
export function resolveFollowRecipient(
  metadata: Record<string, string>,
): RecipientInfo | null {
  const followedUserId = metadata.followedUserId;
  if (!followedUserId) return null;

  return {
    recipientId: followedUserId,
    notificationType: 'new_follower',
  };
}
