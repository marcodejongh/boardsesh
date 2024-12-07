import { BoardName } from './util';
import { API_HOSTS } from './types';

async function getUser(board: BoardName, token: string, userId: string): Promise<any> {
  const response = await fetch(`${API_HOSTS[board]}/v2/users/${userId}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
