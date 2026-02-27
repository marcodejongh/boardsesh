import { z } from 'zod';

/**
 * UUID validation schema
 */
export const UUIDSchema = z.string().uuid('Invalid UUID format');

/**
 * External UUID schema for Aurora API climb UUIDs (non-standard format without dashes)
 */
export const ExternalUUIDSchema = z.string().min(1, 'UUID cannot be empty').max(50, 'UUID too long');

/**
 * Session ID validation schema
 * Allows UUIDs and alphanumeric strings with hyphens (for testing and backwards compatibility)
 */
export const SessionIdSchema = z.string()
  .min(1, 'Session ID cannot be empty')
  .max(100, 'Session ID too long')
  .regex(/^[a-zA-Z0-9-]+$/, 'Session ID must be alphanumeric with hyphens only');

/**
 * GPS coordinate validation schemas
 */
export const LatitudeSchema = z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90');
export const LongitudeSchema = z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180');

export const GPSCoordinatesSchema = z.object({
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
});

/**
 * Username validation schema
 */
export const UsernameSchema = z.string().min(1, 'Username cannot be empty').max(50, 'Username too long');

/**
 * Board path validation schema
 */
export const BoardPathSchema = z.string().min(1, 'Board path cannot be empty').max(200, 'Board path too long');

/**
 * Session name validation schema
 */
export const SessionNameSchema = z.string().max(100, 'Session name too long').optional();

/**
 * Avatar URL validation schema
 */
export const AvatarUrlSchema = z.string()
  .max(500, 'Avatar URL too long')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'),
    'Avatar URL must use http(s) or be a relative path'
  )
  .optional();

/**
 * Create session input validation schema
 */
export const CreateSessionInputSchema = z.object({
  boardPath: BoardPathSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  name: SessionNameSchema,
  discoverable: z.boolean(),
  goal: z.string().max(500, 'Goal too long').optional(),
  isPermanent: z.boolean().optional(),
  boardIds: z.array(z.number().int().positive()).max(20).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
});

/**
 * End session input validation schema
 */
export const EndSessionInputSchema = z.object({
  sessionId: SessionIdSchema,
});

/**
 * Session summary input validation schema
 */
export const SessionSummaryInputSchema = z.object({
  sessionId: SessionIdSchema,
});

/**
 * Climb validation schema (simplified for input)
 * Note: Several fields are made optional/nullable to handle edge cases in real climb data
 */
export const ClimbInputSchema = z.object({
  uuid: ExternalUUIDSchema, // Aurora API uses non-standard UUID format (no dashes)
  setter_username: z.string().max(100).nullish().transform(v => v ?? ''),
  name: z.string().max(200).nullish().transform(v => v ?? ''),
  description: z.string().max(2000).nullish().transform(v => v ?? ''),
  frames: z.string().max(10000).nullish().transform(v => v ?? ''),
  angle: z.number().min(0).max(90),
  ascensionist_count: z.number().min(0).nullish().transform(v => v ?? 0),
  difficulty: z.string().max(50).nullish().transform(v => v ?? ''),
  quality_average: z.string().max(20).nullish().transform(v => v ?? ''),
  stars: z.number().min(0).max(15).nullish().transform(v => v ?? 0),
  difficulty_error: z.string().max(50).nullish().transform(v => v ?? ''),
  litUpHoldsMap: z.record(z.any()).nullish().transform(v => v ?? {}), // JSON object
  mirrored: z.boolean().nullish(),
  benchmark_difficulty: z.string().max(50).nullish(),
  userAscents: z.number().min(0).nullish(),
  userAttempts: z.number().min(0).nullish(),
});

/**
 * Queue item user validation schema
 */
export const QueueItemUserSchema = z.object({
  id: z.string().max(100),
  username: z.string().max(100),
  avatarUrl: z.string().max(500).nullish(), // Can be null or undefined
});

/**
 * ClimbQueueItem validation schema
 */
export const ClimbQueueItemSchema = z.object({
  uuid: UUIDSchema,
  climb: ClimbInputSchema,
  addedBy: z.string().max(100).nullish(),
  addedByUser: QueueItemUserSchema.nullish(),
  tickedBy: z.array(z.string()).max(100).nullish(),
  suggested: z.boolean().nullish(),
});

/**
 * Queue array validation schema (with size limit)
 */
export const QueueArraySchema = z.array(ClimbQueueItemSchema).max(500, 'Queue too large');

/**
 * Radius validation schema (for nearby sessions)
 */
export const RadiusMetersSchema = z.number().min(100, 'Radius too small').max(50000, 'Radius too large').optional();

/**
 * Queue index validation schema (for reorder operations)
 */
export const QueueIndexSchema = z.number().int('Index must be an integer').min(0, 'Index cannot be negative');

/**
 * Queue item identifier schema (for remove/reorder operations)
 * More permissive than UUIDSchema to allow for test identifiers and backwards compatibility
 */
export const QueueItemIdSchema = z.string()
  .min(1, 'Queue item ID cannot be empty')
  .max(100, 'Queue item ID too long');

/**
 * Validate input and throw a user-friendly error if invalid.
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param fieldName - Optional field name for error messages
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown, fieldName?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ');
    throw new Error(`Invalid ${fieldName || 'input'}: ${errors}`);
  }
  return result.data;
}

// ============================================
// Board Configuration Schemas
// ============================================

/**
 * Board name validation schema (kilter, tension, moonboard)
 */
export const BoardNameSchema = z.enum(['kilter', 'tension', 'moonboard'], {
  errorMap: () => ({ message: 'Board name must be kilter, tension, or moonboard' }),
});

// ============================================
// Climb Search Schemas
// ============================================

/**
 * Climb search input validation schema
 */
export const ClimbSearchInputSchema = z.object({
  boardName: BoardNameSchema,
  layoutId: z.number().int().positive('Layout ID must be positive'),
  sizeId: z.number().int().positive('Size ID must be positive'),
  setIds: z.string().min(1, 'Set IDs cannot be empty'),
  angle: z.number().int(),
  // Pagination
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100, 'Page size cannot exceed 100').optional(),
  // Filters
  gradeAccuracy: z.string().optional(),
  minGrade: z.number().int().optional(),
  maxGrade: z.number().int().optional(),
  minAscents: z.number().int().min(0).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  name: z.string().max(200).optional(),
  setter: z.array(z.string().max(100)).optional(),
  setterId: z.number().int().optional(),
  onlyBenchmarks: z.boolean().optional(),
  onlyTallClimbs: z.boolean().optional(),
  // Accept all HoldState values for future UI implementations (currently only 'ANY' and 'NOT' are used)
  holdsFilter: z.record(z.enum(['OFF', 'STARTING', 'FINISH', 'HAND', 'FOOT', 'ANY', 'NOT'])).optional(),
  // Personal progress filters
  hideAttempted: z.boolean().optional(),
  hideCompleted: z.boolean().optional(),
  showOnlyAttempted: z.boolean().optional(),
  showOnlyCompleted: z.boolean().optional(),
});

// ============================================
// User Management Schemas
// ============================================

/**
 * Update profile input validation schema
 */
export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

/**
 * Save Aurora credential input validation schema
 */
export const SaveAuroraCredentialInputSchema = z.object({
  boardType: BoardNameSchema,
  username: z.string().min(1, 'Username cannot be empty').max(100),
  password: z.string().min(1, 'Password cannot be empty').max(100),
});

// ============================================
// New Climb Feed & Subscriptions Schemas
// ============================================

export const NewClimbSubscriptionInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive('Layout ID must be positive'),
});

export const NewClimbFeedInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive('Layout ID must be positive'),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const SaveClimbInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive('Layout ID must be positive'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  isDraft: z.boolean(),
  frames: z.string().min(1).max(10000),
  framesCount: z.number().int().min(1).optional(),
  framesPace: z.number().int().min(0).optional(),
  angle: z.number().int().min(0).max(90),
});

export const SaveMoonBoardClimbInputSchema = z.object({
  boardType: z.literal('moonboard'),
  layoutId: z.number().int().positive('Layout ID must be positive'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  holds: z.object({
    start: z.array(z.string()).default([]),
    hand: z.array(z.string()).default([]),
    finish: z.array(z.string()).default([]),
  }),
  angle: z.number().int().min(0).max(90),
  isDraft: z.boolean().optional(),
  userGrade: z.string().max(20).optional(),
  isBenchmark: z.boolean().optional(),
  setter: z.string().max(100).optional(),
});

// ============================================
// Favorites Schemas
// ============================================

/**
 * Toggle favorite input validation schema
 */
export const ToggleFavoriteInputSchema = z.object({
  boardName: BoardNameSchema,
  climbUuid: ExternalUUIDSchema, // Aurora API uses non-standard UUID format
  angle: z.number().int(),
});

// ============================================
// Ticks Schemas
// ============================================

/**
 * Tick status validation schema
 */
export const TickStatusSchema = z.enum(['flash', 'send', 'attempt'], {
  errorMap: () => ({ message: 'Status must be flash, send, or attempt' }),
});

/**
 * Save tick input validation schema
 */
export const SaveTickInputSchema = z.object({
  boardType: BoardNameSchema,
  climbUuid: ExternalUUIDSchema, // Aurora API uses non-standard UUID format
  angle: z.number().int().min(0).max(90),
  isMirror: z.boolean(),
  status: TickStatusSchema,
  attemptCount: z.number().int().min(1).max(999),
  quality: z.number().int().min(1).max(5).optional().nullable(),
  difficulty: z.number().int().optional().nullable(),
  isBenchmark: z.boolean(),
  comment: z.string().max(2000),
  climbedAt: z.string(), // ISO date string
  sessionId: z.string().optional(),
  // Board resolution fields (optional, for associating ticks with board entities)
  layoutId: z.number().int().positive().optional(),
  sizeId: z.number().int().positive().optional(),
  setIds: z.string().min(1).optional(),
}).refine(
  (data) => {
    // Flash must have attemptCount of 1
    if (data.status === 'flash' && data.attemptCount !== 1) {
      return false;
    }
    // Send must have attemptCount > 1
    if (data.status === 'send' && data.attemptCount <= 1) {
      return false;
    }
    return true;
  },
  {
    message: 'Flash requires attemptCount of 1, send requires attemptCount > 1',
    path: ['attemptCount']
  }
).refine(
  (data) => {
    // Attempts should not have quality ratings
    if (data.status === 'attempt' && data.quality !== undefined && data.quality !== null) {
      return false;
    }
    return true;
  },
  {
    message: 'Attempts cannot have quality ratings',
    path: ['quality']
  }
);

/**
 * Get ticks input validation schema
 */
export const GetTicksInputSchema = z.object({
  boardType: BoardNameSchema,
  climbUuids: z.array(ExternalUUIDSchema).optional(),
});

/**
 * Ascent feed input validation schema
 */
export const AscentFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Playlist validation schemas
 */
export const PlaylistNameSchema = z
  .string()
  .min(1, 'Playlist name cannot be empty')
  .max(100, 'Playlist name too long');

export const PlaylistDescriptionSchema = z
  .string()
  .max(500, 'Playlist description too long')
  .optional();

export const PlaylistColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (must be hex)')
  .optional();

export const PlaylistIconSchema = z
  .string()
  .max(50, 'Icon name too long')
  .optional();

export const CreatePlaylistInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  name: PlaylistNameSchema,
  description: PlaylistDescriptionSchema,
  color: PlaylistColorSchema,
  icon: PlaylistIconSchema,
});

export const UpdatePlaylistInputSchema = z.object({
  playlistId: z.string().min(1),
  name: PlaylistNameSchema.optional(),
  description: PlaylistDescriptionSchema,
  isPublic: z.boolean().optional(),
  color: PlaylistColorSchema,
  icon: PlaylistIconSchema,
});

export const AddClimbToPlaylistInputSchema = z.object({
  playlistId: z.string().min(1),
  climbUuid: ExternalUUIDSchema,
  angle: z.number().int().min(0).max(90),
});

export const RemoveClimbFromPlaylistInputSchema = z.object({
  playlistId: z.string().min(1),
  climbUuid: ExternalUUIDSchema,
});

export const GetUserPlaylistsInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
});

export const GetAllUserPlaylistsInputSchema = z.object({
  boardType: BoardNameSchema.optional(),
});

export const GetPlaylistsForClimbInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  climbUuid: ExternalUUIDSchema,
});

export const GetPlaylistClimbsInputSchema = z.object({
  playlistId: z.string().min(1),
  boardName: BoardNameSchema,
  layoutId: z.number().int().positive(),
  sizeId: z.number().int().positive(),
  setIds: z.string().min(1),
  angle: z.number().int(),
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Get user favorite climbs input validation schema
 */
export const GetUserFavoriteClimbsInputSchema = z.object({
  boardName: BoardNameSchema,
  layoutId: z.number().int().positive(),
  sizeId: z.number().int().positive(),
  setIds: z.string().min(1),
  angle: z.number().int(),
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Discover playlists input validation schema
 */
export const DiscoverPlaylistsInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  // Optional filters
  name: z.string().max(100).optional(),
  creatorIds: z.array(z.string().min(1)).optional(),
  // Sort
  sortBy: z.enum(['recent', 'popular']).optional(),
  // Pagination
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

/**
 * Get playlist creators input validation schema
 */
export const GetPlaylistCreatorsInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  searchQuery: z.string().max(100).optional(),
});

// ============================================
// Social / Follow Schemas
// ============================================

/**
 * Follow input validation schema
 */
export const FollowInputSchema = z.object({
  userId: z.string().min(1, 'User ID cannot be empty'),
});

/**
 * Follow list input validation schema
 */
export const FollowListInputSchema = z.object({
  userId: z.string().min(1, 'User ID cannot be empty'),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Search users input validation schema
 */
export const SearchUsersInputSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters').max(100),
  boardType: BoardNameSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Follow setter input validation schema
 */
export const FollowSetterInputSchema = z.object({
  setterUsername: z.string().min(1, 'Setter username cannot be empty').max(100),
});

/**
 * Setter profile input validation schema
 */
export const SetterProfileInputSchema = z.object({
  username: z.string().min(1, 'Username cannot be empty').max(100),
});

/**
 * Setter climbs input validation schema
 */
export const SetterClimbsInputSchema = z.object({
  username: z.string().min(1, 'Username cannot be empty').max(100),
  boardType: BoardNameSchema.optional(),
  layoutId: z.number().int().positive().optional(),
  sortBy: z.enum(['popular', 'new']).optional().default('popular'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Setter climbs full input validation schema (with litUpHoldsMap for thumbnails)
 */
export const SetterClimbsFullInputSchema = z.object({
  username: z.string().min(1, 'Username cannot be empty').max(100),
  boardType: BoardNameSchema.optional(),
  layoutId: z.number().int().positive().optional(),
  sizeId: z.number().int().positive().optional(),
  setIds: z.string().optional(),
  angle: z.number().int().optional(),
  sortBy: z.enum(['popular', 'new']).optional().default('popular'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Following ascents feed input validation schema
 */
export const FollowingAscentsFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Comments & Votes Schemas
// ============================================

/**
 * Social entity type validation schema
 */
export const SocialEntityTypeSchema = z.enum([
  'playlist_climb',
  'climb',
  'tick',
  'comment',
  'proposal',
  'board',
  'gym',
  'session',
]);

/**
 * Sort mode validation schema
 */
export const SortModeSchema = z.enum(['new', 'top', 'controversial', 'hot']);

/**
 * Time period validation schema
 */
export const TimePeriodSchema = z.enum(['hour', 'day', 'week', 'month', 'year', 'all']);

/**
 * Add comment input validation schema
 */
export const AddCommentInputSchema = z.object({
  entityType: SocialEntityTypeSchema,
  entityId: z.string().min(1, 'Entity ID cannot be empty').max(200, 'Entity ID too long'),
  parentCommentUuid: UUIDSchema.optional(),
  body: z.string().min(1, 'Comment body cannot be empty').max(2000, 'Comment body too long'),
});

/**
 * Update comment input validation schema
 */
export const UpdateCommentInputSchema = z.object({
  commentUuid: UUIDSchema,
  body: z.string().min(1, 'Comment body cannot be empty').max(2000, 'Comment body too long'),
});

/**
 * Vote input validation schema
 */
export const VoteInputSchema = z.object({
  entityType: SocialEntityTypeSchema,
  entityId: z.string().min(1, 'Entity ID cannot be empty').max(200, 'Entity ID too long'),
  value: z.number().int().refine((v) => v === 1 || v === -1, {
    message: 'Vote value must be +1 or -1',
  }),
});

/**
 * Comments query input validation schema
 */
export const CommentsInputSchema = z.object({
  entityType: SocialEntityTypeSchema,
  entityId: z.string().min(1).max(200),
  parentCommentUuid: UUIDSchema.optional(),
  sortBy: SortModeSchema.optional().default('new'),
  timePeriod: TimePeriodSchema.optional().default('all'),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Bulk vote summary input validation schema
 */
export const BulkVoteSummaryInputSchema = z.object({
  entityType: SocialEntityTypeSchema,
  entityIds: z.array(z.string().min(1).max(200)).min(1).max(100),
});

// ============================================
// Activity Feed Schemas
// ============================================

/**
 * Activity feed input validation schema
 */
export const ActivityFeedInputSchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  boardUuid: z.string().max(100).optional().nullable(),
  // sortBy and topPeriod are kept for backward compatibility with deprecated
  // activityFeed/trendingFeed resolvers. sessionGroupedFeed ignores them.
  sortBy: SortModeSchema.optional().default('new'),
  topPeriod: TimePeriodSchema.optional().default('all'),
});

/**
 * Global comment feed input validation schema
 */
export const GlobalCommentFeedInputSchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  boardUuid: z.string().max(100).optional().nullable(),
});

// ============================================
// Notification Schemas
// ============================================

/**
 * Grouped notifications query input validation schema
 */
export const GroupedNotificationsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Community Proposals + Admin Roles Schemas
// ============================================

/**
 * Proposal type validation schema
 */
export const ProposalTypeSchema = z.enum(['grade', 'classic', 'benchmark']);

/**
 * Proposal status validation schema
 */
export const ProposalStatusSchema = z.enum(['open', 'approved', 'rejected', 'superseded']);

/**
 * Community role type validation schema
 */
export const CommunityRoleTypeSchema = z.enum(['admin', 'community_leader']);

/**
 * Create proposal input validation schema
 */
export const CreateProposalInputSchema = z.object({
  climbUuid: ExternalUUIDSchema,
  boardType: BoardNameSchema,
  angle: z.number().int().min(0).max(90).optional().nullable(),
  type: ProposalTypeSchema,
  proposedValue: z.string().min(1, 'Proposed value cannot be empty').max(100),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * Vote on proposal input validation schema
 */
export const VoteOnProposalInputSchema = z.object({
  proposalUuid: UUIDSchema,
  value: z.number().int().refine((v) => v === 1 || v === -1, {
    message: 'Vote value must be +1 or -1',
  }),
});

/**
 * Resolve proposal input validation schema
 */
export const ResolveProposalInputSchema = z.object({
  proposalUuid: UUIDSchema,
  status: z.enum(['approved', 'rejected']),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * Delete proposal input validation schema
 */
export const DeleteProposalInputSchema = z.object({
  proposalUuid: UUIDSchema,
});

/**
 * Setter override input validation schema
 */
export const SetterOverrideInputSchema = z.object({
  climbUuid: ExternalUUIDSchema,
  boardType: BoardNameSchema,
  angle: z.number().int().min(0).max(90),
  communityGrade: z.string().max(100).optional().nullable(),
  isBenchmark: z.boolean().optional().nullable(),
});

/**
 * Freeze climb input validation schema
 */
export const FreezeClimbInputSchema = z.object({
  climbUuid: ExternalUUIDSchema,
  boardType: BoardNameSchema,
  frozen: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * Grant role input validation schema
 */
export const GrantRoleInputSchema = z.object({
  userId: z.string().min(1, 'User ID cannot be empty'),
  role: CommunityRoleTypeSchema,
  boardType: BoardNameSchema.optional().nullable(),
});

/**
 * Revoke role input validation schema
 */
export const RevokeRoleInputSchema = z.object({
  userId: z.string().min(1, 'User ID cannot be empty'),
  role: CommunityRoleTypeSchema,
  boardType: BoardNameSchema.optional().nullable(),
});

/**
 * Set community setting input validation schema
 */
export const SetCommunitySettingInputSchema = z.object({
  scope: z.enum(['global', 'board', 'climb']),
  scopeKey: z.string().max(200),
  key: z.string().min(1).max(100),
  value: z.string().max(1000),
});

/**
 * Get climb proposals input validation schema
 */
export const GetClimbProposalsInputSchema = z.object({
  climbUuid: ExternalUUIDSchema,
  boardType: BoardNameSchema,
  angle: z.number().int().min(0).max(90).optional().nullable(),
  type: ProposalTypeSchema.optional().nullable(),
  status: ProposalStatusSchema.optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Browse proposals input validation schema
 */
export const BrowseProposalsInputSchema = z.object({
  boardType: BoardNameSchema.optional().nullable(),
  boardUuid: z.string().max(100).optional().nullable(),
  type: ProposalTypeSchema.optional().nullable(),
  status: ProposalStatusSchema.optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Board Entity Schemas
// ============================================

/**
 * Slug validation schema
 */
export const SlugSchema = z
  .string()
  .min(1, 'Slug cannot be empty')
  .max(200, 'Slug too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

/**
 * Create board input validation schema
 */
export const CreateBoardInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive('Layout ID must be positive'),
  sizeId: z.number().int().positive('Size ID must be positive'),
  setIds: z.string().min(1, 'Set IDs cannot be empty'),
  name: z.string().min(1, 'Board name cannot be empty').max(100, 'Board name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  locationName: z.string().max(200, 'Location name too long').optional(),
  latitude: LatitudeSchema.optional(),
  longitude: LongitudeSchema.optional(),
  isPublic: z.boolean().optional(),
  isOwned: z.boolean().optional(),
  gymUuid: UUIDSchema.optional(),
  angle: z.number().int().min(0).max(70).optional(),
  isAngleAdjustable: z.boolean().optional(),
});

/**
 * Update board input validation schema
 */
export const UpdateBoardInputSchema = z.object({
  boardUuid: UUIDSchema,
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  locationName: z.string().max(200).optional().nullable(),
  latitude: LatitudeSchema.optional().nullable(),
  longitude: LongitudeSchema.optional().nullable(),
  isPublic: z.boolean().optional(),
  isOwned: z.boolean().optional(),
  angle: z.number().int().min(0).max(70).optional(),
  isAngleAdjustable: z.boolean().optional(),
});

/**
 * Board leaderboard input validation schema
 */
export const BoardLeaderboardInputSchema = z.object({
  boardUuid: UUIDSchema,
  period: z.enum(['week', 'month', 'year', 'all']).optional().default('all'),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * My boards input validation schema
 */
export const MyBoardsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Follow board input validation schema
 */
export const FollowBoardInputSchema = z.object({
  boardUuid: UUIDSchema,
});

/**
 * Search boards input validation schema
 */
export const SearchBoardsInputSchema = z.object({
  query: z.string().max(200).optional(),
  boardType: BoardNameSchema.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0.1).max(500).optional().default(50),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================
// Gym Entity Schemas
// ============================================

/**
 * Gym member role validation schema
 */
export const GymMemberRoleSchema = z.enum(['admin', 'member']);

/**
 * Create gym input validation schema
 */
export const CreateGymInputSchema = z.object({
  name: z.string().min(1, 'Gym name cannot be empty').max(100, 'Gym name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  address: z.string().max(300, 'Address too long').optional(),
  contactEmail: z.string().email('Invalid email').max(200).optional(),
  contactPhone: z.string().max(30, 'Phone number too long').optional(),
  latitude: LatitudeSchema.optional(),
  longitude: LongitudeSchema.optional(),
  isPublic: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional(),
  boardUuid: UUIDSchema.optional(),
});

/**
 * Update gym input validation schema
 */
export const UpdateGymInputSchema = z.object({
  gymUuid: UUIDSchema,
  name: z.string().min(1).max(100).optional(),
  slug: SlugSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  contactEmail: z.string().email().max(200).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  latitude: LatitudeSchema.optional().nullable(),
  longitude: LongitudeSchema.optional().nullable(),
  isPublic: z.boolean().optional(),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

/**
 * Add gym member input validation schema
 */
export const AddGymMemberInputSchema = z.object({
  gymUuid: UUIDSchema,
  userId: z.string().min(1, 'User ID cannot be empty'),
  role: GymMemberRoleSchema,
});

/**
 * Remove gym member input validation schema
 */
export const RemoveGymMemberInputSchema = z.object({
  gymUuid: UUIDSchema,
  userId: z.string().min(1, 'User ID cannot be empty'),
});

/**
 * Follow gym input validation schema
 */
export const FollowGymInputSchema = z.object({
  gymUuid: UUIDSchema,
});

/**
 * My gyms input validation schema
 */
export const MyGymsInputSchema = z.object({
  includeFollowed: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Search gyms input validation schema
 */
export const SearchGymsInputSchema = z.object({
  query: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(0.1).max(500).optional().default(50),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Gym members input validation schema
 */
export const GymMembersInputSchema = z.object({
  gymUuid: UUIDSchema,
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Link board to gym input validation schema
 */
export const LinkBoardToGymInputSchema = z.object({
  boardUuid: UUIDSchema,
  gymUuid: UUIDSchema.optional().nullable(),
});

/**
 * Search playlists input validation schema
 */
export const SearchPlaylistsInputSchema = z.object({
  query: z.string().min(1).max(200),
  boardType: BoardNameSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});
