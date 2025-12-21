import { BoardName } from '../../types';
import { API_HOSTS } from './types';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function explore(board: BoardName, token: string): Promise<any> {
  const response = await fetch(`${API_HOSTS[board]}/explore`, {
    headers: {
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
