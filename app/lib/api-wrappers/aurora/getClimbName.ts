import { BoardName } from '../../types';
import { WEB_HOSTS } from './types';

export async function getClimbName(board: BoardName, climbId: string): Promise<string | null> {
  const url = `${WEB_HOSTS[board]}/climbs/${climbId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Kilter%20Board/202 CFNetwork/1568.100.1 Darwin/24.0.0',
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const text = await response.text();
  const match = text.match(/<h1[^>]*>([^<]+)<\/h1>/);
  return match ? match[1].trim() : null;
}
