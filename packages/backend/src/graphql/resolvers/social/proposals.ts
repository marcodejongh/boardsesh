import { eq, and, sql, count, desc, isNull, inArray, sum } from 'drizzle-orm';
import type { ConnectionContext, ProposalStatus } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, applyRateLimit, validateInput } from '../shared/helpers';
import {
  CreateProposalInputSchema,
  VoteOnProposalInputSchema,
  ResolveProposalInputSchema,
  DeleteProposalInputSchema,
  SetterOverrideInputSchema,
  FreezeClimbInputSchema,
  GetClimbProposalsInputSchema,
  BrowseProposalsInputSchema,
} from '../../../validation/schemas';
import { publishSocialEvent } from '../../../events/index';
import { requireAdminOrLeader, getUserVoteWeight } from './roles';
import { resolveCommunitySetting, DEFAULTS } from './community-settings';
import crypto from 'crypto';

// ============================================
// Helpers
// ============================================

async function enrichProposal(
  proposal: typeof dbSchema.climbProposals.$inferSelect,
  authenticatedUserId: string | null | undefined,
) {
  // Fetch proposer profile (LEFT JOIN to get OAuth name/image as fallback)
  const [proposer] = await db
    .select({
      name: dbSchema.users.name,
      image: dbSchema.users.image,
      displayName: dbSchema.userProfiles.displayName,
      avatarUrl: dbSchema.userProfiles.avatarUrl,
    })
    .from(dbSchema.users)
    .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
    .where(eq(dbSchema.users.id, proposal.proposerId))
    .limit(1);

  // Compute weighted vote counts
  const voteRows = await db
    .select({
      value: dbSchema.proposalVotes.value,
      weight: dbSchema.proposalVotes.weight,
    })
    .from(dbSchema.proposalVotes)
    .where(eq(dbSchema.proposalVotes.proposalId, proposal.id));

  let weightedUpvotes = 0;
  let weightedDownvotes = 0;
  for (const v of voteRows) {
    if (v.value > 0) weightedUpvotes += v.value * v.weight;
    else weightedDownvotes += Math.abs(v.value) * v.weight;
  }

  // Get required upvotes from settings
  const threshold = await resolveCommunitySetting(
    'approval_threshold',
    proposal.climbUuid,
    proposal.angle,
    proposal.boardType,
  );
  const requiredUpvotes = parseInt(threshold, 10) || 5;

  // Get current user's vote
  let userVote = 0;
  if (authenticatedUserId) {
    const [myVote] = await db
      .select({ value: dbSchema.proposalVotes.value })
      .from(dbSchema.proposalVotes)
      .where(
        and(
          eq(dbSchema.proposalVotes.proposalId, proposal.id),
          eq(dbSchema.proposalVotes.userId, authenticatedUserId),
        ),
      )
      .limit(1);
    userVote = myVote?.value || 0;
  }

  return {
    uuid: proposal.uuid,
    climbUuid: proposal.climbUuid,
    boardType: proposal.boardType,
    angle: proposal.angle,
    proposerId: proposal.proposerId,
    proposerDisplayName: proposer?.displayName || proposer?.name || undefined,
    proposerAvatarUrl: proposer?.avatarUrl || proposer?.image || undefined,
    type: proposal.type,
    proposedValue: proposal.proposedValue,
    currentValue: proposal.currentValue,
    status: proposal.status,
    reason: proposal.reason,
    resolvedAt: proposal.resolvedAt?.toISOString() || undefined,
    resolvedBy: proposal.resolvedBy,
    createdAt: proposal.createdAt.toISOString(),
    weightedUpvotes,
    weightedDownvotes,
    requiredUpvotes,
    userVote,
  };
}

/**
 * Batch-enrich multiple proposals in 3-4 queries total (instead of 4-7 per proposal).
 */
async function batchEnrichProposals(
  proposals: (typeof dbSchema.climbProposals.$inferSelect)[],
  authenticatedUserId: string | null | undefined,
) {
  if (proposals.length === 0) return [];

  const proposalIds = proposals.map((p) => p.id);
  const uniqueProposerIds = [...new Set(proposals.map((p) => p.proposerId))];

  // Query 1: Batch proposer profiles
  const proposerRows = await db
    .select({
      id: dbSchema.users.id,
      name: dbSchema.users.name,
      image: dbSchema.users.image,
      displayName: dbSchema.userProfiles.displayName,
      avatarUrl: dbSchema.userProfiles.avatarUrl,
    })
    .from(dbSchema.users)
    .leftJoin(dbSchema.userProfiles, eq(dbSchema.users.id, dbSchema.userProfiles.userId))
    .where(inArray(dbSchema.users.id, uniqueProposerIds));

  const proposerMap = new Map(proposerRows.map((p) => [p.id, p]));

  // Query 2: Batch all votes
  const voteRows = await db
    .select({
      proposalId: dbSchema.proposalVotes.proposalId,
      value: dbSchema.proposalVotes.value,
      weight: dbSchema.proposalVotes.weight,
    })
    .from(dbSchema.proposalVotes)
    .where(inArray(dbSchema.proposalVotes.proposalId, proposalIds));

  const voteMap = new Map<number, { weightedUpvotes: number; weightedDownvotes: number }>();
  for (const v of voteRows) {
    let entry = voteMap.get(v.proposalId);
    if (!entry) {
      entry = { weightedUpvotes: 0, weightedDownvotes: 0 };
      voteMap.set(v.proposalId, entry);
    }
    if (v.value > 0) entry.weightedUpvotes += v.value * v.weight;
    else entry.weightedDownvotes += Math.abs(v.value) * v.weight;
  }

  // Query 3: Batch approval thresholds
  const uniqueClimbUuids = [...new Set(proposals.map((p) => p.climbUuid))];
  const uniqueBoardTypes = [...new Set(proposals.map((p) => p.boardType))];

  const thresholdRows = await db
    .select({
      scope: dbSchema.communitySettings.scope,
      scopeKey: dbSchema.communitySettings.scopeKey,
      value: dbSchema.communitySettings.value,
    })
    .from(dbSchema.communitySettings)
    .where(
      and(
        eq(dbSchema.communitySettings.key, 'approval_threshold'),
        sql`(
          (${dbSchema.communitySettings.scope} = 'climb' AND ${dbSchema.communitySettings.scopeKey} IN (${sql.join(uniqueClimbUuids.map((u) => sql`${u}`), sql`, `)}))
          OR (${dbSchema.communitySettings.scope} = 'board' AND ${dbSchema.communitySettings.scopeKey} IN (${sql.join(uniqueBoardTypes.map((b) => sql`${b}`), sql`, `)}))
          OR (${dbSchema.communitySettings.scope} = 'global' AND ${dbSchema.communitySettings.scopeKey} = '')
        )`,
      ),
    );

  const thresholdMap = new Map(thresholdRows.map((r) => [`${r.scope}:${r.scopeKey}`, r.value]));

  function resolveThreshold(climbUuid: string, boardType: string): number {
    const climbVal = thresholdMap.get(`climb:${climbUuid}`);
    if (climbVal) return parseInt(climbVal, 10) || 5;
    const boardVal = thresholdMap.get(`board:${boardType}`);
    if (boardVal) return parseInt(boardVal, 10) || 5;
    const globalVal = thresholdMap.get(`global:`);
    if (globalVal) return parseInt(globalVal, 10) || 5;
    return parseInt(DEFAULTS['approval_threshold'], 10) || 5;
  }

  // Query 4 (conditional): Batch user votes
  const userVoteMap = new Map<number, number>();
  if (authenticatedUserId) {
    const userVoteRows = await db
      .select({
        proposalId: dbSchema.proposalVotes.proposalId,
        value: dbSchema.proposalVotes.value,
      })
      .from(dbSchema.proposalVotes)
      .where(
        and(
          inArray(dbSchema.proposalVotes.proposalId, proposalIds),
          eq(dbSchema.proposalVotes.userId, authenticatedUserId),
        ),
      );

    for (const uv of userVoteRows) {
      userVoteMap.set(uv.proposalId, uv.value);
    }
  }

  // Assemble results
  return proposals.map((proposal) => {
    const proposer = proposerMap.get(proposal.proposerId);
    const votes = voteMap.get(proposal.id) || { weightedUpvotes: 0, weightedDownvotes: 0 };
    const requiredUpvotes = resolveThreshold(proposal.climbUuid, proposal.boardType);
    const userVote = userVoteMap.get(proposal.id) || 0;

    return {
      uuid: proposal.uuid,
      climbUuid: proposal.climbUuid,
      boardType: proposal.boardType,
      angle: proposal.angle,
      proposerId: proposal.proposerId,
      proposerDisplayName: proposer?.displayName || proposer?.name || undefined,
      proposerAvatarUrl: proposer?.avatarUrl || proposer?.image || undefined,
      type: proposal.type,
      proposedValue: proposal.proposedValue,
      currentValue: proposal.currentValue,
      status: proposal.status,
      reason: proposal.reason,
      resolvedAt: proposal.resolvedAt?.toISOString() || undefined,
      resolvedBy: proposal.resolvedBy,
      createdAt: proposal.createdAt.toISOString(),
      weightedUpvotes: votes.weightedUpvotes,
      weightedDownvotes: votes.weightedDownvotes,
      requiredUpvotes,
      userVote,
    };
  });
}

async function applyProposalEffect(proposal: typeof dbSchema.climbProposals.$inferSelect): Promise<void> {
  if (proposal.type === 'grade' || proposal.type === 'benchmark') {
    // UPSERT climb_community_status
    const [existing] = await db
      .select()
      .from(dbSchema.climbCommunityStatus)
      .where(
        and(
          eq(dbSchema.climbCommunityStatus.climbUuid, proposal.climbUuid),
          eq(dbSchema.climbCommunityStatus.boardType, proposal.boardType),
          eq(dbSchema.climbCommunityStatus.angle, proposal.angle!),
        ),
      )
      .limit(1);

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      lastProposalId: proposal.id,
    };

    if (proposal.type === 'grade') {
      updates.communityGrade = proposal.proposedValue;
    } else if (proposal.type === 'benchmark') {
      updates.isBenchmark = proposal.proposedValue === 'true';
    }

    if (existing) {
      await db
        .update(dbSchema.climbCommunityStatus)
        .set(updates)
        .where(eq(dbSchema.climbCommunityStatus.id, existing.id));
    } else {
      await db
        .insert(dbSchema.climbCommunityStatus)
        .values({
          climbUuid: proposal.climbUuid,
          boardType: proposal.boardType,
          angle: proposal.angle!,
          communityGrade: proposal.type === 'grade' ? proposal.proposedValue : null,
          isBenchmark: proposal.type === 'benchmark' ? proposal.proposedValue === 'true' : false,
          lastProposalId: proposal.id,
        });
    }
  } else if (proposal.type === 'classic') {
    // UPSERT climb_classic_status
    const [existing] = await db
      .select()
      .from(dbSchema.climbClassicStatus)
      .where(
        and(
          eq(dbSchema.climbClassicStatus.climbUuid, proposal.climbUuid),
          eq(dbSchema.climbClassicStatus.boardType, proposal.boardType),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(dbSchema.climbClassicStatus)
        .set({
          isClassic: proposal.proposedValue === 'true',
          updatedAt: new Date(),
          lastProposalId: proposal.id,
        })
        .where(eq(dbSchema.climbClassicStatus.id, existing.id));
    } else {
      await db
        .insert(dbSchema.climbClassicStatus)
        .values({
          climbUuid: proposal.climbUuid,
          boardType: proposal.boardType,
          isClassic: proposal.proposedValue === 'true',
          lastProposalId: proposal.id,
        });
    }
  }
}

/**
 * Revert the effect of a previously-approved proposal.
 * Finds the most recent OTHER approved proposal of the same type for the same climb+angle
 * and reverts to that value (or to the default if none exists).
 */
async function revertProposalEffect(proposal: typeof dbSchema.climbProposals.$inferSelect): Promise<void> {
  if (proposal.type === 'grade' || proposal.type === 'benchmark') {
    // Find the most recent other approved proposal of the same type for this climb+angle
    const conditions = [
      eq(dbSchema.climbProposals.climbUuid, proposal.climbUuid),
      eq(dbSchema.climbProposals.boardType, proposal.boardType),
      eq(dbSchema.climbProposals.type, proposal.type),
      eq(dbSchema.climbProposals.status, 'approved'),
      sql`${dbSchema.climbProposals.id} != ${proposal.id}`,
    ];
    if (proposal.angle != null) {
      conditions.push(eq(dbSchema.climbProposals.angle, proposal.angle));
    }

    const [previousProposal] = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.climbProposals.resolvedAt))
      .limit(1);

    const [existing] = await db
      .select()
      .from(dbSchema.climbCommunityStatus)
      .where(
        and(
          eq(dbSchema.climbCommunityStatus.climbUuid, proposal.climbUuid),
          eq(dbSchema.climbCommunityStatus.boardType, proposal.boardType),
          eq(dbSchema.climbCommunityStatus.angle, proposal.angle!),
        ),
      )
      .limit(1);

    if (existing) {
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        lastProposalId: previousProposal?.id || null,
      };

      if (proposal.type === 'grade') {
        updates.communityGrade = previousProposal?.proposedValue || null;
      } else if (proposal.type === 'benchmark') {
        updates.isBenchmark = previousProposal ? previousProposal.proposedValue === 'true' : false;
      }

      await db
        .update(dbSchema.climbCommunityStatus)
        .set(updates)
        .where(eq(dbSchema.climbCommunityStatus.id, existing.id));
    }
  } else if (proposal.type === 'classic') {
    // Find the most recent other approved classic proposal for this climb
    const [previousProposal] = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(
        and(
          eq(dbSchema.climbProposals.climbUuid, proposal.climbUuid),
          eq(dbSchema.climbProposals.boardType, proposal.boardType),
          eq(dbSchema.climbProposals.type, 'classic'),
          eq(dbSchema.climbProposals.status, 'approved'),
          sql`${dbSchema.climbProposals.id} != ${proposal.id}`,
        ),
      )
      .orderBy(desc(dbSchema.climbProposals.resolvedAt))
      .limit(1);

    const [existing] = await db
      .select()
      .from(dbSchema.climbClassicStatus)
      .where(
        and(
          eq(dbSchema.climbClassicStatus.climbUuid, proposal.climbUuid),
          eq(dbSchema.climbClassicStatus.boardType, proposal.boardType),
        ),
      )
      .limit(1);

    if (existing) {
      const classicUpdates: Record<string, unknown> = {
        isClassic: previousProposal ? previousProposal.proposedValue === 'true' : false,
        updatedAt: new Date(),
        lastProposalId: previousProposal?.id || null,
      };
      await db
        .update(dbSchema.climbClassicStatus)
        .set(classicUpdates)
        .where(eq(dbSchema.climbClassicStatus.id, existing.id));
    }
  }
}

/**
 * Analyze if a climb's grade at a given angle is an outlier compared to adjacent angles.
 */
async function analyzeGradeOutlier(
  climbUuid: string,
  boardType: string,
  angle: number,
): Promise<{ isOutlier: boolean; currentGrade: number; neighborAverage: number; neighborCount: number; gradeDifference: number } | null> {
  try {
    // Query climb stats across all angles for this climb (unified table)
    const stats = await db.execute(sql`
      SELECT angle, display_difficulty, ascensionist_count
      FROM board_climb_stats
      WHERE climb_uuid = ${climbUuid}
        AND board_type = ${boardType}
      ORDER BY angle
    `);

    const rows = (stats as unknown as { rows: Array<{ angle: number; display_difficulty: number; ascensionist_count: number }> }).rows;
    if (!rows || rows.length < 2) return null;

    // Find the current angle's data
    const currentRow = rows.find((r) => r.angle === angle);
    if (!currentRow) return null;

    const currentGrade = Number(currentRow.display_difficulty);

    // Find adjacent angles
    const sortedAngles = rows.map((r) => r.angle).sort((a, b) => a - b);
    const currentIdx = sortedAngles.indexOf(angle);
    if (currentIdx === -1) return null;

    // Resolve outlier settings
    const minAscentsStr = await resolveCommunitySetting('outlier_min_ascents', climbUuid, angle, boardType);
    const gradeDiffStr = await resolveCommunitySetting('outlier_grade_diff', climbUuid, angle, boardType);
    const minAscents = parseInt(minAscentsStr, 10) || 10;
    const gradeDiffThreshold = parseInt(gradeDiffStr, 10) || 2;

    // Get qualifying neighbors
    const neighbors: { difficulty: number; weight: number }[] = [];
    for (let i = Math.max(0, currentIdx - 2); i <= Math.min(sortedAngles.length - 1, currentIdx + 2); i++) {
      if (i === currentIdx) continue;
      const neighborRow = rows.find((r) => r.angle === sortedAngles[i]);
      if (!neighborRow) continue;
      if (Number(neighborRow.ascensionist_count) < minAscents) continue;
      neighbors.push({
        difficulty: Number(neighborRow.display_difficulty),
        weight: Number(neighborRow.ascensionist_count),
      });
    }

    if (neighbors.length < 2) return null;

    // Compute weighted average
    const totalWeight = neighbors.reduce((acc, n) => acc + n.weight, 0);
    const neighborAverage = neighbors.reduce((acc, n) => acc + n.difficulty * n.weight, 0) / totalWeight;
    const gradeDifference = Math.abs(currentGrade - neighborAverage);

    return {
      isOutlier: gradeDifference >= gradeDiffThreshold,
      currentGrade,
      neighborAverage,
      neighborCount: neighbors.length,
      gradeDifference,
    };
  } catch {
    return null;
  }
}

async function checkAutoApproval(proposalId: number, boardType: string, climbUuid: string, angle: number | null): Promise<boolean> {
  const threshold = await resolveCommunitySetting('approval_threshold', climbUuid, angle, boardType);
  const required = parseInt(threshold, 10) || 5;

  // Sum weighted upvotes
  const result = await db
    .select({
      weightedSum: sql<number>`COALESCE(SUM(${dbSchema.proposalVotes.value} * ${dbSchema.proposalVotes.weight}), 0)`.as('weighted_sum'),
    })
    .from(dbSchema.proposalVotes)
    .where(
      and(
        eq(dbSchema.proposalVotes.proposalId, proposalId),
        sql`${dbSchema.proposalVotes.value} > 0`,
      ),
    );

  const weightedSum = Number(result[0]?.weightedSum || 0);
  return weightedSum >= required;
}

// ============================================
// Queries
// ============================================

export const socialProposalQueries = {
  climbProposals: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(GetClimbProposalsInputSchema, input, 'input');
    const { climbUuid, boardType, angle, type, status, limit: rawLimit, offset: rawOffset } = validated;
    const limitVal = rawLimit ?? 20;
    const offsetVal = rawOffset ?? 0;
    const authenticatedUserId = ctx.isAuthenticated ? ctx.userId : null;

    const conditions = [
      eq(dbSchema.climbProposals.climbUuid, climbUuid),
      eq(dbSchema.climbProposals.boardType, boardType),
    ];
    if (angle != null) conditions.push(eq(dbSchema.climbProposals.angle, angle));
    if (type) conditions.push(eq(dbSchema.climbProposals.type, type));
    if (status) conditions.push(eq(dbSchema.climbProposals.status, status));

    const proposals = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(and(...conditions))
      .orderBy(desc(dbSchema.climbProposals.createdAt))
      .limit(limitVal)
      .offset(offsetVal);

    const [totalResult] = await db
      .select({ count: count() })
      .from(dbSchema.climbProposals)
      .where(and(...conditions));

    const totalCount = Number(totalResult?.count || 0);
    const enriched = await batchEnrichProposals(proposals, authenticatedUserId);

    return {
      proposals: enriched,
      totalCount,
      hasMore: offsetVal + limitVal < totalCount,
    };
  },

  browseProposals: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(BrowseProposalsInputSchema, input, 'input');
    const { boardType, type, status, limit: rawLimit, offset: rawOffset } = validated;
    const limitVal = rawLimit ?? 20;
    const offsetVal = rawOffset ?? 0;
    const authenticatedUserId = ctx.isAuthenticated ? ctx.userId : null;

    const conditions: ReturnType<typeof eq>[] = [];
    if (boardType) conditions.push(eq(dbSchema.climbProposals.boardType, boardType));
    if (type) conditions.push(eq(dbSchema.climbProposals.type, type));
    if (status) conditions.push(eq(dbSchema.climbProposals.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const proposals = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(whereClause)
      .orderBy(desc(dbSchema.climbProposals.createdAt))
      .limit(limitVal)
      .offset(offsetVal);

    const [totalResult] = await db
      .select({ count: count() })
      .from(dbSchema.climbProposals)
      .where(whereClause);

    const totalCount = Number(totalResult?.count || 0);
    const enriched = await batchEnrichProposals(proposals, authenticatedUserId);

    return {
      proposals: enriched,
      totalCount,
      hasMore: offsetVal + limitVal < totalCount,
    };
  },

  climbCommunityStatus: async (
    _: unknown,
    { climbUuid, boardType, angle }: { climbUuid: string; boardType: string; angle: number },
    ctx: ConnectionContext,
  ) => {
    // Get community status
    const [status] = await db
      .select()
      .from(dbSchema.climbCommunityStatus)
      .where(
        and(
          eq(dbSchema.climbCommunityStatus.climbUuid, climbUuid),
          eq(dbSchema.climbCommunityStatus.boardType, boardType),
          eq(dbSchema.climbCommunityStatus.angle, angle),
        ),
      )
      .limit(1);

    // Get classic status
    const [classicStatus] = await db
      .select()
      .from(dbSchema.climbClassicStatus)
      .where(
        and(
          eq(dbSchema.climbClassicStatus.climbUuid, climbUuid),
          eq(dbSchema.climbClassicStatus.boardType, boardType),
        ),
      )
      .limit(1);

    // Check if frozen
    const frozenSetting = await resolveCommunitySetting('climb_frozen', climbUuid, angle, boardType);
    const isFrozen = frozenSetting === 'true';

    let freezeReason: string | undefined;
    if (isFrozen) {
      freezeReason = await resolveCommunitySetting('climb_freeze_reason', climbUuid, angle, boardType);
      if (freezeReason === '0') freezeReason = undefined;
    }

    // Count open proposals
    const [openCount] = await db
      .select({ count: count() })
      .from(dbSchema.climbProposals)
      .where(
        and(
          eq(dbSchema.climbProposals.climbUuid, climbUuid),
          eq(dbSchema.climbProposals.boardType, boardType),
          eq(dbSchema.climbProposals.status, 'open'),
        ),
      );

    // Run outlier analysis
    const outlierAnalysis = await analyzeGradeOutlier(climbUuid, boardType, angle);

    return {
      climbUuid,
      boardType,
      angle,
      communityGrade: status?.communityGrade || null,
      isBenchmark: status?.isBenchmark || false,
      isClassic: classicStatus?.isClassic || false,
      isFrozen,
      freezeReason: freezeReason || null,
      openProposalCount: Number(openCount?.count || 0),
      outlierAnalysis: outlierAnalysis || null,
      updatedAt: status?.updatedAt?.toISOString() || null,
    };
  },

  bulkClimbCommunityStatus: async (
    _: unknown,
    { climbUuids, boardType, angle }: { climbUuids: string[]; boardType: string; angle: number },
    ctx: ConnectionContext,
  ) => {
    if (climbUuids.length === 0) return [];

    const statuses = await db
      .select()
      .from(dbSchema.climbCommunityStatus)
      .where(
        and(
          inArray(dbSchema.climbCommunityStatus.climbUuid, climbUuids),
          eq(dbSchema.climbCommunityStatus.boardType, boardType),
          eq(dbSchema.climbCommunityStatus.angle, angle),
        ),
      );

    const classicStatuses = await db
      .select()
      .from(dbSchema.climbClassicStatus)
      .where(
        and(
          inArray(dbSchema.climbClassicStatus.climbUuid, climbUuids),
          eq(dbSchema.climbClassicStatus.boardType, boardType),
        ),
      );

    const statusMap = new Map(statuses.map((s) => [s.climbUuid, s]));
    const classicMap = new Map(classicStatuses.map((s) => [s.climbUuid, s]));

    return climbUuids.map((uuid) => {
      const status = statusMap.get(uuid);
      const classicStatus = classicMap.get(uuid);
      return {
        climbUuid: uuid,
        boardType,
        angle,
        communityGrade: status?.communityGrade || null,
        isBenchmark: status?.isBenchmark || false,
        isClassic: classicStatus?.isClassic || false,
        isFrozen: false,
        freezeReason: null,
        openProposalCount: 0,
        outlierAnalysis: null,
        updatedAt: status?.updatedAt?.toISOString() || null,
      };
    });
  },

  climbClassicStatus: async (
    _: unknown,
    { climbUuid, boardType }: { climbUuid: string; boardType: string },
    ctx: ConnectionContext,
  ) => {
    const [status] = await db
      .select()
      .from(dbSchema.climbClassicStatus)
      .where(
        and(
          eq(dbSchema.climbClassicStatus.climbUuid, climbUuid),
          eq(dbSchema.climbClassicStatus.boardType, boardType),
        ),
      )
      .limit(1);

    return {
      climbUuid,
      boardType,
      isClassic: status?.isClassic || false,
      updatedAt: status?.updatedAt?.toISOString() || null,
    };
  },
};

// ============================================
// Mutations
// ============================================

export const socialProposalMutations = {
  createProposal: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    await applyRateLimit(ctx, 5);

    const validated = validateInput(CreateProposalInputSchema, input, 'input');
    const { climbUuid, boardType, angle, type, proposedValue, reason } = validated;
    const proposerId = ctx.userId!;

    // Validate: angle required for grade/benchmark, null for classic
    if ((type === 'grade' || type === 'benchmark') && angle == null) {
      throw new Error('Angle is required for grade and benchmark proposals');
    }
    if (type === 'classic' && angle != null) {
      throw new Error('Angle must not be set for classic proposals');
    }

    // Check not frozen
    const frozenSetting = await resolveCommunitySetting('climb_frozen', climbUuid, angle, boardType);
    if (frozenSetting === 'true') {
      throw new Error('This climb is frozen and cannot receive new proposals');
    }

    // Resolve current value
    let currentValue = '';
    if (type === 'grade') {
      // Try community status first, then board climb stats
      const [communityStatus] = await db
        .select({ communityGrade: dbSchema.climbCommunityStatus.communityGrade })
        .from(dbSchema.climbCommunityStatus)
        .where(
          and(
            eq(dbSchema.climbCommunityStatus.climbUuid, climbUuid),
            eq(dbSchema.climbCommunityStatus.boardType, boardType),
            eq(dbSchema.climbCommunityStatus.angle, angle!),
          ),
        )
        .limit(1);

      if (communityStatus?.communityGrade) {
        currentValue = communityStatus.communityGrade;
      } else {
        try {
          // Use unified board_climb_stats table with board_type filter
          // Join board_difficulty_grades for accurate grade name
          const result = await db.execute(sql`
            SELECT dg.boulder_name as grade_name
            FROM board_climb_stats cs
            LEFT JOIN board_difficulty_grades dg
              ON dg.difficulty = ROUND(cs.display_difficulty::numeric)
              AND dg.board_type = cs.board_type
            WHERE cs.climb_uuid = ${climbUuid}
              AND cs.angle = ${angle}
              AND cs.board_type = ${boardType}
            LIMIT 1
          `);
          const rows = (result as unknown as { rows: Array<{ grade_name: string | null }> }).rows;
          currentValue = rows[0]?.grade_name || 'Unknown';
        } catch {
          currentValue = 'Unknown';
        }
      }

      // Prevent proposals to the same grade
      if (currentValue === proposedValue) {
        throw new Error('Proposed grade is the same as the current grade');
      }
    } else if (type === 'benchmark') {
      const [communityStatus] = await db
        .select({ isBenchmark: dbSchema.climbCommunityStatus.isBenchmark })
        .from(dbSchema.climbCommunityStatus)
        .where(
          and(
            eq(dbSchema.climbCommunityStatus.climbUuid, climbUuid),
            eq(dbSchema.climbCommunityStatus.boardType, boardType),
            eq(dbSchema.climbCommunityStatus.angle, angle!),
          ),
        )
        .limit(1);
      currentValue = String(communityStatus?.isBenchmark || false);
    } else if (type === 'classic') {
      const [classicStatus] = await db
        .select({ isClassic: dbSchema.climbClassicStatus.isClassic })
        .from(dbSchema.climbClassicStatus)
        .where(
          and(
            eq(dbSchema.climbClassicStatus.climbUuid, climbUuid),
            eq(dbSchema.climbClassicStatus.boardType, boardType),
          ),
        )
        .limit(1);
      currentValue = String(classicStatus?.isClassic || false);
    }

    // Supersede existing open proposals of same (climbUuid, angle, type)
    const supersedeConditions = [
      eq(dbSchema.climbProposals.climbUuid, climbUuid),
      eq(dbSchema.climbProposals.boardType, boardType),
      eq(dbSchema.climbProposals.type, type),
      eq(dbSchema.climbProposals.status, 'open'),
    ];
    if (angle != null) supersedeConditions.push(eq(dbSchema.climbProposals.angle, angle));
    else supersedeConditions.push(isNull(dbSchema.climbProposals.angle));

    await db
      .update(dbSchema.climbProposals)
      .set({ status: 'superseded', resolvedAt: new Date() })
      .where(and(...supersedeConditions));

    // Insert proposal
    const uuid = crypto.randomUUID();
    const [proposal] = await db
      .insert(dbSchema.climbProposals)
      .values({
        uuid,
        climbUuid,
        boardType,
        angle: angle || null,
        proposerId,
        type,
        proposedValue,
        currentValue,
        reason: reason || null,
      })
      .returning();

    // Auto-vote with proposer's weight
    const weight = await getUserVoteWeight(proposerId, boardType);
    await db
      .insert(dbSchema.proposalVotes)
      .values({
        proposalId: proposal.id,
        userId: proposerId,
        value: 1,
        weight,
      });

    // Check auto-approval (atomic: only transition if still 'open')
    const shouldApprove = await checkAutoApproval(proposal.id, boardType, climbUuid, angle || null);
    if (shouldApprove) {
      const [approved] = await db
        .update(dbSchema.climbProposals)
        .set({ status: 'approved', resolvedAt: new Date() })
        .where(and(
          eq(dbSchema.climbProposals.id, proposal.id),
          eq(dbSchema.climbProposals.status, 'open'),
        ))
        .returning();

      if (approved) {
        proposal.status = 'approved';
        proposal.resolvedAt = approved.resolvedAt;

        await applyProposalEffect(proposal);

        publishSocialEvent({
          type: 'proposal.approved',
          actorId: proposerId,
          entityType: 'proposal',
          entityId: uuid,
          timestamp: Date.now(),
          metadata: { climbUuid, boardType, proposalType: type },
        }).catch((err) => console.error('[Proposals] Failed to publish proposal.approved:', err));
      }
    }

    // Publish created event
    publishSocialEvent({
      type: 'proposal.created',
      actorId: proposerId,
      entityType: 'proposal',
      entityId: uuid,
      timestamp: Date.now(),
      metadata: { climbUuid, boardType, proposalType: type },
    }).catch((err) => console.error('[Proposals] Failed to publish proposal.created:', err));

    return enrichProposal(proposal, proposerId);
  },

  voteOnProposal: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    await applyRateLimit(ctx, 20);

    const validated = validateInput(VoteOnProposalInputSchema, input, 'input');
    const { proposalUuid, value } = validated;
    const userId = ctx.userId!;

    // Find proposal
    const [proposal] = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(eq(dbSchema.climbProposals.uuid, proposalUuid))
      .limit(1);

    if (!proposal) {
      throw new Error('Proposal not found');
    }
    if (proposal.status !== 'open') {
      throw new Error('Can only vote on open proposals');
    }

    // Compute voter's weight
    const weight = await getUserVoteWeight(userId, proposal.boardType);

    // UPSERT vote (toggle off if same value)
    const [existingVote] = await db
      .select()
      .from(dbSchema.proposalVotes)
      .where(
        and(
          eq(dbSchema.proposalVotes.proposalId, proposal.id),
          eq(dbSchema.proposalVotes.userId, userId),
        ),
      )
      .limit(1);

    if (existingVote) {
      if (existingVote.value === value) {
        // Toggle off
        await db.delete(dbSchema.proposalVotes).where(eq(dbSchema.proposalVotes.id, existingVote.id));
      } else {
        // Change direction
        await db
          .update(dbSchema.proposalVotes)
          .set({ value, weight })
          .where(eq(dbSchema.proposalVotes.id, existingVote.id));
      }
    } else {
      await db
        .insert(dbSchema.proposalVotes)
        .values({ proposalId: proposal.id, userId, value, weight });
    }

    // Check auto-approval (atomic: only transition if still 'open')
    const shouldApprove = await checkAutoApproval(proposal.id, proposal.boardType, proposal.climbUuid, proposal.angle);
    if (shouldApprove) {
      const [approved] = await db
        .update(dbSchema.climbProposals)
        .set({ status: 'approved', resolvedAt: new Date() })
        .where(and(
          eq(dbSchema.climbProposals.id, proposal.id),
          eq(dbSchema.climbProposals.status, 'open'),
        ))
        .returning();

      if (approved) {
        proposal.status = 'approved';
        proposal.resolvedAt = approved.resolvedAt;

        await applyProposalEffect(proposal);

        publishSocialEvent({
          type: 'proposal.approved',
          actorId: userId,
          entityType: 'proposal',
          entityId: proposalUuid,
          timestamp: Date.now(),
          metadata: { climbUuid: proposal.climbUuid, boardType: proposal.boardType, proposalType: proposal.type },
        }).catch((err) => console.error('[Proposals] Failed to publish proposal.approved:', err));
      }
    }

    // Publish voted event
    publishSocialEvent({
      type: 'proposal.voted',
      actorId: userId,
      entityType: 'proposal',
      entityId: proposalUuid,
      timestamp: Date.now(),
      metadata: { value: String(value), climbUuid: proposal.climbUuid, boardType: proposal.boardType },
    }).catch((err) => console.error('[Proposals] Failed to publish proposal.voted:', err));

    return enrichProposal(proposal, userId);
  },

  resolveProposal: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(ResolveProposalInputSchema, input, 'input');
    const { proposalUuid, status, reason } = validated;

    // Find proposal
    const [proposal] = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(eq(dbSchema.climbProposals.uuid, proposalUuid))
      .limit(1);

    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'open') throw new Error('Can only resolve open proposals');

    await requireAdminOrLeader(ctx, proposal.boardType);
    const userId = ctx.userId!;

    // Update proposal
    await db
      .update(dbSchema.climbProposals)
      .set({
        status: status as ProposalStatus,
        resolvedAt: new Date(),
        resolvedBy: userId,
        reason: reason || proposal.reason,
      })
      .where(eq(dbSchema.climbProposals.id, proposal.id));

    proposal.status = status as typeof proposal.status;
    proposal.resolvedAt = new Date();
    proposal.resolvedBy = userId;

    if (status === 'approved') {
      await applyProposalEffect(proposal);
    }

    const eventType = status === 'approved' ? 'proposal.approved' : 'proposal.rejected';
    publishSocialEvent({
      type: eventType,
      actorId: userId,
      entityType: 'proposal',
      entityId: proposalUuid,
      timestamp: Date.now(),
      metadata: { climbUuid: proposal.climbUuid, boardType: proposal.boardType, proposalType: proposal.type },
    }).catch((err) => console.error(`[Proposals] Failed to publish ${eventType}:`, err));

    return enrichProposal(proposal, userId);
  },

  deleteProposal: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(DeleteProposalInputSchema, input, 'input');
    const { proposalUuid } = validated;

    // Find proposal
    const [proposal] = await db
      .select()
      .from(dbSchema.climbProposals)
      .where(eq(dbSchema.climbProposals.uuid, proposalUuid))
      .limit(1);

    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'approved') throw new Error('Can only delete approved proposals');

    await requireAdminOrLeader(ctx, proposal.boardType);
    const userId = ctx.userId!;

    // Revert the proposal's effect
    await revertProposalEffect(proposal);

    // Hard-delete the proposal (votes cascade-delete via FK, lastProposalId set to null via FK)
    await db
      .delete(dbSchema.climbProposals)
      .where(eq(dbSchema.climbProposals.id, proposal.id));

    // Publish deleted event
    publishSocialEvent({
      type: 'proposal.deleted',
      actorId: userId,
      entityType: 'proposal',
      entityId: proposalUuid,
      timestamp: Date.now(),
      metadata: { climbUuid: proposal.climbUuid, boardType: proposal.boardType, proposalType: proposal.type },
    }).catch((err) => console.error('[Proposals] Failed to publish proposal.deleted:', err));

    return true;
  },

  setterOverrideCommunityStatus: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    await applyRateLimit(ctx, 10);

    const validated = validateInput(SetterOverrideInputSchema, input, 'input');
    const { climbUuid, boardType, angle, communityGrade, isBenchmark } = validated;
    const userId = ctx.userId!;

    // Verify caller is setter or admin/leader
    const [climb] = await db
      .select({
        uuid: dbSchema.boardClimbs.uuid,
        setterId: dbSchema.boardClimbs.setterId,
        userId: dbSchema.boardClimbs.userId,
        climbBoardType: dbSchema.boardClimbs.boardType,
      })
      .from(dbSchema.boardClimbs)
      .where(eq(dbSchema.boardClimbs.uuid, climbUuid))
      .limit(1);

    if (!climb) {
      throw new Error('Climb not found');
    }

    // Check if caller is the setter
    let isSetter = false;

    // For locally-created climbs, userId directly stores the Boardsesh user ID
    if (climb.userId && climb.userId === userId) {
      isSetter = true;
    }

    // For Aurora-synced climbs, match setterId via aurora credentials
    if (!isSetter && climb.setterId) {
      const [cred] = await db
        .select({ auroraUserId: dbSchema.auroraCredentials.auroraUserId })
        .from(dbSchema.auroraCredentials)
        .where(
          and(
            eq(dbSchema.auroraCredentials.userId, userId),
            eq(dbSchema.auroraCredentials.boardType, boardType),
          ),
        )
        .limit(1);

      if (cred?.auroraUserId === climb.setterId) {
        isSetter = true;
      }
    }

    // If not the setter, require admin or leader role (throws if unauthorized)
    if (!isSetter) {
      await requireAdminOrLeader(ctx, boardType);
    }

    // UPSERT climbCommunityStatus
    const [existing] = await db
      .select()
      .from(dbSchema.climbCommunityStatus)
      .where(
        and(
          eq(dbSchema.climbCommunityStatus.climbUuid, climbUuid),
          eq(dbSchema.climbCommunityStatus.boardType, boardType),
          eq(dbSchema.climbCommunityStatus.angle, angle),
        ),
      )
      .limit(1);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (communityGrade !== undefined) updates.communityGrade = communityGrade;
    if (isBenchmark !== undefined && isBenchmark !== null) updates.isBenchmark = isBenchmark;

    let result;
    if (existing) {
      [result] = await db
        .update(dbSchema.climbCommunityStatus)
        .set(updates)
        .where(eq(dbSchema.climbCommunityStatus.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(dbSchema.climbCommunityStatus)
        .values({
          climbUuid,
          boardType,
          angle,
          communityGrade: communityGrade || null,
          isBenchmark: isBenchmark || false,
        })
        .returning();
    }

    return {
      climbUuid: result.climbUuid,
      boardType: result.boardType,
      angle: result.angle,
      communityGrade: result.communityGrade || null,
      isBenchmark: result.isBenchmark,
      isClassic: false,
      isFrozen: false,
      freezeReason: null,
      openProposalCount: 0,
      outlierAnalysis: null,
      updatedAt: result.updatedAt.toISOString(),
    };
  },

  freezeClimb: async (
    _: unknown,
    { input }: { input: unknown },
    ctx: ConnectionContext,
  ) => {
    const validated = validateInput(FreezeClimbInputSchema, input, 'input');
    const { climbUuid, boardType, frozen, reason } = validated;

    await requireAdminOrLeader(ctx, boardType);
    const userId = ctx.userId!;

    // UPSERT community setting for freeze
    const freezeKey = 'climb_frozen';
    const [existing] = await db
      .select()
      .from(dbSchema.communitySettings)
      .where(
        and(
          eq(dbSchema.communitySettings.scope, 'climb'),
          eq(dbSchema.communitySettings.scopeKey, climbUuid),
          eq(dbSchema.communitySettings.key, freezeKey),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(dbSchema.communitySettings)
        .set({ value: String(frozen), setBy: userId, updatedAt: new Date() })
        .where(eq(dbSchema.communitySettings.id, existing.id));
    } else {
      await db
        .insert(dbSchema.communitySettings)
        .values({
          scope: 'climb',
          scopeKey: climbUuid,
          key: freezeKey,
          value: String(frozen),
          setBy: userId,
        });
    }

    // Also save freeze reason
    if (reason) {
      const reasonKey = 'climb_freeze_reason';
      const [existingReason] = await db
        .select()
        .from(dbSchema.communitySettings)
        .where(
          and(
            eq(dbSchema.communitySettings.scope, 'climb'),
            eq(dbSchema.communitySettings.scopeKey, climbUuid),
            eq(dbSchema.communitySettings.key, reasonKey),
          ),
        )
        .limit(1);

      if (existingReason) {
        await db
          .update(dbSchema.communitySettings)
          .set({ value: reason, setBy: userId, updatedAt: new Date() })
          .where(eq(dbSchema.communitySettings.id, existingReason.id));
      } else {
        await db
          .insert(dbSchema.communitySettings)
          .values({
            scope: 'climb',
            scopeKey: climbUuid,
            key: reasonKey,
            value: reason,
            setBy: userId,
          });
      }
    }

    return true;
  },
};
