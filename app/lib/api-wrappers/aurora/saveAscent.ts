import { BoardName, SaveAscentOptions, generateUuid } from "./util";
import { API_HOSTS } from './types';


async function saveAscent(board: BoardName, token: string, options: SaveAscentOptions): Promise<any> {
  const uuid = generateUuid();
  const response = await fetch(`${API_HOSTS[board]}/v1/ascents/${uuid}`, {
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
