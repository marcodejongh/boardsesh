import { z } from 'zod';
import { BoardPathSchema, SessionIdSchema, SessionNameSchema, LatitudeSchema, LongitudeSchema } from './primitives';

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
