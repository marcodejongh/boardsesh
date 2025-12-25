import { BoardName } from '../../types';
import { API_HOSTS, SaveClimbOptions } from './types';
import { generateUuid } from './util';
import { sql } from '@/app/lib/db/db';
import { getTableName } from '../../data-sync/aurora/getTableName';
import dayjs from 'dayjs';

interface AuroraSyncResult {
  success: boolean;
  climb?: {
    uuid: string;
    created_at?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  error?: string;
}

/**
 * Attempts to save a climb to the Aurora API
 * Returns the result without throwing - caller decides how to handle errors
 */
async function syncClimbToAurora(
  board: BoardName,
  token: string,
  uuid: string,
  options: SaveClimbOptions
): Promise<AuroraSyncResult> {
  try {
    const response = await fetch(`${API_HOSTS[board]}/v2/climbs/${uuid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        uuid,
        ...options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      climb: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Aurora sync',
    };
  }
}

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

  // Try to sync to Aurora API first
  const auroraResult = await syncClimbToAurora(board, token, uuid, options);

  if (!auroraResult.success) {
    console.warn(`Aurora sync failed for climb ${uuid}: ${auroraResult.error}`);
  }

  // Always save to local database, regardless of Aurora success
  const fullTableName = getTableName(board, 'climbs');
  const synced = auroraResult.success;
  const syncError = auroraResult.success ? null : auroraResult.error;
  const finalCreatedAt = auroraResult.climb?.created_at || createdAt;

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
      ${false}, ${finalCreatedAt}, ${synced}, ${syncError}
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
    synced: auroraResult.success,
  };
}
