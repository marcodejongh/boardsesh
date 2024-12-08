import { BoardName } from '../../types';

export interface BoardUser {
  id: number;
  username: string;
  email_address: string;
  created_at: string;
  updated_at: string;
  is_listed: boolean;
  is_public: boolean;
  avatar_image: string | null;
  banner_image: string | null;
  city: string | null;
  country: string | null;
  height: number | null;
  weight: number | null;
  wingspan: number | null;
}

export interface LoginResponse {
  error: string;
  login: {
    created_at: string;
    token: string;
    user_id: number;
  };
  token: string;
  user: BoardUser;
  user_id: number;
  username: string;
}

export interface GymInfo {
  id: number;
  username: string;
  name: string;
  latitude: number;
  longitude: number;
}
export interface SyncOptions {
  tables?: string[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  walls?: any[];
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  wallExpungements?: any[];
  sharedSyncs?: Array<{
    table_name: string;
    last_synchronized_at: string;
  }>;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  userSyncs?: any[];
}
export interface ClimbStats {
  display_difficulty: number;
  benchmark_difficulty: number | null;
  repeats: number;
  sends: number;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  [key: string]: any;
}
export interface SaveAscentOptions {
  user_id: number;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  attempt_id: number | null;
  bid_count: number;
  quality: number;
  difficulty: number;
  is_benchmark: boolean;
  comment: string;
  climbed_at: string;
}
export interface SaveAttemptOptions {
  user_id: string;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  bid_count: number;
  comment: string;
  climbed_at: string;
}
export interface SaveClimbOptions {
  layout_id: string;
  setter_id: string;
  name: string;
  description: string;
  is_draft: boolean;
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  frames: any[];
  frames_count?: number;
  frames_pace?: number;
  angle?: number;
}
export const HOST_BASES: Record<BoardName, string> = {
  // aurora: 'auroraboardapp',
  // decoy: 'decoyboardapp',
  // grasshopper: 'grasshopperboardapp',
  kilter: 'kilterboardapp',
  tension: 'tensionboardapp2',
  // touchstone: 'touchstoneboardapp',
};

//
export const API_HOSTS: Record<BoardName, string> = Object.fromEntries(
  Object.entries(HOST_BASES).map(([board, hostBase]) => [board, `https://api.${hostBase}.com`]),
) as Record<BoardName, string>;

export const WEB_HOSTS: Record<BoardName, string> = Object.fromEntries(
  Object.entries(HOST_BASES).map(([board, hostBase]) => [board, `https://${hostBase}.com`]),
) as Record<BoardName, string>;

export interface Ascent {
  uuid: string;
  wall_uuid: string | null;
  climb_uuid: string;
  angle: number;
  is_mirror: boolean;
  user_id: number;
  attempt_id: number;
  bid_count: number;
  quality: number;
  difficulty: number;
  is_benchmark: boolean;
  is_listed: boolean;
  comment: string;
  climbed_at: string;
  created_at: string;
  updated_at: string;
}
