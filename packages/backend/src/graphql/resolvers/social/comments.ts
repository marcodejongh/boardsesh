import { eq, and, isNull, count, sql } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers';
import {
  AddCommentInputSchema,
  UpdateCommentInputSchema,
  CommentsInputSchema,
} from '../../../validation/schemas';
import { validateEntityExists } from './entity-validation';
import crypto from 'crypto';

interface CommentRow {
  id: number;
  uuid: string;
  userId: string;
  entityType: string;
  entityId: string;
  parentCommentId: number | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  userName: string | null;
  userImage: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  parentUuid: string | null;
  replyCount: number;
  upvotes: number;
  downvotes: number;
  userVote: number | null;
}

function mapCommentRow(row: CommentRow) {
  const isDeleted = row.deletedAt !== null;
  return {
    uuid: row.uuid,
    userId: row.userId,
    userDisplayName: row.displayName || row.userName || undefined,
    userAvatarUrl: row.avatarUrl || row.userImage || undefined,
    entityType: row.entityType,
    entityId: row.entityId,
    parentCommentUuid: row.parentUuid || null,
    body: isDeleted ? null : row.body,
    isDeleted,
    replyCount: Number(row.replyCount || 0),
    upvotes: Number(row.upvotes || 0),
    downvotes: Number(row.downvotes || 0),
    voteScore: Number(row.upvotes || 0) - Number(row.downvotes || 0),
    userVote: Number(row.userVote || 0),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/**
 * Helper to get aggregate vote counts for a comment using the query builder
 */
async function getCommentVoteCounts(commentUuid: string) {
  const upvoteResult = await db
    .select({ count: count() })
    .from(dbSchema.votes)
    .where(
      and(
        eq(dbSchema.votes.entityType, 'comment'),
        eq(dbSchema.votes.entityId, commentUuid),
        eq(dbSchema.votes.value, 1),
      ),
    );
  const downvoteResult = await db
    .select({ count: count() })
    .from(dbSchema.votes)
    .where(
      and(
        eq(dbSchema.votes.entityType, 'comment'),
        eq(dbSchema.votes.entityId, commentUuid),
        eq(dbSchema.votes.value, -1),
      ),
    );

  return {
    upvotes: Number(upvoteResult[0]?.count || 0),
    downvotes: Number(downvoteResult[0]?.count || 0),
  };
}

export const socialCommentQueries = {
  comments: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(CommentsInputSchema, input, 'input');
    const { entityType, entityId, parentCommentUuid, sortBy, limit = 20, offset = 0 } = validated;

    const authenticatedUserId = ctx.isAuthenticated ? ctx.userId : null;

    // If parentCommentUuid is provided, resolve to internal ID for filtering replies
    let parentCommentFilter: ReturnType<typeof sql>;
    let resolvedParentId: number | null = null;
    if (parentCommentUuid) {
      const [parentComment] = await db
        .select({ id: dbSchema.comments.id })
        .from(dbSchema.comments)
        .where(eq(dbSchema.comments.uuid, parentCommentUuid))
        .limit(1);

      if (!parentComment) {
        return { comments: [], totalCount: 0, hasMore: false };
      }

      resolvedParentId = parentComment.id;
      parentCommentFilter = sql`c."parent_comment_id" = ${resolvedParentId}`;
    } else {
      parentCommentFilter = sql`c."parent_comment_id" IS NULL`;
    }

    // Build ORDER BY based on sortBy
    let orderByClause: ReturnType<typeof sql>;
    switch (sortBy) {
      case 'top':
        orderByClause = sql`(COALESCE(v_up.cnt, 0) - COALESCE(v_down.cnt, 0)) DESC, c."created_at" DESC`;
        break;
      case 'controversial':
        orderByClause = sql`
          CASE WHEN COALESCE(v_up.cnt, 0) + COALESCE(v_down.cnt, 0) = 0 THEN 0
          ELSE POWER(COALESCE(v_up.cnt, 0) + COALESCE(v_down.cnt, 0),
            LEAST(COALESCE(v_up.cnt, 0)::float, COALESCE(v_down.cnt, 0)::float) /
            GREATEST(COALESCE(v_up.cnt, 0)::float, COALESCE(v_down.cnt, 0)::float, 1)
          ) END DESC, c."created_at" DESC`;
        break;
      case 'hot':
        orderByClause = sql`
          SIGN(COALESCE(v_up.cnt, 0) - COALESCE(v_down.cnt, 0)) *
          LOG(GREATEST(ABS(COALESCE(v_up.cnt, 0) - COALESCE(v_down.cnt, 0)), 1)) +
          EXTRACT(EPOCH FROM c."created_at") / 45000 DESC`;
        break;
      default: // 'new'
        orderByClause = sql`c."created_at" DESC`;
    }

    // Total count query — reuse resolvedParentId to avoid duplicate lookup
    const countResult = await db
      .select({ count: count() })
      .from(dbSchema.comments)
      .where(
        and(
          eq(dbSchema.comments.entityType, entityType),
          eq(dbSchema.comments.entityId, entityId),
          resolvedParentId !== null
            ? eq(dbSchema.comments.parentCommentId, resolvedParentId)
            : isNull(dbSchema.comments.parentCommentId),
        ),
      );
    const totalCount = Number(countResult[0]?.count || 0);

    // Main query with JOINs — use raw SQL but cast result properly
    const rawResult = await db.execute(sql`
      SELECT
        c."id",
        c."uuid",
        c."user_id" as "userId",
        c."entity_type" as "entityType",
        c."entity_id" as "entityId",
        c."parent_comment_id" as "parentCommentId",
        c."body",
        c."created_at" as "createdAt",
        c."updated_at" as "updatedAt",
        c."deleted_at" as "deletedAt",
        u."name" as "userName",
        u."image" as "userImage",
        up."display_name" as "displayName",
        up."avatar_url" as "avatarUrl",
        parent_c."uuid" as "parentUuid",
        COALESCE(reply_cnt.cnt, 0) as "replyCount",
        COALESCE(v_up.cnt, 0) as "upvotes",
        COALESCE(v_down.cnt, 0) as "downvotes",
        ${authenticatedUserId
          ? sql`COALESCE(my_vote."value", 0)`
          : sql`0`
        } as "userVote"
      FROM "comments" c
      INNER JOIN "users" u ON c."user_id" = u."id"
      LEFT JOIN "user_profiles" up ON c."user_id" = up."user_id"
      LEFT JOIN "comments" parent_c ON c."parent_comment_id" = parent_c."id"
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt FROM "comments" r
        WHERE r."parent_comment_id" = c."id" AND r."deleted_at" IS NULL
      ) reply_cnt ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt FROM "votes" v
        WHERE v."entity_type" = 'comment' AND v."entity_id" = c."uuid" AND v."value" = 1
      ) v_up ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt FROM "votes" v
        WHERE v."entity_type" = 'comment' AND v."entity_id" = c."uuid" AND v."value" = -1
      ) v_down ON true
      ${authenticatedUserId
        ? sql`LEFT JOIN "votes" my_vote ON my_vote."entity_type" = 'comment' AND my_vote."entity_id" = c."uuid" AND my_vote."user_id" = ${authenticatedUserId}`
        : sql``
      }
      WHERE c."entity_type" = ${entityType}
        AND c."entity_id" = ${entityId}
        AND ${parentCommentFilter}
      ORDER BY ${orderByClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    // Cast the result to CommentRow array
    const rows = (rawResult as unknown as CommentRow[]);
    const comments = rows.map(mapCommentRow);

    return {
      comments,
      totalCount,
      hasMore: offset + comments.length < totalCount,
    };
  },
};

export const socialCommentMutations = {
  addComment: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 10);

    const validated = validateInput(AddCommentInputSchema, input, 'input');
    const { entityType, entityId, parentCommentUuid, body } = validated;
    const userId = ctx.userId!;

    await validateEntityExists(entityType, entityId);

    let parentCommentId: number | null = null;
    if (parentCommentUuid) {
      const [parent] = await db
        .select({
          id: dbSchema.comments.id,
          entityType: dbSchema.comments.entityType,
          entityId: dbSchema.comments.entityId,
          deletedAt: dbSchema.comments.deletedAt,
        })
        .from(dbSchema.comments)
        .where(eq(dbSchema.comments.uuid, parentCommentUuid))
        .limit(1);

      if (!parent) {
        throw new Error('Parent comment not found');
      }
      if (parent.deletedAt) {
        throw new Error('Cannot reply to a deleted comment');
      }
      if (parent.entityType !== entityType || parent.entityId !== entityId) {
        throw new Error('Parent comment belongs to a different entity');
      }
      parentCommentId = parent.id;
    }

    const uuid = crypto.randomUUID();

    const [inserted] = await db
      .insert(dbSchema.comments)
      .values({
        uuid,
        userId,
        entityType,
        entityId,
        parentCommentId,
        body,
      })
      .returning();

    // Fetch user info
    const [user] = await db
      .select({
        name: dbSchema.users.name,
        image: dbSchema.users.image,
        displayName: dbSchema.userProfiles.displayName,
        avatarUrl: dbSchema.userProfiles.avatarUrl,
      })
      .from(dbSchema.users)
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
      .where(eq(dbSchema.users.id, userId))
      .limit(1);

    return {
      uuid: inserted.uuid,
      userId: inserted.userId,
      userDisplayName: user?.displayName || user?.name || undefined,
      userAvatarUrl: user?.avatarUrl || user?.image || undefined,
      entityType: inserted.entityType,
      entityId: inserted.entityId,
      parentCommentUuid: parentCommentUuid || null,
      body: inserted.body,
      isDeleted: false,
      replyCount: 0,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      userVote: 0,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    };
  },

  updateComment: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 10);

    const validated = validateInput(UpdateCommentInputSchema, input, 'input');
    const { commentUuid, body } = validated;
    const userId = ctx.userId!;

    const [comment] = await db
      .select()
      .from(dbSchema.comments)
      .where(eq(dbSchema.comments.uuid, commentUuid))
      .limit(1);

    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('You can only edit your own comments');
    }
    if (comment.deletedAt) {
      throw new Error('Cannot edit a deleted comment');
    }

    const now = new Date();
    const [updated] = await db
      .update(dbSchema.comments)
      .set({ body, updatedAt: now })
      .where(eq(dbSchema.comments.uuid, commentUuid))
      .returning();

    // Fetch enriched data for the response
    const [user] = await db
      .select({
        name: dbSchema.users.name,
        image: dbSchema.users.image,
        displayName: dbSchema.userProfiles.displayName,
        avatarUrl: dbSchema.userProfiles.avatarUrl,
      })
      .from(dbSchema.users)
      .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
      .where(eq(dbSchema.users.id, userId))
      .limit(1);

    // Fetch vote data using query builder
    const { upvotes, downvotes } = await getCommentVoteCounts(commentUuid);

    // Reply count
    const replyResult = await db
      .select({ count: count() })
      .from(dbSchema.comments)
      .where(
        and(
          eq(dbSchema.comments.parentCommentId, comment.id),
          isNull(dbSchema.comments.deletedAt),
        ),
      );
    const replyCount = Number(replyResult[0]?.count || 0);

    // User's own vote
    const [myVote] = await db
      .select({ value: dbSchema.votes.value })
      .from(dbSchema.votes)
      .where(
        and(
          eq(dbSchema.votes.entityType, 'comment'),
          eq(dbSchema.votes.entityId, commentUuid),
          eq(dbSchema.votes.userId, userId),
        ),
      )
      .limit(1);

    // Get parent UUID if applicable
    let parentCommentUuid: string | null = null;
    if (updated.parentCommentId) {
      const [parentComment] = await db
        .select({ uuid: dbSchema.comments.uuid })
        .from(dbSchema.comments)
        .where(eq(dbSchema.comments.id, updated.parentCommentId))
        .limit(1);
      parentCommentUuid = parentComment?.uuid || null;
    }

    return {
      uuid: updated.uuid,
      userId: updated.userId,
      userDisplayName: user?.displayName || user?.name || undefined,
      userAvatarUrl: user?.avatarUrl || user?.image || undefined,
      entityType: updated.entityType,
      entityId: updated.entityId,
      parentCommentUuid,
      body: updated.body,
      isDeleted: false,
      replyCount,
      upvotes,
      downvotes,
      voteScore: upvotes - downvotes,
      userVote: myVote?.value || 0,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  deleteComment: async (
    _: unknown,
    { commentUuid }: { commentUuid: string },
    ctx: ConnectionContext,
  ): Promise<boolean> => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    const [comment] = await db
      .select()
      .from(dbSchema.comments)
      .where(eq(dbSchema.comments.uuid, commentUuid))
      .limit(1);

    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new Error('You can only delete your own comments');
    }
    if (comment.deletedAt) {
      return true; // Already deleted
    }

    // Check if comment has replies
    const replyResult = await db
      .select({ count: count() })
      .from(dbSchema.comments)
      .where(eq(dbSchema.comments.parentCommentId, comment.id));

    const hasReplies = Number(replyResult[0]?.count || 0) > 0;

    if (hasReplies) {
      // Soft delete — preserve thread structure
      await db
        .update(dbSchema.comments)
        .set({ deletedAt: new Date() })
        .where(eq(dbSchema.comments.uuid, commentUuid));
    } else {
      // Hard delete
      await db
        .delete(dbSchema.comments)
        .where(eq(dbSchema.comments.uuid, commentUuid));
    }

    return true;
  },
};
