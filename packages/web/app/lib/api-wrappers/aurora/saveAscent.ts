import { BoardName } from '../../types';
import { SaveAscentOptions, SaveAscentResponse, Ascent } from './types';
import dayjs from 'dayjs';
import { dbz } from '@/app/lib/db/db';
import { boardseshTicks } from '@/app/lib/db/schema';
import { randomUUID } from 'crypto';

/**
 * Saves an ascent to boardsesh_ticks.
 *
 * Note: This function writes directly to boardsesh_ticks using NextAuth userId.
 * The ascent will be synced TO Aurora via the user-sync cron job.
 *
 * @param board - Board type (kilter, tension)
 * @param token - Aurora auth token (kept for API compatibility)
 * @param options - Ascent options
 * @param nextAuthUserId - NextAuth user ID (required)
 */
export async function saveAscent(
  board: BoardName,
  token: string,
  options: SaveAscentOptions,
  nextAuthUserId: string,
): Promise<SaveAscentResponse> {
  // Convert the ISO date to the required format
  const formattedDate = dayjs(options.climbed_at).format('YYYY-MM-DD HH:mm:ss');
  const now = new Date().toISOString();

  // Determine status based on attempt_id (1 = flash, otherwise send)
  const status = options.attempt_id === 1 ? 'flash' : 'send';

  // Generate a new UUID for the tick (different from the ascent uuid which is Aurora's)
  const tickUuid = randomUUID();

  await dbz
    .insert(boardseshTicks)
    .values({
      uuid: tickUuid,
      userId: nextAuthUserId,
      boardType: board,
      climbUuid: options.climb_uuid,
      angle: options.angle,
      isMirror: options.is_mirror,
      status: status,
      attemptCount: options.bid_count,
      quality: options.quality,
      difficulty: options.difficulty,
      isBenchmark: options.is_benchmark,
      comment: options.comment || '',
      climbedAt: formattedDate,
      createdAt: now,
      updatedAt: now,
      auroraType: 'ascents',
      auroraId: options.uuid, // Store Aurora's UUID for sync reference
    })
    .onConflictDoUpdate({
      target: boardseshTicks.auroraId,
      set: {
        climbUuid: options.climb_uuid,
        angle: options.angle,
        isMirror: options.is_mirror,
        status: status,
        attemptCount: options.bid_count,
        quality: options.quality,
        difficulty: options.difficulty,
        isBenchmark: options.is_benchmark,
        comment: options.comment || '',
        climbedAt: formattedDate,
        updatedAt: now,
      },
    });

  // Create a local ascent object for the response (for API compatibility)
  const localAscent: Ascent = {
    uuid: options.uuid,
    user_id: options.user_id, // Keep for API response compatibility
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    is_mirror: options.is_mirror,
    attempt_id: options.attempt_id || options.bid_count,
    bid_count: options.bid_count,
    quality: options.quality,
    difficulty: options.difficulty,
    is_benchmark: options.is_benchmark,
    is_listed: true,
    wall_uuid: null,
    comment: options.comment,
    climbed_at: formattedDate,
    created_at: now,
    updated_at: now,
  };

  // Return response in the expected format
  return {
    events: [
      {
        _type: 'ascent_saved' as const,
        ascent: localAscent,
      },
    ],
  };
}
