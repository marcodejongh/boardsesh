import { eq, and, count, inArray } from 'drizzle-orm';
import type { ConnectionContext, SocialEntityType } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers';
import {
  VoteInputSchema,
  BulkVoteSummaryInputSchema,
  SocialEntityTypeSchema,
} from '../../../validation/schemas';
import { validateEntityExists } from './entity-validation';

async function getVoteSummary(
  entityType: SocialEntityType,
  entityId: string,
  authenticatedUserId: string | null | undefined,
) {
  const upvoteResult = await db
    .select({ count: count() })
    .from(dbSchema.votes)
    .where(
      and(
        eq(dbSchema.votes.entityType, entityType),
        eq(dbSchema.votes.entityId, entityId),
        eq(dbSchema.votes.value, 1),
      ),
    );
  const downvoteResult = await db
    .select({ count: count() })
    .from(dbSchema.votes)
    .where(
      and(
        eq(dbSchema.votes.entityType, entityType),
        eq(dbSchema.votes.entityId, entityId),
        eq(dbSchema.votes.value, -1),
      ),
    );

  const upvotes = Number(upvoteResult[0]?.count || 0);
  const downvotes = Number(downvoteResult[0]?.count || 0);

  let userVote = 0;
  if (authenticatedUserId) {
    const [myVote] = await db
      .select({ value: dbSchema.votes.value })
      .from(dbSchema.votes)
      .where(
        and(
          eq(dbSchema.votes.entityType, entityType),
          eq(dbSchema.votes.entityId, entityId),
          eq(dbSchema.votes.userId, authenticatedUserId),
        ),
      )
      .limit(1);
    userVote = myVote?.value || 0;
  }

  return {
    entityType,
    entityId,
    upvotes,
    downvotes,
    voteScore: upvotes - downvotes,
    userVote,
  };
}

export const socialVoteQueries = {
  voteSummary: async (
    _: unknown,
    { entityType, entityId }: { entityType: string; entityId: string },
    ctx: ConnectionContext,
  ) => {
    const validatedType = validateInput(SocialEntityTypeSchema, entityType, 'entityType') as SocialEntityType;
    const authenticatedUserId = ctx.isAuthenticated ? ctx.userId : null;

    return getVoteSummary(validatedType, entityId, authenticatedUserId);
  },

  bulkVoteSummaries: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(BulkVoteSummaryInputSchema, input, 'input');
    const { entityType, entityIds } = validated;
    const authenticatedUserId = ctx.isAuthenticated ? ctx.userId : null;

    if (entityIds.length === 0) return [];

    // Batch query upvote counts grouped by entity_id
    const upvoteResults = await db
      .select({
        entityId: dbSchema.votes.entityId,
        count: count(),
      })
      .from(dbSchema.votes)
      .where(
        and(
          eq(dbSchema.votes.entityType, entityType),
          inArray(dbSchema.votes.entityId, entityIds),
          eq(dbSchema.votes.value, 1),
        ),
      )
      .groupBy(dbSchema.votes.entityId);

    const downvoteResults = await db
      .select({
        entityId: dbSchema.votes.entityId,
        count: count(),
      })
      .from(dbSchema.votes)
      .where(
        and(
          eq(dbSchema.votes.entityType, entityType),
          inArray(dbSchema.votes.entityId, entityIds),
          eq(dbSchema.votes.value, -1),
        ),
      )
      .groupBy(dbSchema.votes.entityId);

    const votesMap = new Map<string, { upvotes: number; downvotes: number }>();
    for (const row of upvoteResults) {
      votesMap.set(row.entityId, {
        upvotes: Number(row.count || 0),
        downvotes: 0,
      });
    }
    for (const row of downvoteResults) {
      const existing = votesMap.get(row.entityId) || { upvotes: 0, downvotes: 0 };
      existing.downvotes = Number(row.count || 0);
      votesMap.set(row.entityId, existing);
    }

    // Batch fetch user votes if authenticated
    const userVotesMap = new Map<string, number>();
    if (authenticatedUserId) {
      const userVotes = await db
        .select({
          entityId: dbSchema.votes.entityId,
          value: dbSchema.votes.value,
        })
        .from(dbSchema.votes)
        .where(
          and(
            eq(dbSchema.votes.entityType, entityType),
            inArray(dbSchema.votes.entityId, entityIds),
            eq(dbSchema.votes.userId, authenticatedUserId),
          ),
        );

      for (const v of userVotes) {
        userVotesMap.set(v.entityId, v.value);
      }
    }

    return entityIds.map((entityId) => {
      const votes = votesMap.get(entityId) || { upvotes: 0, downvotes: 0 };
      return {
        entityType,
        entityId,
        upvotes: votes.upvotes,
        downvotes: votes.downvotes,
        voteScore: votes.upvotes - votes.downvotes,
        userVote: userVotesMap.get(entityId) || 0,
      };
    });
  },
};

export const socialVoteMutations = {
  vote: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    applyRateLimit(ctx, 30);

    const validated = validateInput(VoteInputSchema, input, 'input');
    const { entityType, entityId, value } = validated;
    const userId = ctx.userId!;

    await validateEntityExists(entityType as SocialEntityType, entityId);

    // Check for existing vote
    const [existing] = await db
      .select({ id: dbSchema.votes.id, value: dbSchema.votes.value })
      .from(dbSchema.votes)
      .where(
        and(
          eq(dbSchema.votes.userId, userId),
          eq(dbSchema.votes.entityType, entityType as SocialEntityType),
          eq(dbSchema.votes.entityId, entityId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.value === value) {
        // Same value — toggle off (remove vote)
        await db
          .delete(dbSchema.votes)
          .where(eq(dbSchema.votes.id, existing.id));
      } else {
        // Different value — update
        await db
          .update(dbSchema.votes)
          .set({ value })
          .where(eq(dbSchema.votes.id, existing.id));
      }
    } else {
      // No existing vote — insert
      await db
        .insert(dbSchema.votes)
        .values({
          userId,
          entityType: entityType as SocialEntityType,
          entityId,
          value,
        });
    }

    return getVoteSummary(entityType as SocialEntityType, entityId, userId);
  },
};
