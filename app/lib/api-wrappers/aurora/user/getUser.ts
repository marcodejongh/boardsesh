import { BoardName } from '../../../types';
import { WEB_HOSTS } from '../types';

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
  const url = `${WEB_HOSTS[board]}/users/${userId}`;
  console.log(`Getting user from: ${url}`);

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
    console.error('Get user error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
