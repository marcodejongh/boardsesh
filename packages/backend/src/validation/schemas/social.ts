import { z } from 'zod';
import { BoardNameSchema } from './primitives';

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
 * Follow playlist input validation schema
 */
export const FollowPlaylistInputSchema = z.object({
  playlistUuid: z.string().min(1, 'Playlist UUID cannot be empty'),
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

/**
 * New climb feed schemas
 */
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
