import { z } from 'zod';
import { UUIDSchema, BoardNameSchema, LatitudeSchema, LongitudeSchema, SlugSchema } from './primitives';

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
