import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.js';

/**
 * Playlists - User-created collections of climbs
 * Scoped to boardType + layoutId (can contain climbs from different sizes)
 */
export const playlists = pgTable(
  'playlists',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    uuid: text('uuid').notNull().unique(),
    boardType: text('board_type').notNull(), // 'kilter' | 'tension'
    layoutId: integer('layout_id').notNull(),

    // Metadata
    name: text('name').notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false).notNull(),
    color: text('color'), // Hex color (e.g., '#06B6D4')
    icon: text('icon'), // Ant Design icon name (e.g., 'StarOutlined')

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Index for efficient lookup by board + layout
    boardLayoutIdx: index('playlists_board_layout_idx').on(
      table.boardType,
      table.layoutId
    ),
    // Index for UUID lookups
    uuidIdx: index('playlists_uuid_idx').on(table.uuid),
    // Index for ordering by updatedAt (used in userPlaylists query)
    updatedAtIdx: index('playlists_updated_at_idx').on(table.updatedAt),
  })
);

/**
 * Playlist Climbs - Junction table for climbs in playlists
 */
export const playlistClimbs = pgTable(
  'playlist_climbs',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    playlistId: bigint('playlist_id', { mode: 'bigint' })
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    climbUuid: text('climb_uuid').notNull(), // Aurora climb UUID
    angle: integer('angle').notNull(),

    // Position for manual ordering within playlist
    position: integer('position').notNull().default(0),

    // Timestamps
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => ({
    // Ensure unique climb per playlist
    uniquePlaylistClimb: uniqueIndex('unique_playlist_climb').on(
      table.playlistId,
      table.climbUuid
    ),
    // Index for efficient lookup of playlists containing a climb
    climbIdx: index('playlist_climbs_climb_idx').on(table.climbUuid),
    // Index for ordered retrieval
    playlistPositionIdx: index('playlist_climbs_position_idx').on(
      table.playlistId,
      table.position
    ),
  })
);

/**
 * Playlist Ownership - Separate ownership for future collaboration
 */
export const playlistOwnership = pgTable(
  'playlist_ownership',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    playlistId: bigint('playlist_id', { mode: 'bigint' })
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Role for future collaboration features
    role: text('role').notNull().default('owner'), // 'owner' | 'editor' | 'viewer'

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Ensure unique user-playlist ownership
    uniqueOwnership: uniqueIndex('unique_playlist_ownership').on(
      table.playlistId,
      table.userId
    ),
    // Index for efficient user playlist queries
    userIdx: index('playlist_ownership_user_idx').on(table.userId),
  })
);

// Type exports for use in application code
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
export type PlaylistClimb = typeof playlistClimbs.$inferSelect;
export type NewPlaylistClimb = typeof playlistClimbs.$inferInsert;
export type PlaylistOwnership = typeof playlistOwnership.$inferSelect;
export type NewPlaylistOwnership = typeof playlistOwnership.$inferInsert;
