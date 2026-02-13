import { eq, and, sql, isNull, count, ilike } from 'drizzle-orm';
import type { ConnectionContext, SetterStatsInput, HoldHeatmapInput, BoardName } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import {
  BoardNameSchema,
  ExternalUUIDSchema,
  GetHoldClassificationsInputSchema,
  SetterStatsInputSchema,
  HoldHeatmapInputSchema,
} from '../../../validation/schemas';
import { UNIFIED_TABLES } from '../../../db/queries/util/table-select';
import { getSizeEdges } from '../../../db/queries/util/product-sizes-data';
import { createClimbFilters } from '../../../db/queries/climbs/create-climb-filters';

export const dataQueryQueries = {
  /**
   * Get beta video links for a climb.
   * No authentication required.
   */
  betaLinks: async (
    _: unknown,
    { boardName, climbUuid }: { boardName: string; climbUuid: string },
    _ctx: ConnectionContext,
  ) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    validateInput(ExternalUUIDSchema, climbUuid, 'climbUuid');

    const results = await db
      .select()
      .from(dbSchema.boardBetaLinks)
      .where(
        and(
          eq(dbSchema.boardBetaLinks.boardType, boardName),
          eq(dbSchema.boardBetaLinks.climbUuid, climbUuid),
        ),
      );

    return results.map((link) => ({
      climbUuid: link.climbUuid,
      link: link.link,
      foreignUsername: link.foreignUsername,
      angle: link.angle,
      thumbnail: link.thumbnail,
      isListed: link.isListed,
      createdAt: link.createdAt,
    }));
  },

  /**
   * Get climb statistics across all angles.
   * No authentication required.
   */
  climbStatsForAllAngles: async (
    _: unknown,
    { boardName, climbUuid }: { boardName: string; climbUuid: string },
    _ctx: ConnectionContext,
  ) => {
    validateInput(BoardNameSchema, boardName, 'boardName');
    validateInput(ExternalUUIDSchema, climbUuid, 'climbUuid');

    const result = await db.execute(sql`
      SELECT
        climb_stats.angle,
        COALESCE(climb_stats.ascensionist_count, 0) as ascensionist_count,
        ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
        climb_stats.difficulty_average,
        climb_stats.display_difficulty,
        climb_stats.fa_username,
        climb_stats.fa_at,
        dg.boulder_name as difficulty
      FROM board_climb_stats climb_stats
      LEFT JOIN board_difficulty_grades dg
        ON dg.difficulty = ROUND(climb_stats.display_difficulty::numeric)
        AND dg.board_type = ${boardName}
      WHERE climb_stats.board_type = ${boardName}
      AND climb_stats.climb_uuid = ${climbUuid}
      ORDER BY climb_stats.angle ASC
    `);

    const rows = Array.isArray(result) ? result : (result as { rows: Record<string, unknown>[] }).rows ?? result;

    return (rows as Record<string, unknown>[]).map((row) => ({
      angle: Number(row.angle),
      ascensionistCount: Number(row.ascensionist_count || 0),
      qualityAverage: row.quality_average as string | null,
      difficultyAverage: row.difficulty_average != null ? Number(row.difficulty_average) : null,
      displayDifficulty: row.display_difficulty != null ? Number(row.display_difficulty) : null,
      faUsername: row.fa_username as string | null,
      faAt: row.fa_at as string | null,
      difficulty: row.difficulty as string | null,
    }));
  },

  /**
   * Get hold classifications for the current user and board configuration.
   * Requires authentication.
   */
  holdClassifications: async (
    _: unknown,
    { input }: { input: { boardType: string; layoutId: number; sizeId: number } },
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const validatedInput = validateInput(GetHoldClassificationsInputSchema, input, 'input');
    const userId = ctx.userId!;

    const classifications = await db
      .select()
      .from(dbSchema.userHoldClassifications)
      .where(
        and(
          eq(dbSchema.userHoldClassifications.userId, userId),
          eq(dbSchema.userHoldClassifications.boardType, validatedInput.boardType),
          eq(dbSchema.userHoldClassifications.layoutId, validatedInput.layoutId),
          eq(dbSchema.userHoldClassifications.sizeId, validatedInput.sizeId),
        ),
      );

    return classifications.map((c) => ({
      id: c.id.toString(),
      userId: c.userId,
      boardType: c.boardType,
      layoutId: c.layoutId,
      sizeId: c.sizeId,
      holdId: c.holdId,
      holdType: c.holdType,
      handRating: c.handRating,
      footRating: c.footRating,
      pullDirection: c.pullDirection,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  /**
   * Get user board mappings for the current user.
   * Requires authentication.
   */
  userBoardMappings: async (
    _: unknown,
    _args: Record<string, never>,
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    const mappings = await db
      .select()
      .from(dbSchema.userBoardMappings)
      .where(eq(dbSchema.userBoardMappings.userId, userId));

    return mappings.map((m) => ({
      id: m.id.toString(),
      userId: m.userId,
      boardType: m.boardType,
      boardUserId: m.boardUserId,
      boardUsername: m.boardUsername,
      createdAt: m.linkedAt?.toISOString() ?? null,
    }));
  },

  /**
   * Get count of unsynced items for the current user's Aurora accounts.
   * Requires authentication.
   */
  unsyncedCounts: async (
    _: unknown,
    _args: Record<string, never>,
    ctx: ConnectionContext,
  ) => {
    requireAuthenticated(ctx);
    const userId = ctx.userId!;

    // Get user's Aurora account user IDs from credentials
    const credentials = await db
      .select({
        boardType: dbSchema.auroraCredentials.boardType,
        auroraUserId: dbSchema.auroraCredentials.auroraUserId,
      })
      .from(dbSchema.auroraCredentials)
      .where(eq(dbSchema.auroraCredentials.userId, userId));

    const counts = {
      kilter: { ascents: 0, climbs: 0 },
      tension: { ascents: 0, climbs: 0 },
    };

    for (const cred of credentials) {
      if (!cred.auroraUserId) continue;

      const boardType = cred.boardType as 'kilter' | 'tension';

      // Count unsynced ticks (ascents/bids) - those without an auroraId
      const [ascentResult] = await db
        .select({ count: count() })
        .from(dbSchema.boardseshTicks)
        .where(
          and(
            eq(dbSchema.boardseshTicks.userId, userId),
            eq(dbSchema.boardseshTicks.boardType, boardType),
            isNull(dbSchema.boardseshTicks.auroraId),
          ),
        );

      // Count unsynced climbs for this user
      const [climbResult] = await db
        .select({ count: count() })
        .from(dbSchema.boardClimbs)
        .where(
          and(
            eq(dbSchema.boardClimbs.boardType, boardType),
            eq(dbSchema.boardClimbs.setterId, cred.auroraUserId),
            eq(dbSchema.boardClimbs.synced, false),
          ),
        );

      if (boardType === 'kilter') {
        counts.kilter.ascents = ascentResult?.count ?? 0;
        counts.kilter.climbs = climbResult?.count ?? 0;
      } else if (boardType === 'tension') {
        counts.tension.ascents = ascentResult?.count ?? 0;
        counts.tension.climbs = climbResult?.count ?? 0;
      }
    }

    return counts;
  },

  /**
   * Get setter statistics for a board configuration.
   * No authentication required.
   */
  setterStats: async (
    _: unknown,
    { input }: { input: SetterStatsInput },
    _ctx: ConnectionContext,
  ) => {
    const validatedInput = validateInput(SetterStatsInputSchema, input, 'input');
    const { climbs, climbStats } = UNIFIED_TABLES;

    // MoonBoard doesn't have setter stats
    if (validatedInput.boardName === 'moonboard') {
      return [];
    }

    const sizeEdges = getSizeEdges(validatedInput.boardName as BoardName, validatedInput.sizeId);
    if (!sizeEdges) {
      return [];
    }

    const whereConditions = [
      eq(climbs.boardType, validatedInput.boardName),
      eq(climbs.layoutId, validatedInput.layoutId),
      eq(climbStats.angle, validatedInput.angle),
      sql`${climbs.edgeLeft} > ${sizeEdges.edgeLeft}`,
      sql`${climbs.edgeRight} < ${sizeEdges.edgeRight}`,
      sql`${climbs.edgeBottom} > ${sizeEdges.edgeBottom}`,
      sql`${climbs.edgeTop} < ${sizeEdges.edgeTop}`,
      sql`${climbs.setterUsername} IS NOT NULL`,
      sql`${climbs.setterUsername} != ''`,
    ];

    if (validatedInput.search && validatedInput.search.trim().length > 0) {
      whereConditions.push(ilike(climbs.setterUsername, `%${validatedInput.search}%`));
    }

    const result = await db
      .select({
        setter_username: climbs.setterUsername,
        climb_count: sql<number>`count(*)::int`,
      })
      .from(climbs)
      .innerJoin(climbStats, and(
        eq(climbStats.climbUuid, climbs.uuid),
        eq(climbStats.boardType, validatedInput.boardName),
      ))
      .where(and(...whereConditions))
      .groupBy(climbs.setterUsername)
      .orderBy(sql`count(*) DESC`)
      .limit(50);

    return result
      .filter((stat) => stat.setter_username !== null)
      .map((stat) => ({
        setterUsername: stat.setter_username,
        climbCount: stat.climb_count,
      }));
  },

  /**
   * Get hold heatmap data for a board configuration.
   * Optional authentication for user-specific data.
   */
  holdHeatmap: async (
    _: unknown,
    { input }: { input: HoldHeatmapInput },
    ctx: ConnectionContext,
  ) => {
    const validatedInput = validateInput(HoldHeatmapInputSchema, input, 'input');
    const { climbs, climbStats, climbHolds } = UNIFIED_TABLES;

    // MoonBoard doesn't have heatmap data
    if (validatedInput.boardName === 'moonboard') {
      return [];
    }

    const sizeEdges = getSizeEdges(validatedInput.boardName as BoardName, validatedInput.sizeId);
    if (!sizeEdges) {
      return [];
    }

    const setIds = validatedInput.setIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    const userId = ctx.userId ?? undefined;

    const params = {
      board_name: validatedInput.boardName as BoardName,
      layout_id: validatedInput.layoutId,
      size_id: validatedInput.sizeId,
      set_ids: setIds,
      angle: validatedInput.angle,
    };

    const searchParams = {
      gradeAccuracy: validatedInput.gradeAccuracy ? parseFloat(validatedInput.gradeAccuracy) : undefined,
      minGrade: validatedInput.minGrade ?? undefined,
      maxGrade: validatedInput.maxGrade ?? undefined,
      minAscents: validatedInput.minAscents ?? undefined,
      minRating: validatedInput.minRating ?? undefined,
      sortBy: validatedInput.sortBy ?? undefined,
      sortOrder: validatedInput.sortOrder ?? undefined,
      name: validatedInput.name ?? undefined,
      settername: validatedInput.settername ?? undefined,
      onlyClassics: validatedInput.onlyClassics ?? undefined,
      onlyTallClimbs: validatedInput.onlyTallClimbs ?? undefined,
      holdsFilter: validatedInput.holdsFilter as Record<string, 'ANY' | 'NOT'> | undefined,
      hideAttempted: validatedInput.hideAttempted ?? undefined,
      hideCompleted: validatedInput.hideCompleted ?? undefined,
      showOnlyAttempted: validatedInput.showOnlyAttempted ?? undefined,
      showOnlyCompleted: validatedInput.showOnlyCompleted ?? undefined,
    };

    const filters = createClimbFilters(UNIFIED_TABLES, params, searchParams, sizeEdges, userId);

    const personalProgressFiltersEnabled =
      searchParams.hideAttempted ||
      searchParams.hideCompleted ||
      searchParams.showOnlyAttempted ||
      searchParams.showOnlyCompleted;

    let holdStats: Record<string, unknown>[];

    // Both paths share the same query structure, just differ in totalAscents calculation
    const baseSelect = {
      holdId: climbHolds.holdId,
      totalUses: sql<number>`COUNT(DISTINCT ${climbHolds.climbUuid})`,
      startingUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'STARTING' THEN 1 ELSE 0 END)`,
      handUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'HAND' THEN 1 ELSE 0 END)`,
      footUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FOOT' THEN 1 ELSE 0 END)`,
      finishUses: sql<number>`SUM(CASE WHEN ${climbHolds.holdState} = 'FINISH' THEN 1 ELSE 0 END)`,
      averageDifficulty: sql<number>`AVG(${climbStats.displayDifficulty})`,
    };

    if (personalProgressFiltersEnabled && userId) {
      holdStats = await db
        .select({
          ...baseSelect,
          totalAscents: sql<number>`COUNT(DISTINCT ${climbHolds.climbUuid})`,
        })
        .from(climbHolds)
        .innerJoin(climbs, and(...filters.getClimbHoldsJoinConditions()))
        .leftJoin(climbStats, and(...filters.getHoldHeatmapClimbStatsConditions()))
        .where(
          and(...filters.getClimbWhereConditions(), ...filters.getSizeConditions(), ...filters.getClimbStatsConditions()),
        )
        .groupBy(climbHolds.holdId);
    } else {
      holdStats = await db
        .select({
          ...baseSelect,
          totalAscents: sql<number>`SUM(${climbStats.ascensionistCount})`,
        })
        .from(climbHolds)
        .innerJoin(climbs, and(...filters.getClimbHoldsJoinConditions()))
        .leftJoin(climbStats, and(...filters.getHoldHeatmapClimbStatsConditions()))
        .where(
          and(...filters.getClimbWhereConditions(), ...filters.getSizeConditions(), ...filters.getClimbStatsConditions()),
        )
        .groupBy(climbHolds.holdId);
    }

    // Add user-specific data
    if (userId && !personalProgressFiltersEnabled) {
      const [userAscentsQuery, userAttemptsQuery] = await Promise.all([
        db.execute(sql`
          SELECT ch.hold_id, COUNT(*) as user_ascents
          FROM ${dbSchema.boardseshTicks} t
          JOIN board_climb_holds ch ON t.climb_uuid = ch.climb_uuid AND ch.board_type = ${validatedInput.boardName}
          WHERE t.user_id = ${userId}
            AND t.board_type = ${validatedInput.boardName}
            AND t.angle = ${validatedInput.angle}
            AND t.status IN ('flash', 'send')
          GROUP BY ch.hold_id
        `),
        db.execute(sql`
          SELECT ch.hold_id, SUM(t.attempt_count) as user_attempts
          FROM ${dbSchema.boardseshTicks} t
          JOIN board_climb_holds ch ON t.climb_uuid = ch.climb_uuid AND ch.board_type = ${validatedInput.boardName}
          WHERE t.user_id = ${userId}
            AND t.board_type = ${validatedInput.boardName}
            AND t.angle = ${validatedInput.angle}
          GROUP BY ch.hold_id
        `),
      ]);

      const ascentsRows = Array.isArray(userAscentsQuery) ? userAscentsQuery : (userAscentsQuery as { rows: Record<string, unknown>[] }).rows ?? userAscentsQuery;
      const attemptsRows = Array.isArray(userAttemptsQuery) ? userAttemptsQuery : (userAttemptsQuery as { rows: Record<string, unknown>[] }).rows ?? userAttemptsQuery;

      const ascentsMap = new Map<number, number>();
      const attemptsMap = new Map<number, number>();

      for (const row of ascentsRows as Record<string, unknown>[]) {
        ascentsMap.set(Number(row.hold_id), Number(row.user_ascents));
      }
      for (const row of attemptsRows as Record<string, unknown>[]) {
        attemptsMap.set(Number(row.hold_id), Number(row.user_attempts));
      }

      holdStats = holdStats.map((stat) => ({
        ...stat,
        userAscents: ascentsMap.get(Number(stat.holdId)) || 0,
        userAttempts: attemptsMap.get(Number(stat.holdId)) || 0,
      }));
    } else if (personalProgressFiltersEnabled && userId) {
      holdStats = holdStats.map((stat) => ({
        ...stat,
        userAscents: Number(stat.totalAscents) || 0,
        userAttempts: Number(stat.totalUses) || 0,
      }));
    }

    return holdStats.map((stats) => ({
      holdId: Number(stats.holdId),
      totalUses: Number(stats.totalUses || 0),
      startingUses: Number(stats.startingUses || 0),
      totalAscents: Number(stats.totalAscents || 0),
      handUses: Number(stats.handUses || 0),
      footUses: Number(stats.footUses || 0),
      finishUses: Number(stats.finishUses || 0),
      averageDifficulty: stats.averageDifficulty ? Number(stats.averageDifficulty) : null,
      userAscents: userId ? Number(stats.userAscents || 0) : null,
      userAttempts: userId ? Number(stats.userAttempts || 0) : null,
    }));
  },
};
