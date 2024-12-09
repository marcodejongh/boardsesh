import { BoardName } from '../../types';
import { API_HOSTS, AscentSavedEvent, SaveAscentOptions, SaveAscentResponse } from './types';
import dayjs from 'dayjs';
import { sql } from '@/lib/db';
import { getTableName } from './syncAllUserData';

export async function saveAscent(
  board: BoardName,
  token: string,
  options: SaveAscentOptions,
): Promise<SaveAscentResponse> {
  // Convert the ISO date to the required format "YYYY-MM-DD HH:mm:ss"
  const formattedDate = dayjs(options.climbed_at).format('YYYY-MM-DD HH:mm:ss');

  const requestBody = {
    uuid: options.uuid,
    angle: options.angle,
    attempt_id: options.attempt_id,
    bid_count: options.bid_count,
    climb_uuid: options.climb_uuid,
    climbed_at: formattedDate,
    comment: options.comment,
    difficulty: options.difficulty,
    is_benchmark: options.is_benchmark,
    is_mirror: options.is_mirror,
    quality: options.quality,
    user_id: options.user_id,
  };

  // Make the upstream API request
  const response = await fetch(`${API_HOSTS[board]}/v1/ascents/${options.uuid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error response:', {
      status: response.status,
      statusText: response.statusText,
      errors: errorData,
    });
    throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
  }

  const ascent: SaveAscentResponse = await response.json();
  const savedAscentEvent = ascent.events.find((event): event is AscentSavedEvent => event._type === 'ascent_saved');
  
  if (!savedAscentEvent) {
    throw new Error('Failed to save ascent');
  }
  
    // Insert into the intermediate database
  const fullTableName = getTableName(board, 'ascents'); // Replace with your actual table name
  
  const params = [
    requestBody.uuid,
    requestBody.climb_uuid,
    requestBody.angle,
    requestBody.is_mirror,
    requestBody.user_id,
    requestBody.attempt_id,
    requestBody.bid_count || 1,
    requestBody.quality,
    requestBody.difficulty,
    requestBody.is_benchmark || 0,
    requestBody.comment || '',
    requestBody.climbed_at,
    savedAscentEvent.ascent.created_at, // Assuming `created_at` is now
  ];

  await sql.query(
    `
    INSERT INTO ${fullTableName} (
      uuid, climb_uuid, angle, is_mirror, user_id, attempt_id, 
      bid_count, quality, difficulty, is_benchmark, comment, 
      climbed_at, created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
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
      climbed_at = EXCLUDED.climbed_at;
    `,
    params,
  );

  return ascent;
}
