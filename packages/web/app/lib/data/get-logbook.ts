import { dbz } from '@/app/lib/db/db';
import { ClimbUuid } from '../types';
import { LogbookEntry, AuroraBoardName } from '../api-wrappers/aurora/types';
import { boardseshTicks } from '@/app/lib/db/schema';
import { eq, and, inArray, isNotNull, desc } from 'drizzle-orm';

/**
 * Get logbook entries for a user from boardsesh_ticks.
 * @param board - The board type (kilter, tension)
 * @param userId - NextAuth user ID (not Aurora user_id)
 * @param climbUuids - Optional array of climb UUIDs to filter by
 */
export async function getLogbook(
  board: AuroraBoardName,
  userId: string,
  climbUuids?: ClimbUuid[],
): Promise<LogbookEntry[]> {
  const baseConditions = [eq(boardseshTicks.boardType, board), eq(boardseshTicks.userId, userId)];

  if (climbUuids && climbUuids.length > 0) {
    baseConditions.push(inArray(boardseshTicks.climbUuid, climbUuids));
  } else {
    // When no specific climbs requested, only return entries with difficulty
    baseConditions.push(isNotNull(boardseshTicks.difficulty));
  }

  const results = await dbz
    .select()
    .from(boardseshTicks)
    .where(and(...baseConditions))
    .orderBy(desc(boardseshTicks.climbedAt));

  // Transform boardsesh_ticks to LogbookEntry format
  return results.map((tick) => ({
    uuid: tick.uuid,
    wall_uuid: null,
    climb_uuid: tick.climbUuid,
    angle: tick.angle,
    is_mirror: tick.isMirror ?? false,
    user_id: 0, // Placeholder - we use NextAuth userId now, not Aurora user_id
    attempt_id: tick.status === 'flash' ? 1 : tick.status === 'send' ? 2 : 0,
    tries: tick.attemptCount,
    quality: tick.quality ?? 0,
    difficulty: tick.difficulty ?? 0,
    is_benchmark: tick.isBenchmark ?? false,
    is_listed: true,
    comment: tick.comment ?? '',
    climbed_at: tick.climbedAt,
    created_at: tick.createdAt,
    updated_at: tick.updatedAt,
    is_ascent: tick.status === 'flash' || tick.status === 'send',
  }));
}
