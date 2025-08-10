import { BoardName } from '../../types';
import { WEB_HOSTS, SaveAscentOptions, SaveAscentResponse, Ascent } from './types';
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
  const requestData = {
    user_id: options.user_id,
    uuid: options.uuid,
    climb_uuid: options.climb_uuid,
    angle: options.angle,
    difficulty: options.difficulty,
    is_mirror: options.is_mirror ? 1 : 0,
    attempt_id: options.attempt_id || options.bid_count, // Use attempt_id if available, fallback to bid_count
    bid_count: options.bid_count,
    quality: options.quality,
    is_benchmark: options.is_benchmark ? 1 : 0,
    comment: options.comment,
    climbed_at: formattedDate,
  };

  // Build URL-encoded form data - Aurora expects this format!
  const requestBody = new URLSearchParams();
  Object.entries(requestData).forEach(([key, value]) => {
    requestBody.append(key, String(value));
  });

  // Use the web host endpoint with POST method
  const url = `${WEB_HOSTS[board]}/ascents/save`;
  console.log(`Saving ascent to: ${url}`);

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
  console.log(`Save ascent response headers:`, Object.fromEntries(response.headers.entries()));

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
    console.error('Error response:', {
      status: response.status,
      statusText: response.statusText,
      errors: errorData,
    });
    throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
  }

  // Handle potentially empty response body
  let responseData: unknown;
  try {
    const responseText = await response.text();
    console.log(`Save ascent response body: ${responseText}`);

    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from API');
    }
    responseData = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
    throw new Error(`Failed to parse API response: ${parseError}`);
  }

  // Handle the new response format
  const typedResponse = responseData as { ascents?: Ascent[] };
  if (!typedResponse.ascents || typedResponse.ascents.length === 0) {
    throw new Error('No ascent data in response');
  }

  const savedAscent = typedResponse.ascents[0];

  // Insert into the intermediate database
  const fullTableName = getTableName(board, 'ascents'); // Replace with your actual table name

  await sql`
    INSERT INTO ${sql.unsafe(fullTableName)} (
      uuid, climb_uuid, angle, is_mirror, user_id, attempt_id, 
      bid_count, quality, difficulty, is_benchmark, comment, 
      climbed_at, created_at
    )
    VALUES (
      ${requestData.uuid}, ${requestData.climb_uuid}, ${requestData.angle}, ${requestData.is_mirror}, ${requestData.user_id}, ${requestData.attempt_id || requestData.bid_count}, ${requestData.bid_count}, ${requestData.quality}, ${requestData.difficulty}, ${requestData.is_benchmark ? 1 : 0}, ${requestData.comment || ''}, ${requestData.climbed_at}, ${savedAscent.created_at}
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

  // Return response in the expected format
  return {
    events: [
      {
        _type: 'ascent_saved' as const,
        ascent: savedAscent,
      },
    ],
  };
}
