import { BoardName } from '../../../types';
import { API_HOSTS } from '../types';
import { auroraGetApi } from '../util';

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
  // Replace `any` with the specific type for followees if available
  const url = `${API_HOSTS[board]}/users/${userId}/followees`; // Adjust the endpoint as needed
  const data = await auroraGetApi<FolloweesResponse>(url, token);

  return data;
}
