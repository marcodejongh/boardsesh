import { BoardName } from '../../types';
import { API_HOSTS, GymInfo } from './types';

export async function getGyms(board: BoardName): Promise<{ gyms: GymInfo[] }> {
  const response = await fetch(`${API_HOSTS[board]}/v1/pins?types=gym`, {
    headers: {
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0'
    }
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
