import { z } from 'zod';

/**
 * Activity feed input validation schema
 */
export const ActivityFeedInputSchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  boardUuid: z.string().max(100).optional().nullable(),
});

/**
 * Global comment feed input validation schema
 */
export const GlobalCommentFeedInputSchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  boardUuid: z.string().max(100).optional().nullable(),
});

/**
 * Trending/hot climb feed input validation schema
 */
export const TrendingClimbFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  boardUuid: z.string().max(100).optional().nullable(),
  timePeriodDays: z.number().int().min(1).max(90).optional().default(7),
});

/**
 * Grouped notifications query input validation schema
 */
export const GroupedNotificationsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});
