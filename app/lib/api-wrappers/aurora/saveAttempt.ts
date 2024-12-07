import { BoardName } from '../../types';
import { API_HOSTS, SaveAttemptOptions } from './types';
import { generateUuid } from './util';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function saveAttempt(board: BoardName, token: string, options: SaveAttemptOptions): Promise<any> {
  const uuid = generateUuid();
  const response = await fetch(`${API_HOSTS[board]}/v1/bids/${uuid}`, {
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
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
