import { BoardName } from '../../types';
import { API_HOSTS, SaveAscentOptions, SaveAscentResponse } from './types';
import dayjs from 'dayjs';

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

  return response.json();
}
