import { BoardName } from '../../types';
import { WEB_HOSTS, ClimbStats } from './types';

export async function getClimbStats(
  board: BoardName,
  token: string,
  climbId: string,
  angle: number,
): Promise<ClimbStats> {
  const url = `${WEB_HOSTS[board]}/climbs/${climbId}/info?angle=${angle}`;
  console.log(`Getting climb stats from: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
      Cookie: `token=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Get climb stats error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
