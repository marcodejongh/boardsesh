import { eq, and, desc, inArray, sql, count } from 'drizzle-orm';
import type { ConnectionContext } from '@boardsesh/shared-schema';
import { db } from '../../../db/client';
import * as dbSchema from '@boardsesh/db/schema';
import { requireAuthenticated, validateInput } from '../shared/helpers';
import { GetTicksInputSchema, BoardNameSchema, AscentFeedInputSchema } from '../../../validation/schemas';

export const tickQueries = {
  /**
   * Get ticks for the authenticated user with optional filtering by climb UUIDs
   */
  ticks: async (
    _: unknown,
    { input }: { input: { boardType: string; climbUuids?: string[] } },
    ctx: ConnectionContext
  ): Promise<unknown[]> => {
    requireAuthenticated(ctx);
    validateInput(GetTicksInputSchema, input, 'input');

    const userId = ctx.userId!;

    // Build query conditions
    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, input.boardType),
    ];

    if (input.climbUuids && input.climbUuids.length > 0) {
      conditions.push(inArray(dbSchema.boardseshTicks.climbUuid, input.climbUuids));
    }

    // Fetch ticks with layoutId from unified board_climbs table
    const results = await db
      .select({
        tick: dbSchema.boardseshTicks,
        layoutId: dbSchema.boardClimbs.layoutId,
      })
      .from(dbSchema.boardseshTicks)
      .leftJoin(
        dbSchema.boardClimbs,
        and(
          eq(dbSchema.boardseshTicks.climbUuid, dbSchema.boardClimbs.uuid),
          eq(dbSchema.boardClimbs.boardType, input.boardType)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

    return results.map(({ tick, layoutId }) => ({
      uuid: tick.uuid,
      userId: tick.userId,
      boardType: tick.boardType,
      climbUuid: tick.climbUuid,
      angle: tick.angle,
      isMirror: tick.isMirror,
      status: tick.status,
      attemptCount: tick.attemptCount,
      quality: tick.quality,
      difficulty: tick.difficulty,
      isBenchmark: tick.isBenchmark,
      comment: tick.comment,
      climbedAt: tick.climbedAt,
      createdAt: tick.createdAt,
      updatedAt: tick.updatedAt,
      sessionId: tick.sessionId,
      auroraType: tick.auroraType,
      auroraId: tick.auroraId,
      auroraSyncedAt: tick.auroraSyncedAt,
      layoutId,
    }));
  },

  /**
   * Get ticks for a specific user (public query, no authentication required)
   */
  userTicks: async (
    _: unknown,
    { userId, boardType }: { userId: string; boardType: string }
  ): Promise<unknown[]> => {
    validateInput(BoardNameSchema, boardType, 'boardType');

    const conditions = [
      eq(dbSchema.boardseshTicks.userId, userId),
      eq(dbSchema.boardseshTicks.boardType, boardType),
    ];

    // Fetch ticks with layoutId from unified board_climbs table
    const results = await db
      .select({
        tick: dbSchema.boardseshTicks,
        layoutId: dbSchema.boardClimbs.layoutId,
      })
      .from(dbSchema.boardseshTicks)
      .leftJoin(
        dbSchema.boardClimbs,
        and(
          eq(dbSchema.boardseshTicks.climbUuid, dbSchema.boardClimbs.uuid),
          eq(dbSchema.boardClimbs.boardType, boardType)
        )
      )
      .where(and(...conditions))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt));

    return results.map(({ tick, layoutId }) => ({
      uuid: tick.uuid,
      userId: tick.userId,
      boardType: tick.boardType,
      climbUuid: tick.climbUuid,
      angle: tick.angle,
      isMirror: tick.isMirror,
      status: tick.status,
      attemptCount: tick.attemptCount,
      quality: tick.quality,
      difficulty: tick.difficulty,
      isBenchmark: tick.isBenchmark,
      comment: tick.comment,
      climbedAt: tick.climbedAt,
      createdAt: tick.createdAt,
      updatedAt: tick.updatedAt,
      sessionId: tick.sessionId,
      auroraType: tick.auroraType,
      auroraId: tick.auroraId,
      auroraSyncedAt: tick.auroraSyncedAt,
      layoutId,
    }));
  },

  /**
   * Get ascent activity feed for a specific user (public query)
   * Returns ticks with enriched climb data for display in a feed
   */
  userAscentsFeed: async (
    _: unknown,
    { userId, input }: { userId: string; input?: { limit?: number; offset?: number } }
  ): Promise<{
    items: unknown[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    // Validate and set defaults
    const validatedInput = validateInput(AscentFeedInputSchema, input || {}, 'input');
    const limit = validatedInput.limit ?? 20;
    const offset = validatedInput.offset ?? 0;

    // Get total count of ticks for this user
    const countResult = await db
      .select({ count: count() })
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.userId, userId));

    const totalCount = Number(countResult[0]?.count || 0);

    // Fetch ticks ordered by climbedAt, paginated
    const ticks = await db
      .select()
      .from(dbSchema.boardseshTicks)
      .where(eq(dbSchema.boardseshTicks.userId, userId))
      .orderBy(desc(dbSchema.boardseshTicks.climbedAt))
      .limit(limit)
      .offset(offset);

    // Enrich ticks with climb data from unified tables
    const items = await Promise.all(
      ticks.map(async (tick) => {
        // Get climb details from unified board_climbs table
        let climbName = 'Unknown Climb';
        let setterUsername: string | null = null;
        let layoutId: number | null = null;
        let frames: string | null = null;

        const climb = await db
          .select({
            name: dbSchema.boardClimbs.name,
            setterUsername: dbSchema.boardClimbs.setterUsername,
            layoutId: dbSchema.boardClimbs.layoutId,
            frames: dbSchema.boardClimbs.frames,
          })
          .from(dbSchema.boardClimbs)
          .where(
            and(
              eq(dbSchema.boardClimbs.uuid, tick.climbUuid),
              eq(dbSchema.boardClimbs.boardType, tick.boardType)
            )
          )
          .limit(1);

        if (climb[0]) {
          climbName = climb[0].name || 'Unnamed Climb';
          setterUsername = climb[0].setterUsername;
          layoutId = climb[0].layoutId;
          frames = climb[0].frames;
        }

        // Get difficulty name if available from unified board_difficulty_grades table
        let difficultyName: string | null = null;
        if (tick.difficulty !== null) {
          const grade = await db
            .select({ boulderName: dbSchema.boardDifficultyGrades.boulderName })
            .from(dbSchema.boardDifficultyGrades)
            .where(
              and(
                eq(dbSchema.boardDifficultyGrades.difficulty, tick.difficulty),
                eq(dbSchema.boardDifficultyGrades.boardType, tick.boardType)
              )
            )
            .limit(1);
          difficultyName = grade[0]?.boulderName || null;
        }

        return {
          uuid: tick.uuid,
          climbUuid: tick.climbUuid,
          climbName,
          setterUsername,
          boardType: tick.boardType,
          layoutId,
          angle: tick.angle,
          isMirror: tick.isMirror,
          status: tick.status,
          attemptCount: tick.attemptCount,
          quality: tick.quality,
          difficulty: tick.difficulty,
          difficultyName,
          isBenchmark: tick.isBenchmark,
          comment: tick.comment || '',
          climbedAt: tick.climbedAt,
          frames,
        };
      })
    );

    return {
      items,
      totalCount,
      hasMore: offset + items.length < totalCount,
    };
  },

  /**
   * Get profile statistics with distinct climb counts per grade
   * Groups by board type and layout, counting unique climbs per difficulty grade
   */
  userProfileStats: async (
    _: unknown,
    { userId }: { userId: string }
  ): Promise<{
    totalDistinctClimbs: number;
    layoutStats: Array<{
      layoutKey: string;
      boardType: string;
      layoutId: number | null;
      distinctClimbCount: number;
      gradeCounts: Array<{ grade: string; count: number }>;
    }>;
  }> => {
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { totalDistinctClimbs: 0, layoutStats: [] };
    }

    const boardTypes = ['kilter', 'tension'] as const;
    const layoutStatsMap: Record<string, {
      boardType: string;
      layoutId: number | null;
      gradeCounts: Array<{ grade: string; count: number }>;
    }> = {};
    const allClimbUuids = new Set<string>();

    // Helper function to fetch stats for a single board type
    const fetchBoardStats = async (boardType: 'kilter' | 'tension') => {
      // Run both queries in parallel for this board type
      const [gradeResults, distinctClimbs] = await Promise.all([
        // Get distinct climb counts grouped by layoutId and difficulty using SQL aggregation
        db
          .select({
            layoutId: dbSchema.boardClimbs.layoutId,
            difficulty: dbSchema.boardseshTicks.difficulty,
            distinctCount: sql<number>`count(distinct ${dbSchema.boardseshTicks.climbUuid})`.as('distinct_count'),
          })
          .from(dbSchema.boardseshTicks)
          .leftJoin(
            dbSchema.boardClimbs,
            and(
              eq(dbSchema.boardseshTicks.climbUuid, dbSchema.boardClimbs.uuid),
              eq(dbSchema.boardClimbs.boardType, boardType)
            )
          )
          .where(
            and(
              eq(dbSchema.boardseshTicks.userId, userId),
              eq(dbSchema.boardseshTicks.boardType, boardType),
              sql`${dbSchema.boardseshTicks.status} != 'attempt'`
            )
          )
          .groupBy(dbSchema.boardClimbs.layoutId, dbSchema.boardseshTicks.difficulty),

        // Get all distinct climbUuids for total count
        db
          .selectDistinct({ climbUuid: dbSchema.boardseshTicks.climbUuid })
          .from(dbSchema.boardseshTicks)
          .where(
            and(
              eq(dbSchema.boardseshTicks.userId, userId),
              eq(dbSchema.boardseshTicks.boardType, boardType),
              sql`${dbSchema.boardseshTicks.status} != 'attempt'`
            )
          ),
      ]);

      return { gradeResults, distinctClimbs, boardType };
    };

    // Fetch stats for all board types in parallel
    const boardResults = await Promise.all(boardTypes.map(fetchBoardStats));

    // Process results from all boards
    for (const { gradeResults, distinctClimbs, boardType } of boardResults) {
      // Add to total distinct climbs set
      for (const row of distinctClimbs) {
        allClimbUuids.add(row.climbUuid);
      }

      // Process grade results into layout stats
      for (const row of gradeResults) {
        const layoutKey = `${boardType}-${row.layoutId ?? 'unknown'}`;

        if (!layoutStatsMap[layoutKey]) {
          layoutStatsMap[layoutKey] = {
            boardType,
            layoutId: row.layoutId,
            gradeCounts: [],
          };
        }

        if (row.difficulty !== null) {
          layoutStatsMap[layoutKey].gradeCounts.push({
            grade: String(row.difficulty),
            count: Number(row.distinctCount),
          });
        }
      }
    }

    // Convert to response format with sorted grade counts
    const layoutStats = Object.entries(layoutStatsMap).map(([layoutKey, stats]) => {
      // Calculate total distinct climbs for this layout by summing grade counts
      const distinctClimbCount = stats.gradeCounts.reduce((sum, gc) => sum + gc.count, 0);

      return {
        layoutKey,
        boardType: stats.boardType,
        layoutId: stats.layoutId,
        distinctClimbCount,
        gradeCounts: stats.gradeCounts.sort((a, b) => parseInt(a.grade) - parseInt(b.grade)),
      };
    });

    return {
      totalDistinctClimbs: allClimbUuids.size,
      layoutStats,
    };
  },
};
