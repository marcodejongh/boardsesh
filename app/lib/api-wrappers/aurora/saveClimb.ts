import { BoardName } from '../../types';
import { API_HOSTS, SaveClimbOptions } from './types';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function saveClimb(board: BoardName, token: string, options: SaveClimbOptions): Promise<any> {
  const uuid = generateUuid();
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
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
function generateUuid() {
  throw new Error('Function not implemented.');
}
