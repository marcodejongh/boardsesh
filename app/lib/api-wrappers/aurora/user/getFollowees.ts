import { BoardName } from '../../../types';
import { WEB_HOSTS } from '../types';

export interface Followee {
  id: number; // Unique ID for the followee
  username: string; // Username of the followee
  name?: string; // Optional name of the followee
  avatar_image?: string; // Optional avatar image path
  followee_state: string; // State of the followee relationship (e.g., "accepted")
}

export interface FolloweesResponse {
  users: Followee[]; // Array of followees
}

export async function getFollowees(board: BoardName, userId: number, token: string): Promise<FolloweesResponse> {
  const url = `${WEB_HOSTS[board]}/users/${userId}/followees`;
  console.log(`Getting followees from: ${url}`);

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
    console.error('Get followees error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
