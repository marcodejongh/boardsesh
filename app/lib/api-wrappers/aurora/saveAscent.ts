import { BoardName } from '../../types';
import { API_HOSTS, SaveAscentOptions } from './types';
import { generateUuid } from './util';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function saveAscent(board: BoardName, token: string, options: SaveAscentOptions): Promise<any> {
  const uuid = generateUuid();

  // Convert ISO date to the simpler format
  const date = new Date(options.climbed_at);
  const formattedDate = date.toISOString().replace('T', ' ').split('.')[0];

  const requestBody = {
    uuid,
    angle: options.angle,
    attempt_id: options.attempt_id,
    bid_count: options.bid_count,
    climb_uuid: options.climb_uuid,
    climbed_at: formattedDate, // Use formatted date
    comment: options.comment,
    difficulty: options.difficulty,
    is_benchmark: options.is_benchmark,
    is_mirror: options.is_mirror,
    quality: options.quality,
    user_id: options.user_id,
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${API_HOSTS[board]}/v1/ascents/${uuid}`, {
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

  return response.json();
}