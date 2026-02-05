// Shared TypeScript types for Boardsesh
// These types are used by both the backend and the web app

export type UserId = string;

// Hold state types matching the web app
export type HoldState = 'OFF' | 'STARTING' | 'FINISH' | 'HAND' | 'FOOT' | 'ANY' | 'NOT';
export type LitupHold = { state: HoldState; color: string; displayColor: string };
export type LitUpHoldsMap = Record<number, LitupHold>;

export type Climb = {
  uuid: string;
  layoutId?: number | null; // GraphQL nullable Int - layout the climb belongs to
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

export type BoardName = 'kilter' | 'tension' | 'moonboard';

// All supported board types - single source of truth
export const SUPPORTED_BOARDS: BoardName[] = ['kilter', 'tension', 'moonboard'];

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
  // Hold filters - accepts any HoldState for filtering climbs by hold usage
  holdsFilter?: Record<string, HoldState>;
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

// ============================================
// Profile Statistics Types
// ============================================

export type GradeCount = {
  grade: string;
  count: number;
};

export type LayoutStats = {
  layoutKey: string;
  boardType: string;
  layoutId: number | null;
  distinctClimbCount: number;
  gradeCounts: GradeCount[];
};

export type ProfileStats = {
  totalDistinctClimbs: number;
  layoutStats: LayoutStats[];
};

/**
 * Event types for GraphQL subscriptions
 *
 * ## Type Aliasing Strategy
 *
 * There are TWO event types due to GraphQL union type constraints:
 *
 * 1. `QueueEvent` - Server-side type using `item` field. Used by backend PubSub
 *    and for eventsReplay query responses.
 *
 * 2. `SubscriptionQueueEvent` - Client-side type using aliased fields (`addedItem`,
 *    `currentItem`). Required because GraphQL doesn't allow the same field name
 *    with different nullability in a union (QueueItemAdded.item is non-null,
 *    CurrentClimbChanged.item is nullable).
 */

// Server-side event type - uses actual GraphQL field names
export type QueueEvent =
  | { __typename: 'FullSync'; sequence: number; state: QueueState }
  | { __typename: 'QueueItemAdded'; sequence: number; item: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; sequence: number; uuid: string }
  | { __typename: 'QueueReordered'; sequence: number; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; sequence: number; item: ClimbQueueItem | null; clientId: string | null; correlationId: string | null }
  | { __typename: 'ClimbMirrored'; sequence: number; mirrored: boolean };

// Client-side subscription event type - uses aliased field names to avoid GraphQL union conflicts
export type SubscriptionQueueEvent =
  | { __typename: 'FullSync'; sequence: number; state: QueueState }
  | { __typename: 'QueueItemAdded'; sequence: number; addedItem: ClimbQueueItem; position?: number }
  | { __typename: 'QueueItemRemoved'; sequence: number; uuid: string }
  | { __typename: 'QueueReordered'; sequence: number; uuid: string; oldIndex: number; newIndex: number }
  | { __typename: 'CurrentClimbChanged'; sequence: number; currentItem: ClimbQueueItem | null; clientId: string | null; correlationId: string | null }
  | { __typename: 'ClimbMirrored'; sequence: number; mirrored: boolean };

export type SessionEvent =
  | { __typename: 'UserJoined'; user: SessionUser }
  | { __typename: 'UserLeft'; userId: string }
  | { __typename: 'LeaderChanged'; leaderId: string }
  | { __typename: 'SessionEnded'; reason: string; newPath?: string }
  | { __typename: 'AngleChanged'; angle: number; boardPath: string };

export type ConnectionContext = {
  connectionId: string;
  sessionId?: string;
  userId?: string;
  isAuthenticated?: boolean;
  // Controller-specific context (set when using API key auth)
  controllerId?: string;
  controllerApiKey?: string;
  controllerMac?: string; // Controller's MAC address (used as clientId for BLE disconnect logic)
};

// ============================================
// ESP32 Controller Types
// ============================================

// LED command for controller - pre-computed RGB values
export type LedCommand = {
  position: number;
  r: number;
  g: number;
  b: number;
  role?: number;
};

// Minimal climb info for ESP32 navigation display
export type QueueNavigationItem = {
  name: string;
  grade: string;
  gradeColor: string;
};

// Navigation context sent with LED updates
export type QueueNavigationContext = {
  previousClimbs: QueueNavigationItem[];
  nextClimb: QueueNavigationItem | null;
  currentIndex: number;
  totalCount: number;
};

// LED update event sent to controller
export type LedUpdate = {
  __typename: 'LedUpdate';
  commands: LedCommand[];
  queueItemUuid?: string;
  climbUuid?: string;
  climbName?: string;
  climbGrade?: string;
  gradeColor?: string;
  boardPath?: string;
  angle?: number;
  navigation?: QueueNavigationContext | null;
  // ID of client that triggered this update (null if system-initiated)
  // ESP32 uses this to decide whether to disconnect BLE client
  clientId?: string | null;
};

// Ping event to keep controller connection alive
export type ControllerPing = {
  __typename: 'ControllerPing';
  timestamp: string;
};

// Minimal queue item for controller display
export type ControllerQueueItem = {
  uuid: string; // Queue item UUID (for navigation)
  climbUuid: string; // Climb UUID (for display/matching)
  name: string;
  grade: string;
  gradeColor: string;
};

// Queue sync event sent to controller
export type ControllerQueueSync = {
  __typename: 'ControllerQueueSync';
  queue: ControllerQueueItem[];
  currentIndex: number;
};

// Union of events sent to controller
export type ControllerEvent = LedUpdate | ControllerPing | ControllerQueueSync;

// Controller info for management UI
export type ControllerInfo = {
  id: string;
  name?: string;
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
};

// Result of controller registration
export type ControllerRegistration = {
  apiKey: string;
  controllerId: string;
};

// Input for registering a controller
export type RegisterControllerInput = {
  boardName: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  name?: string;
};

// Result of climb matching from LED positions
export type ClimbMatchResult = {
  matched: boolean;
  climbUuid: string | null;
  climbName: string | null;
};

// ============================================
// Device Logging Types (ESP32 → Axiom)
// ============================================

// A single log entry from a device
export type DeviceLogEntry = {
  ts: number;
  level: string;
  component: string;
  message: string;
  metadata?: string; // JSON string for flexibility
};

// Input for sending device logs
export type SendDeviceLogsInput = {
  logs: DeviceLogEntry[];
};

// Response from sending device logs
export type SendDeviceLogsResponse = {
  success: boolean;
  accepted: number;
};
