import { BoardName } from '../../types';
import { API_HOSTS } from './types';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function explore(board: BoardName, token: string): Promise<any> {
  const response = await fetch(`${API_HOSTS[board]}/explore`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
