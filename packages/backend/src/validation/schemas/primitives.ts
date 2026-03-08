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
 * Board name validation schema (kilter, tension, moonboard)
 */
export const BoardNameSchema = z.enum(['kilter', 'tension', 'moonboard'], {
  error: 'Board name must be kilter, tension, or moonboard',
});

/**
 * Slug validation schema
 */
export const SlugSchema = z
  .string()
  .min(1, 'Slug cannot be empty')
  .max(200, 'Slug too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

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
 */
export const QueueItemIdSchema = z.string()
  .min(1, 'Queue item ID cannot be empty')
  .max(100, 'Queue item ID too long');

/**
 * Validate input and throw a user-friendly error if invalid.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown, fieldName?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: { message: string }) => e.message).join(', ');
    throw new Error(`Invalid ${fieldName || 'input'}: ${errors}`);
  }
  return result.data;
}
