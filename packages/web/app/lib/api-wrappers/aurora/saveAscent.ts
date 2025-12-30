import { BoardName } from '../../types';
import { SaveAscentOptions, SaveAscentResponse, Ascent } from './types';
import dayjs from 'dayjs';
import { sql } from '@/app/lib/db/db';
import { getTableName } from '../../data-sync/aurora/getTableName';

/**
 * Saves an ascent to the local database only.
 *
 * Note: This function no longer syncs to Aurora directly because Aurora API
 * requires an apptoken which is not available. Instead, ascents created locally
 * will be synced FROM Aurora via the user-sync cron job (runs every 6 hours).
 *
 * Data flow: Boardsesh (local) ← Aurora (via cron)
 */
export async function saveAscent(
  board: BoardName,
  token: string,
  options: SaveAscentOptions,
): Promise<SaveAscentResponse> {
  // Convert the ISO date to the required format "YYYY-MM-DD HH:mm:ss"
  const formattedDate = dayjs(options.climbed_at).format('YYYY-MM-DD HH:mm:ss');
  const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

  // Match Kilter Board v3.6.4 payload structure exactly
  const requestData = {
    user_id: options.user_id,
    uuid: options.uuid,
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    difficulty: options.difficulty,
    is_mirror: options.is_mirror ? 1 : 0,
    attempt_id: options.attempt_id || options.bid_count,
    bid_count: options.bid_count,
    quality: options.quality,
    is_benchmark: options.is_benchmark ? 1 : 0,
    comment: options.comment,
    climbed_at: formattedDate,
  };

  // Save to local database only
  const fullTableName = getTableName(board, 'ascents');
  const finalCreatedAt = createdAt;

  await sql`
    INSERT INTO ${sql.unsafe(fullTableName)} (
      uuid, climb_uuid, angle, is_mirror, user_id, attempt_id,
      bid_count, quality, difficulty, is_benchmark, comment,
      climbed_at, created_at, synced, sync_error
    )
    VALUES (
      ${requestData.uuid}, ${requestData.climb_uuid}, ${requestData.angle},
      ${requestData.is_mirror}, ${requestData.user_id}, ${requestData.attempt_id},
      ${requestData.bid_count}, ${requestData.quality}, ${requestData.difficulty},
      ${requestData.is_benchmark}, ${requestData.comment || ''},
      ${requestData.climbed_at}, ${finalCreatedAt}, ${false}, ${null}
    )
    ON CONFLICT (uuid) DO UPDATE SET
      climb_uuid = EXCLUDED.climb_uuid,
      angle = EXCLUDED.angle,
      is_mirror = EXCLUDED.is_mirror,
      attempt_id = EXCLUDED.attempt_id,
      bid_count = EXCLUDED.bid_count,
      quality = EXCLUDED.quality,
      difficulty = EXCLUDED.difficulty,
      is_benchmark = EXCLUDED.is_benchmark,
      comment = EXCLUDED.comment,
      climbed_at = EXCLUDED.climbed_at,
      synced = EXCLUDED.synced,
      sync_error = EXCLUDED.sync_error
  `;

  // Create a local ascent object for the response
  const localAscent: Ascent = {
    uuid: options.uuid,
    user_id: options.user_id,
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    is_mirror: options.is_mirror,
    attempt_id: requestData.attempt_id,
    bid_count: options.bid_count,
    quality: options.quality,
    difficulty: options.difficulty,
    is_benchmark: options.is_benchmark,
    is_listed: true,
    wall_uuid: null,
    comment: options.comment,
    climbed_at: formattedDate,
    created_at: finalCreatedAt,
    updated_at: finalCreatedAt,
  };

  // Return response in the expected format - always success from client perspective
  return {
    events: [
      {
        _type: 'ascent_saved' as const,
        ascent: localAscent,
      },
    ],
  };
}
