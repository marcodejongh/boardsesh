export const HOST_BASES: Record<BoardName, string> = {
  // aurora: 'auroraboardapp',
  // decoy: 'decoyboardapp',
  // grasshopper: 'grasshopperboardapp',
  kilter: 'kilterboardapp',
  tension: 'tensionboardapp2',
  // touchstone: 'touchstoneboardapp',
};

export type BoardName = 'kilter' | 'tension';

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
 * Leaderboard interface
 */
export interface Leaderboard {
  id: number;
  name: string;
  description?: string;
  type: string;
  created_at: string;
  updated_at: string;
}

/**
 * Leaderboard Score interface
 */
export interface LeaderboardScore {
  user_id: number;
  username: string;
  score: number;
  rank: number;
  created_at: string;
}

/**
 * Notification interface
 */
export interface Notification {
  id: number;
  type: string;
  user_id: number;
  event_type: string;
  related_entity_id?: number;
  related_entity_type?: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Search Result interface
 */
export interface SearchResult {
  id: string;
  type: string; // 'climb', 'user', etc.
  title: string;
  description?: string;
  thumbnail_url?: string;
  entity_id: string | number;
}

/**
 * Exhibit interface
 */
export interface Exhibit {
  id: number;
  user_id: number;
  climb_uuid: string;
  serial_number?: string;
  created_at: string;
  updated_at: string;
  climb?: ClimbSummary;
}

/**
 * Climb Summary interface (used in exhibits and other places)
 */
export interface ClimbSummary {
  uuid: string;
  name: string;
  description?: string;
  setter_id: number;
  grade?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gym Pin interface
 */
export interface GymPin {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Sync Table interface
 */
export interface SyncTable {
  table_name: string;
  records: any[]; // These could be typed more specifically per table
  last_synced_at: string;
}

/**
 * Sync Response interface
 */
export interface SyncResponse {
  shared_data: Record<string, SyncTable>;
  user_data?: Record<string, SyncTable>;
  status: string;
}

/**
 * Follow state enum
 */
export enum FollowState {
  NONE = 'none',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  BLOCKED = 'blocked',
  UNFOLLOWED = 'unfollowed',
}

/**
 * Client configuration options
 */
export interface ClientOptions {
  boardName: BoardName;
  token?: string | null;
  apiVersion?: string;
}

/**
 * Session data interface
 */
export interface SessionResponse {
  session: Session;
}

export interface Session {
  user_id: number;
  token: string;
};

export interface LoginResponse {
  error: string;
  login: {
    created_at: string;
    token: string;
    user_id: number;
  };
  token: string;
  user: UserProfile;
  user_id: number;
  username: string;
}


/**
 * Follow relationship interface
 */
export interface Follow {
  followee_id: number;
  follower_id: number;
  state: string;
}

/**
 * Delete user validation errors interface
 */
export interface DeleteUserValidationErrors {
  password?: string[];
}

/**
 * Sign up details interface
 */
export interface SignUpDetails {
  username: string;
  password: string;
  emailAddress: string;
  mailingListOptIn: boolean;
}

/**
 * Sign in details interface
 */
export interface SignInDetails {
  username: string;
  password: string;
}

/**
 * Profile details interface
 */
export interface ProfileDetails {
  id: number;
  name: string;
  emailAddress: string;
  instagramUsername?: string;
  isPublic: boolean;
  avatarAction?: AvatarAction;
  gymDetails?: GymDetails;
}

/**
 * Avatar action interface
 */
export type AvatarAction = AvatarUpload | AvatarClear;

/**
 * Avatar upload interface
 */
export interface AvatarUpload {
  type: 'upload';
  data: Blob; // In a browser environment, this would be a Blob or File
}

/**
 * Avatar clear interface
 */
export interface AvatarClear {
  type: 'clear';
}

/**
 * Gym details interface
 */
export interface GymDetails {}

/**
 * Wall details interface
 */
export interface WallDetails {
  uuid: string;
  userId: number;
  name: string;
  isAdjustable: boolean;
  angle: number;
  layoutId: number;
  productSizeId: number;
  serialNumber?: string;
  holdSetIds: number[];
}

/**
 * Tag interface
 */
export interface Tag {
  entityUUID: string;
  userID: number;
  name: string;
  isListed: boolean;
}

/**
 * Climb details interface
 */
export interface ClimbDetails {
  uuid: string;
  layoutId: number;
  setterId: number;
  name: string;
  description: string;
  isDraft: boolean;
  framesCount: number;
  framesPace: number;
  placements: any[];
  angle?: number | null;
}

/**
 * Ascent details interface
 */
export interface AscentDetails {
  uuid: string;
  userID: number;
  climbUUID: string;
  angle: number;
  isMirror: boolean;
  bidCount: number;
  quality: number;
  difficulty: number;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
}

/**
 * Bid details interface
 */
export interface BidDetails {
  uuid: string;
  userID: number;
  climbUUID: string;
  angle: number;
  isMirror: boolean;
  bidCount: number;
  comment: string;
  climbedAt: string;
}

/**
 * Circuit details interface
 */
export interface CircuitDetails {
  uuid: string;
  userID: number;
  name: string;
  description: string;
  color: string;
  isPublic: boolean;
}

/**
 * Climb report interface
 */
export interface ClimbReport {
  userID: number;
  climbUUID: string;
  message: string;
}

/**
 * Notifications filter interface
 */
export interface NotificationsFilter {
  types: string[];
  before?: string;
}

/**
 * Exhibits filter interface
 */
export interface ExhibitsFilter {
  serialNumber: string;
  before?: string;
  after?: string;
}

/**
 * Shared Sync interface
 */
export interface SharedSync {
  tableName: string;
  lastSynchronizedAt: string;
}

/**
 * User Sync interface
 */
export interface UserSync {
  tableName: string;
  lastSynchronizedAt: string;
}
