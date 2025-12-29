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
export const AvatarUrlSchema = z.string().max(500, 'Avatar URL too long').optional();

/**
 * Create session input validation schema
 */
export const CreateSessionInputSchema = z.object({
  boardPath: BoardPathSchema,
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
  name: SessionNameSchema,
  discoverable: z.boolean(),
});

/**
 * Climb validation schema (simplified for input)
 */
export const ClimbInputSchema = z.object({
  uuid: ExternalUUIDSchema, // Aurora API uses non-standard UUID format (no dashes)
  setter_username: z.string().max(100),
  name: z.string().max(200),
  description: z.string().max(2000),
  frames: z.string().max(10000),
  angle: z.number().min(0).max(90),
  ascensionist_count: z.number().min(0),
  difficulty: z.string().max(50),
  quality_average: z.string().max(20),
  stars: z.number().min(0).max(15),
  difficulty_error: z.string().max(50),
  litUpHoldsMap: z.record(z.any()), // JSON object
  mirrored: z.boolean().nullish(),
  benchmark_difficulty: z.string().max(50).nullable().optional(),
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
  addedBy: z.string().max(100).optional(),
  addedByUser: QueueItemUserSchema.optional(),
  tickedBy: z.array(z.string()).max(100).nullish(),
  suggested: z.boolean().optional(),
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
 * Board name validation schema (kilter, tension, decoy)
 */
export const BoardNameSchema = z.enum(['kilter', 'tension', 'decoy'], {
  errorMap: () => ({ message: 'Board name must be kilter, tension, or decoy' }),
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
