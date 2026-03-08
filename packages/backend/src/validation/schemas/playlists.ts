import { z } from 'zod';
import { ExternalUUIDSchema, BoardNameSchema } from './primitives';

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
  layoutId: z.number().int().positive().optional(),
});

export const GetPlaylistsForClimbInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  climbUuid: ExternalUUIDSchema,
});

export const GetPlaylistsForClimbsInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  climbUuids: z.array(ExternalUUIDSchema).min(1).max(500),
});

export const GetPlaylistClimbsInputSchema = z.object({
  playlistId: z.string().min(1),
  boardName: BoardNameSchema.optional(),
  layoutId: z.number().int().positive().optional(),
  sizeId: z.number().int().positive().optional(),
  setIds: z.string().min(1).optional(),
  angle: z.number().int().optional(),
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const DiscoverPlaylistsInputSchema = z.object({
  boardType: BoardNameSchema.optional(),
  layoutId: z.number().int().positive().optional(),
  name: z.string().max(100).optional(),
  creatorIds: z.array(z.string().min(1)).optional(),
  sortBy: z.enum(['recent', 'popular']).optional(),
  page: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const GetPlaylistCreatorsInputSchema = z.object({
  boardType: BoardNameSchema,
  layoutId: z.number().int().positive(),
  searchQuery: z.string().max(100).optional(),
});

export const SearchPlaylistsInputSchema = z.object({
  query: z.string().min(1).max(200),
  boardType: BoardNameSchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});
