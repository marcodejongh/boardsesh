import { BoardName } from '../../types';
import { SaveClimbOptions } from './types';
import { generateUuid } from './util';
import { sql } from '@/app/lib/db/db';
import { getTableName } from '../../data-sync/aurora/getTableName';
import dayjs from 'dayjs';

/**
 * Saves a climb to the local database only.
 *
 * Note: This function no longer syncs to Aurora directly because Aurora API
 * requires an apptoken which is not available. Instead, climbs created locally
 * will be synced FROM Aurora via the user-sync cron job (runs every 6 hours).
 *
 * Data flow: Boardsesh (local) ← Aurora (via cron)
 */

export interface SaveClimbResponse {
  uuid: string;
  synced: boolean;
}

export async function saveClimb(
  board: BoardName,
  token: string,
  options: SaveClimbOptions
): Promise<SaveClimbResponse> {
  const uuid = generateUuid();
  const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

  // Save to local database only
  const fullTableName = getTableName(board, 'climbs');
  const finalCreatedAt = createdAt;

  await sql`
    INSERT INTO ${sql.unsafe(fullTableName)} (
      uuid, layout_id, setter_id, name, description, angle,
      frames_count, frames_pace, frames, is_draft, is_listed,
      created_at, synced, sync_error
    )
    VALUES (
      ${uuid}, ${options.layout_id}, ${options.setter_id}, ${options.name},
      ${options.description || ''}, ${options.angle}, ${options.frames_count || 1},
      ${options.frames_pace || 0}, ${options.frames}, ${options.is_draft},
      ${false}, ${finalCreatedAt}, ${false}, ${null}
    )
    ON CONFLICT (uuid) DO UPDATE SET
      layout_id = EXCLUDED.layout_id,
      setter_id = EXCLUDED.setter_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      angle = EXCLUDED.angle,
      frames_count = EXCLUDED.frames_count,
      frames_pace = EXCLUDED.frames_pace,
      frames = EXCLUDED.frames,
      is_draft = EXCLUDED.is_draft,
      synced = EXCLUDED.synced,
      sync_error = EXCLUDED.sync_error
  `;

  // Return response - always success from client perspective
  return {
    uuid,
    synced: false,
  };
}
