import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  timestamp,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../auth/users';

/**
 * User boards table — represents a named physical board installation
 * (board type + layout + size + hold sets) with metadata.
 */
export const userBoards = pgTable(
  'user_boards',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: text('uuid').notNull().unique(),
    slug: text('slug').notNull(),
    ownerId: text('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    boardType: text('board_type').notNull(),
    layoutId: bigint('layout_id', { mode: 'number' }).notNull(),
    sizeId: bigint('size_id', { mode: 'number' }).notNull(),
    setIds: text('set_ids').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    locationName: text('location_name'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isPublic: boolean('is_public').default(true).notNull(),
    isOwned: boolean('is_owned').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Unique partial: one active board per owner per config
    uniqueOwnerConfigIdx: uniqueIndex('user_boards_unique_owner_config')
      .on(table.ownerId, table.boardType, table.layoutId, table.sizeId, table.setIds)
      .where(sql`${table.deletedAt} IS NULL`),
    // Owner's owned boards
    ownerOwnedIdx: index('user_boards_owner_owned_idx')
      .on(table.ownerId, table.isOwned)
      .where(sql`${table.deletedAt} IS NULL`),
    // Public boards for discovery
    publicBoardsIdx: index('user_boards_public_idx')
      .on(table.boardType, table.layoutId, table.isPublic)
      .where(sql`${table.deletedAt} IS NULL`),
    // Unique slug for URL routing
    uniqueSlugIdx: uniqueIndex('user_boards_unique_slug')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    // UUID lookup
    uuidIdx: index('user_boards_uuid_idx').on(table.uuid),
  })
);

/**
 * Board follows table — tracks which users follow which boards.
 */
export const boardFollows = pgTable(
  'board_follows',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    boardUuid: text('board_uuid')
      .references(() => userBoards.uuid, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserBoard: uniqueIndex('board_follows_unique_user_board').on(
      table.userId,
      table.boardUuid
    ),
    userIdx: index('board_follows_user_idx').on(table.userId),
    boardUuidIdx: index('board_follows_board_uuid_idx').on(table.boardUuid),
  })
);

// Type exports
export type UserBoard = typeof userBoards.$inferSelect;
export type NewUserBoard = typeof userBoards.$inferInsert;
export type BoardFollow = typeof boardFollows.$inferSelect;
export type NewBoardFollow = typeof boardFollows.$inferInsert;
