import { BoardName } from '../../types';
import { WEB_HOSTS } from './types';

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export async function explore(board: BoardName, token: string): Promise<any> {
  const url = `${WEB_HOSTS[board]}/explore`;
  console.log(`Exploring from: ${url}`);

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
    console.error('Explore error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
