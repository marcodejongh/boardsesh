import { API_HOSTS } from './types';

export async function explore(board: BoardName, token: string): Promise<any> {
  const response = await fetch(`${API_HOSTS[board]}/explore`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
