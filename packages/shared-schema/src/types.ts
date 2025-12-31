// Shared TypeScript types for Boardsesh
// These types are used by both the backend and the web app

export type UserId = string;

// Hold state types matching the web app
export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT' | 'ANY' | 'NOT';
export type LitupHold = { state: HoldState; color: string; displayColor: string };
export type LitUpHoldsMap = Record<number, LitupHold>;

export type Climb = {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: string;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: string;
  stars: number;
  difficulty_error: string;
  litUpHoldsMap: LitUpHoldsMap;
  mirrored?: boolean | null; // GraphQL nullable Boolean
  benchmark_difficulty: string | null;
  userAscents?: number | null; // GraphQL nullable Int
  userAttempts?: number | null; // GraphQL nullable Int
};

export type QueueItemUser = {
  id: string;
  username: string;
  avatarUrl?: string | null; // GraphQL nullable String
};

// Input type for QueueItemUser (matches GraphQL QueueItemUserInput)
export type QueueItemUserInput = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

// Input type for Climb (matches GraphQL ClimbInput)
export type ClimbInput = {
  uuid: string;
  setter_username: string;
  name: string;
  description: string;
  frames: string;
  angle: number;
  ascensionist_count: number;
  difficulty: string;
  quality_average: string;
  stars: number;
  difficulty_error: string;
  litUpHoldsMap: LitUpHoldsMap;
  mirrored?: boolean | null;
  benchmark_difficulty?: string | null;
  userAscents?: number | null;
  userAttempts?: number | null;
};

export type ClimbQueueItem = {
  uuid: string;
  climb: Climb;
  addedBy?: UserId;
  addedByUser?: QueueItemUser;
  tickedBy?: UserId[];
  suggested?: boolean;
};

// Input type for ClimbQueueItem (matches GraphQL ClimbQueueItemInput)
export type ClimbQueueItemInput = {
  uuid: string;
  climb: ClimbInput;
  addedBy?: string | null;
  addedByUser?: QueueItemUserInput | null;
  tickedBy?: string[] | null;
  suggested?: boolean | null;
};

export type SessionUser = {
  id: string;
  username: string;
  isLeader: boolean;
  avatarUrl?: string;
};

export type QueueState = {
  sequence: number;
  stateHash: string;
  queue: ClimbQueueItem[];
  currentClimbQueueItem: ClimbQueueItem | null;
};

// Response for delta sync event replay (Phase 2)
// Uses QueueEvent since this is a query returning buffered events with standard field names
export type EventsReplayResponse = {
  events: QueueEvent[];
  currentSequence: number;
};

// ============================================
// Board Configuration Types
// ============================================

export type BoardName = 'kilter' | 'tension';

export type Grade = {
  difficultyId: number;
  name: string;
};

export type Angle = {
  angle: number;
};

// ============================================
// Climb Search Types
// ============================================

export type ClimbSearchInput = {
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  angle: number;
  // Pagination
  page?: number;
  pageSize?: number;
  // Filters
  gradeAccuracy?: string;
  minGrade?: number;
  maxGrade?: number;
  minAscents?: number;
  sortBy?: string;
  sortOrder?: string;
  name?: string;
  setter?: string[];
  setterId?: number;
  onlyBenchmarks?: boolean;
  onlyTallClimbs?: boolean;
  // Hold filters
  holdsFilter?: Record<string, 'ANY' | 'NOT'>;
  // Personal progress filters
  hideAttempted?: boolean;
  hideCompleted?: boolean;
  showOnlyAttempted?: boolean;
  showOnlyCompleted?: boolean;
};

export type ClimbSearchResult = {
  climbs: Climb[];
  totalCount: number;
  hasMore: boolean;
};

// ============================================
// User Management Types
// ============================================

export type UserProfile = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
};

export type UpdateProfileInput = {
  displayName?: string;
  avatarUrl?: string;
};

export type AuroraCredential = {
  boardType: string;
  username: string;
  userId?: number;
  syncedAt?: string;
  token?: string;
};

export type AuroraCredentialStatus = {
  boardType: string;
  username: string;
  userId?: number;
  syncedAt?: string;
  hasToken: boolean;
};

export type SaveAuroraCredentialInput = {
  boardType: string;
  username: string;
  password: string;
};

// ============================================
// Favorites Types
// ============================================

export type ToggleFavoriteInput = {
  boardName: string;
  climbUuid: string;
  angle: number;
};

export type ToggleFavoriteResult = {
  favorited: boolean;
};

// ============================================
// Ticks Types (Local Ascent Tracking)
// ============================================

export type TickStatus = 'flash' | 'send' | 'attempt';

export type Tick = {
  uuid: string;
  userId: string;
  boardType: string;
  climbUuid: string;
  angle: number;
  isMirror: boolean;
  status: TickStatus;
  attemptCount: number;
  quality: number | null;
  difficulty: number | null;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  createdAt: string;
  updatedAt: string;
  sessionId: string | null;
  auroraType: string | null;
  auroraId: string | null;
  auroraSyncedAt: string | null;
  layoutId: number | null;
};

export type SaveTickInput = {
  boardType: string;
  climbUuid: string;
  angle: number;
  isMirror: boolean;
  status: TickStatus;
  attemptCount: number;
  quality?: number | null;
  difficulty?: number | null;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  sessionId?: string;
};

export type GetTicksInput = {
  boardType: string;
  climbUuids?: string[];
};

/**
 * Event types for GraphQL subscriptions
 *
 * ## Type Aliasing Strategy
 *
 * QueueEvent uses consistent field names (`item`) for both QueueItemAdded and
 * CurrentClimbChanged events. This type is used in both the backend (PubSub)
 * and frontend (subscriptions).
 */

// Queue event type - uses consistent field names across server and client
export type QueueEvent =
  | { __typename: 'FullSync'; sequence: number; state: QueueState }
  | { __typename: 'QueueItemAdded'; sequence: number; item: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; sequence: number; uuid: string }
  | { __typename: 'QueueReordered'; sequence: number; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; sequence: number; item: ClimbQueueItem | null; clientId: string | null; correlationId: string | null }
  | { __typename: 'ClimbMirrored'; sequence: number; mirrored: boolean };

export type SessionEvent =
  | { __typename: 'UserJoined'; user: SessionUser }
  | { __typename: 'UserLeft'; userId: string }
  | { __typename: 'LeaderChanged'; leaderId: string }
  | { __typename: 'SessionEnded'; reason: string; newPath?: string };

export type ConnectionContext = {
  connectionId: string;
  sessionId?: string;
  userId?: string;
  isAuthenticated?: boolean;
};
