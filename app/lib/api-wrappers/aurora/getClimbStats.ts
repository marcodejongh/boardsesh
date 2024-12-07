import { BoardName } from '../../types';
import { API_HOSTS, ClimbStats } from './types';

export async function getClimbStats(
  board: BoardName,
  token: string,
  climbId: string,
  angle: number,
): Promise<ClimbStats> {
  const response = await fetch(`${API_HOSTS[board]}/v1/climbs/${climbId}/info?angle=${angle}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}
