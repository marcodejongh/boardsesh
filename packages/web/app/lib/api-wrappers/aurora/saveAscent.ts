import { BoardName } from '../../types';
import { WEB_HOSTS, SaveAscentOptions, SaveAscentResponse, Ascent } from './types';
import dayjs from 'dayjs';
import { sql } from '@/app/lib/db/db';
import { getTableName } from '../../data-sync/aurora/getTableName';

interface AuroraSyncResult {
  success: boolean;
  ascent?: Ascent;
  error?: string;
}

/**
 * Attempts to save an ascent to the Aurora API
 * Returns the result without throwing - caller decides how to handle errors
 */
async function syncAscentToAurora(
  board: BoardName,
  token: string,
  requestData: {
    user_id: number;
    uuid: string;
    climb_uuid: string;
    angle: number;
    difficulty: number;
    is_mirror: number;
    attempt_id: number;
    bid_count: number;
    quality: number;
    is_benchmark: number;
    comment: string;
    climbed_at: string;
  }
): Promise<AuroraSyncResult> {
  try {
    // Build URL-encoded form data - Aurora expects this format!
    const requestBody = new URLSearchParams();
    Object.entries(requestData).forEach(([key, value]) => {
      requestBody.append(key, String(value));
    });

    // Use the web host endpoint with POST method
    const url = `${WEB_HOSTS[board]}/ascents/save`;
    console.log(`Saving ascent to Aurora: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        Cookie: `token=${token}`,
      },
      body: requestBody.toString(),
    });

    console.log(`Save ascent response status: ${response.status}`);

    if (!response.ok) {
      const responseClone = response.clone();
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        try {
          errorData = await responseClone.text();
        } catch {
          errorData = 'Could not read error response';
        }
      }
      return {
        success: false,
        error: `HTTP ${response.status}: ${JSON.stringify(errorData)}`,
      };
    }

    // Handle potentially empty response body
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      return {
        success: false,
        error: 'Empty response from Aurora API',
      };
    }

    const responseData = JSON.parse(responseText) as { ascents?: Ascent[] };
    if (!responseData.ascents || responseData.ascents.length === 0) {
      return {
        success: false,
        error: 'No ascent data in Aurora response',
      };
    }

    return {
      success: true,
      ascent: responseData.ascents[0],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Aurora sync',
    };
  }
}

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

  // Try to sync to Aurora API first
  const auroraResult = await syncAscentToAurora(board, token, requestData);

  if (!auroraResult.success) {
    console.warn(`Aurora sync failed for ascent ${options.uuid}: ${auroraResult.error}`);
  }

  // Always save to local database, regardless of Aurora success
  const fullTableName = getTableName(board, 'ascents');
  const synced = auroraResult.success;
  const syncError = auroraResult.success ? null : auroraResult.error;
  const finalCreatedAt = auroraResult.ascent?.created_at || createdAt;

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
      ${requestData.climbed_at}, ${finalCreatedAt}, ${synced}, ${syncError}
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
  const localAscent: Ascent = auroraResult.ascent || {
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
