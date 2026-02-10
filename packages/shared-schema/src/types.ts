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
  boardId?: number | null;
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
  layoutId?: number;
  sizeId?: number;
  setIds?: string;
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

// ============================================
// Board Entity Types
// ============================================

export type UserBoard = {
  uuid: string;
  slug: string;
  ownerId: string;
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
  boardType: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  name: string;
  description?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPublic: boolean;
  isOwned: boolean;
  createdAt: string;
  layoutName?: string | null;
  sizeName?: string | null;
  sizeDescription?: string | null;
  setNames?: string[] | null;
  totalAscents: number;
  uniqueClimbers: number;
  followerCount: number;
  commentCount: number;
  isFollowedByMe: boolean;
};

export type UserBoardConnection = {
  boards: UserBoard[];
  totalCount: number;
  hasMore: boolean;
};

export type BoardLeaderboardEntry = {
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  rank: number;
  totalSends: number;
  totalFlashes: number;
  hardestGrade?: number | null;
  hardestGradeName?: string | null;
  totalSessions: number;
};

export type BoardLeaderboard = {
  boardUuid: string;
  entries: BoardLeaderboardEntry[];
  totalCount: number;
  hasMore: boolean;
  periodLabel: string;
};

export type CreateBoardInput = {
  boardType: string;
  layoutId: number;
  sizeId: number;
  setIds: string;
  name: string;
  description?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
  isOwned?: boolean;
};

export type UpdateBoardInput = {
  boardUuid: string;
  name?: string;
  slug?: string;
  description?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  isPublic?: boolean;
  isOwned?: boolean;
};

export type BoardLeaderboardInput = {
  boardUuid: string;
  period?: string;
  limit?: number;
  offset?: number;
};

export type MyBoardsInput = {
  limit?: number;
  offset?: number;
};

export type FollowBoardInput = {
  boardUuid: string;
};

export type SearchBoardsInput = {
  query?: string;
  boardType?: string;
  limit?: number;
  offset?: number;
};

// ============================================
// Social / Follow Types
// ============================================

export type PublicUserProfile = {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
};

export type FollowConnection = {
  users: PublicUserProfile[];
  totalCount: number;
  hasMore: boolean;
};

export type UserSearchResult = {
  user: PublicUserProfile;
  recentAscentCount: number;
  matchReason?: string;
};

export type UserSearchConnection = {
  results: UserSearchResult[];
  totalCount: number;
  hasMore: boolean;
};

export type FollowingAscentFeedItem = {
  uuid: string;
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  climbUuid: string;
  climbName: string;
  setterUsername?: string;
  boardType: string;
  layoutId?: number;
  angle: number;
  isMirror: boolean;
  status: string;
  attemptCount: number;
  quality?: number;
  difficulty?: number;
  difficultyName?: string;
  isBenchmark: boolean;
  comment: string;
  climbedAt: string;
  frames?: string;
};

export type FollowingAscentsFeedResult = {
  items: FollowingAscentFeedItem[];
  totalCount: number;
  hasMore: boolean;
};

// ============================================
// Activity Feed Types
// ============================================

export type ActivityFeedItemType = 'ascent' | 'new_climb' | 'comment' | 'proposal_approved';

export type ActivityFeedItem = {
  id: string;
  type: ActivityFeedItemType;
  entityType: SocialEntityType;
  entityId: string;
  boardUuid?: string | null;
  actorId?: string | null;
  actorDisplayName?: string | null;
  actorAvatarUrl?: string | null;
  climbName?: string | null;
  climbUuid?: string | null;
  boardType?: string | null;
  layoutId?: number | null;
  gradeName?: string | null;
  status?: string | null;
  angle?: number | null;
  frames?: string | null;
  setterUsername?: string | null;
  commentBody?: string | null;
  isMirror?: boolean | null;
  isBenchmark?: boolean | null;
  difficulty?: number | null;
  difficultyName?: string | null;
  quality?: number | null;
  attemptCount?: number | null;
  comment?: string | null;
  createdAt: string;
};

export type ActivityFeedResult = {
  items: ActivityFeedItem[];
  cursor?: string | null;
  hasMore: boolean;
};

export type ActivityFeedInput = {
  cursor?: string | null;
  limit?: number;
  boardUuid?: string | null;
  sortBy?: SortMode;
  topPeriod?: TimePeriod;
};

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'new_follower'
  | 'comment_reply'
  | 'comment_on_tick'
  | 'comment_on_climb'
  | 'vote_on_tick'
  | 'vote_on_comment'
  | 'new_climb'
  | 'new_climb_global'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_vote';

export type Notification = {
  uuid: string;
  type: NotificationType;
  actorId?: string | null;
  actorDisplayName?: string | null;
  actorAvatarUrl?: string | null;
  entityType?: SocialEntityType | null;
  entityId?: string | null;
  commentBody?: string | null;
  climbName?: string | null;
  climbUuid?: string | null;
  boardType?: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationConnection = {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
};

export type NotificationEvent = {
  notification: Notification;
};

export type CommentAdded = {
  __typename: 'CommentAdded';
  comment: Comment;
};

export type CommentUpdated = {
  __typename: 'CommentUpdated';
  comment: Comment;
};

export type CommentDeleted = {
  __typename: 'CommentDeleted';
  commentUuid: string;
  entityType: SocialEntityType;
  entityId: string;
};

export type CommentEvent = CommentAdded | CommentUpdated | CommentDeleted;

// ============================================
// Social Event Types (Redis Streams)
// ============================================

export type SocialEventType =
  | 'comment.created'
  | 'comment.reply'
  | 'vote.cast'
  | 'follow.created'
  | 'climb.created'
  | 'ascent.logged'
  | 'proposal.created'
  | 'proposal.voted'
  | 'proposal.approved'
  | 'proposal.rejected';

export type SocialEvent = {
  type: SocialEventType;
  actorId: string;
  entityType: string;
  entityId: string;
  timestamp: number;
  metadata: Record<string, string>;
};

// ============================================
// Comments & Votes Types
// ============================================

export type SocialEntityType =
  | 'playlist_climb'
  | 'climb'
  | 'tick'
  | 'comment'
  | 'proposal'
  | 'board';

export type SortMode = 'new' | 'top' | 'controversial' | 'hot';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export type Comment = {
  uuid: string;
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
  entityType: SocialEntityType;
  entityId: string;
  parentCommentUuid?: string | null;
  body: string | null;
  isDeleted: boolean;
  replyCount: number;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  userVote: number;
  createdAt: string;
  updatedAt: string;
};

export type CommentConnection = {
  comments: Comment[];
  totalCount: number;
  hasMore: boolean;
};

export type VoteSummary = {
  entityType: SocialEntityType;
  entityId: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  userVote: number;
};

export type AddCommentInput = {
  entityType: SocialEntityType;
  entityId: string;
  parentCommentUuid?: string;
  body: string;
};

export type UpdateCommentInput = {
  commentUuid: string;
  body: string;
};

export type VoteInput = {
  entityType: SocialEntityType;
  entityId: string;
  value: number;
};

export type CommentsInput = {
  entityType: SocialEntityType;
  entityId: string;
  parentCommentUuid?: string;
  sortBy?: SortMode;
  timePeriod?: TimePeriod;
  limit?: number;
  offset?: number;
};

export type BulkVoteSummaryInput = {
  entityType: SocialEntityType;
  entityIds: string[];
};

// ============================================
// Community Proposals + Admin Roles Types
// ============================================

export type ProposalType = 'grade' | 'classic' | 'benchmark';
export type ProposalStatus = 'open' | 'approved' | 'rejected' | 'superseded';
export type CommunityRoleType = 'admin' | 'community_leader';

export type Proposal = {
  uuid: string;
  climbUuid: string;
  boardType: string;
  angle?: number | null;
  proposerId: string;
  proposerDisplayName?: string | null;
  proposerAvatarUrl?: string | null;
  type: ProposalType;
  proposedValue: string;
  currentValue: string;
  status: ProposalStatus;
  reason?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  weightedUpvotes: number;
  weightedDownvotes: number;
  requiredUpvotes: number;
  userVote: number;
};

export type ProposalConnection = {
  proposals: Proposal[];
  totalCount: number;
  hasMore: boolean;
};

export type ProposalVoteSummary = {
  weightedUpvotes: number;
  weightedDownvotes: number;
  requiredUpvotes: number;
  isApproved: boolean;
};

export type OutlierAnalysis = {
  isOutlier: boolean;
  currentGrade: number;
  neighborAverage: number;
  neighborCount: number;
  gradeDifference: number;
};

export type ClimbCommunityStatusType = {
  climbUuid: string;
  boardType: string;
  angle: number;
  communityGrade?: string | null;
  isBenchmark: boolean;
  isClassic: boolean;
  isFrozen: boolean;
  freezeReason?: string | null;
  openProposalCount: number;
  outlierAnalysis?: OutlierAnalysis | null;
  updatedAt?: string | null;
};

export type ClimbClassicStatusType = {
  climbUuid: string;
  boardType: string;
  isClassic: boolean;
  updatedAt?: string | null;
};

export type CommunityRoleAssignment = {
  id: number;
  userId: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  role: CommunityRoleType;
  boardType?: string | null;
  grantedBy?: string | null;
  grantedByDisplayName?: string | null;
  createdAt: string;
};

export type CommunitySettingType = {
  id: number;
  scope: string;
  scopeKey: string;
  key: string;
  value: string;
  setBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProposalInput = {
  climbUuid: string;
  boardType: string;
  angle?: number | null;
  type: ProposalType;
  proposedValue: string;
  reason?: string | null;
};

export type VoteOnProposalInput = {
  proposalUuid: string;
  value: number; // +1 or -1
};

export type ResolveProposalInput = {
  proposalUuid: string;
  status: 'approved' | 'rejected';
  reason?: string | null;
};

export type SetterOverrideInput = {
  climbUuid: string;
  boardType: string;
  angle: number;
  communityGrade?: string | null;
  isBenchmark?: boolean | null;
};

export type FreezeClimbInput = {
  climbUuid: string;
  boardType: string;
  frozen: boolean;
  reason?: string | null;
};

export type GrantRoleInput = {
  userId: string;
  role: CommunityRoleType;
  boardType?: string | null;
};

export type RevokeRoleInput = {
  userId: string;
  role: CommunityRoleType;
  boardType?: string | null;
};

export type SetCommunitySettingInput = {
  scope: string;
  scopeKey: string;
  key: string;
  value: string;
};

export type GetClimbProposalsInput = {
  climbUuid: string;
  boardType: string;
  angle?: number | null;
  type?: ProposalType | null;
  status?: ProposalStatus | null;
  limit?: number;
  offset?: number;
};

export type BrowseProposalsInput = {
  boardType?: string | null;
  type?: ProposalType | null;
  status?: ProposalStatus | null;
  limit?: number;
  offset?: number;
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
  | { __typename: 'SessionEnded'; reason: string; newPath?: string };

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
