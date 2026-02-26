import { AuroraBoardName } from '../aurora/types';

export const HOST_BASES: Record<AuroraBoardName, string> = {
  // aurora: 'auroraboardapp',
  // decoy: 'decoyboardapp',
  // grasshopper: 'grasshopperboardapp',
  kilter: 'kilterboardapp',
  tension: 'tensionboardapp2',
  // touchstone: 'touchstoneboardapp',
};

/**
 * User Profile interface
 */
export interface UserProfile {
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

/**
 * Client configuration options
 */
export interface ClientOptions {
  boardName: AuroraBoardName;
  token?: string | null;
  apiVersion?: string;
}

export interface Session {
  user_id: number;
  token: string;
}

export interface LoginResponse {
  error?: string;
  login?: {
    created_at: string;
    token: string;
    user_id: number;
  };
  token?: string;
  user?: UserProfile;
  user_id?: number;
  username?: string;
  session?: {
    token: string;
    user_id: number;
  };
}
