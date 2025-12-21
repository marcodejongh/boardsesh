import { BoardName } from '../../../types';
import { API_HOSTS } from '../types';
import { auroraGetApi } from '../util';

export interface SocialStats {
  followees_accepted: number;
  followers_accepted: number;
  followers_pending: number;
}

export interface Logbook {
  count: number; // Number of logbook entries
}

export interface CircuitUser {
  id: number;
  username: string;
  is_verified: boolean;
  avatar_image: string | null;
  created_at: string; // ISO 8601 date string
}

export interface Circuit {
  uuid: string;
  name: string;
  description: string;
  color: string;
  user_id: number;
  is_public: boolean;
  is_listed: boolean;
  created_at: string;
  updated_at: string;
  user: CircuitUser;
  count: number;
}

export interface User {
  id: number;
  username: string;
  email_address: string;
  name: string;
  avatar_image: string | null; // Nullable avatar image
  instagram_username?: string; // Optional Instagram username
  is_public: boolean; // Indicates if the profile is public
  is_verified: boolean; // Indicates if the user is verified
  created_at: string; // ISO 8601 date string for creation
  updated_at: string; // ISO 8601 date string for last update
  social: SocialStats; // Social stats (followees, followers, etc.)
  logbook: Logbook; // Logbook stats
  circuits: Circuit[]; // Array of circuits created by the user
}

// Avatar url: https://api.kilterboardapp.com/img/avatars/74336-20220729204756.jpg

export interface UsersResponse {
  users: User[]; // List of users
}

export async function getUser(board: BoardName, userId: number, token: string): Promise<UsersResponse> {
  const url = `${API_HOSTS[board]}/users/${userId}`;
  const data = await auroraGetApi<UsersResponse>(url, token);

  return data;
}
