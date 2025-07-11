import { BoardName } from '../../types';
import { API_HOSTS, WEB_HOSTS, AscentSavedEvent, SaveAscentOptions, SaveAscentResponse } from './types';
import dayjs from 'dayjs';
import { sql } from '@/app/lib/db/db';
import { getTableName } from '../../data-sync/aurora/getTableName';

export async function saveAscent(
  board: BoardName,
  token: string,
  options: SaveAscentOptions,
): Promise<SaveAscentResponse> {
  // Convert the ISO date to the required format "YYYY-MM-DD HH:mm:ss"
  const formattedDate = dayjs(options.climbed_at).format('YYYY-MM-DD HH:mm:ss');

  // Match Kilter Board v3.6.4 payload structure exactly
  const requestBody = {
    user_id: options.user_id,
    uuid: options.uuid,
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    difficulty: options.difficulty,
    is_mirror: options.is_mirror,
    attempt_id: options.attempt_id || options.bid_count, // Use attempt_id if available, fallback to bid_count
    bid_count: options.bid_count,
    quality: options.quality,
    is_benchmark: options.is_benchmark,
    comment: options.comment,
    climbed_at: formattedDate,
  };

  // Try new endpoint first, then fall back to old API
  let response: Response;
  
  try {
    // Try new web host endpoint first
    const newUrl = `${WEB_HOSTS[board]}/ascents/save/${options.uuid}`;
    console.log(`Trying new ascent endpoint: ${newUrl}`);
    
    response = await fetch(newUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    // If new endpoint returns 404, try old API endpoint
    if (response.status === 404) {
      console.log(`New ascent endpoint failed with 404, trying old API endpoint`);
      const oldUrl = `${API_HOSTS[board]}/v1/ascents/${options.uuid}`;
      
      // Use original payload structure for old API
      const oldRequestBody = {
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

      response = await fetch(oldUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
          'Cookie': `token=${token}`,
        },
        body: JSON.stringify(oldRequestBody),
      });
    }
  } catch (error) {
    // If network error on new endpoint, try old endpoint
    console.log(`New ascent endpoint failed with error, trying old API endpoint`);
    const oldUrl = `${API_HOSTS[board]}/v1/ascents/${options.uuid}`;
    
    const oldRequestBody = {
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

    response = await fetch(oldUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
        'Cookie': `token=${token}`,
      },
      body: JSON.stringify(oldRequestBody),
    });
  }

  console.log(`Save ascent response status: ${response.status}`);
  console.log(`Save ascent response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const responseClone = response.clone();
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      try {
        errorData = await responseClone.text();
      } catch (textError) {
        errorData = 'Could not read error response';
      }
    }
    console.error('Error response:', {
      status: response.status,
      statusText: response.statusText,
      errors: errorData,
    });
    throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
  }

  // Handle potentially empty response body
  let ascent: SaveAscentResponse;
  try {
    const responseText = await response.text();
    console.log(`Save ascent response body: ${responseText}`);
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from API');
    }
    ascent = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
    throw new Error(`Failed to parse API response: ${parseError}`);
  }
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
    requestBody.attempt_id || requestBody.bid_count,
    requestBody.bid_count,
    requestBody.quality,
    requestBody.difficulty,
    requestBody.is_benchmark ? 1 : 0,
    requestBody.comment || '',
    requestBody.climbed_at,
    savedAscentEvent.ascent.created_at, // Assuming `created_at` is now
  ];

  await sql`
    INSERT INTO ${sql.unsafe(fullTableName)} (
      uuid, climb_uuid, angle, is_mirror, user_id, attempt_id, 
      bid_count, quality, difficulty, is_benchmark, comment, 
      climbed_at, created_at
    )
    VALUES (
      ${requestBody.uuid}, ${requestBody.climb_uuid}, ${requestBody.angle}, ${requestBody.is_mirror}, ${requestBody.user_id}, ${requestBody.attempt_id || requestBody.bid_count}, ${requestBody.bid_count}, ${requestBody.quality}, ${requestBody.difficulty}, ${requestBody.is_benchmark ? 1 : 0}, ${requestBody.comment || ''}, ${requestBody.climbed_at}, ${savedAscentEvent.ascent.created_at}
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
      climbed_at = EXCLUDED.climbed_at
  `;

  return ascent;
}
