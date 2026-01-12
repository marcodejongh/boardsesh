import {
  pgTable,
  text,
  integer,
  timestamp,
  bigserial,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

/**
 * Hold type enum
 * Based on common climbing hold classifications
 */
export const holdTypeEnum = pgEnum('hold_type', [
  'jug',
  'sloper',
  'pinch',
  'crimp',
  'pocket',
]);

/**
 * User hold classifications table
 * Stores user-specific ratings and classifications for individual holds on the board
 * Used for personalized climb recommendations based on hold preferences
 */
export const userHoldClassifications = pgTable(
  'user_hold_classifications',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    boardType: text('board_type').notNull(), // 'kilter' or 'tension'
    layoutId: integer('layout_id').notNull(),
    sizeId: integer('size_id').notNull(),
    holdId: integer('hold_id').notNull(), // References board_holes.id

    // Classification data
    holdType: holdTypeEnum('hold_type'), // User's classification of the hold type
    handRating: integer('hand_rating'), // 1-5 rating for how hard the hold is for hands
    footRating: integer('foot_rating'), // 1-5 rating for how hard the hold is for feet
    pullDirection: integer('pull_direction'), // 0-360 degrees direction of pull (0=up, 90=right, 180=down, 270=left)

    // Timestamps
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => ({
    // Index for efficient user classification queries
    userBoardIdx: index('user_hold_classifications_user_board_idx').on(
      table.userId,
      table.boardType,
      table.layoutId,
      table.sizeId
    ),
    // Unique constraint: one classification per user per hold per board configuration
    uniqueClassification: uniqueIndex('user_hold_classifications_unique_idx').on(
      table.userId,
      table.boardType,
      table.layoutId,
      table.sizeId,
      table.holdId
    ),
    // Index for hold lookups
    holdIdx: index('user_hold_classifications_hold_idx').on(
      table.boardType,
      table.holdId
    ),
  })
);

// Type exports
export type UserHoldClassification = typeof userHoldClassifications.$inferSelect;
export type NewUserHoldClassification = typeof userHoldClassifications.$inferInsert;
export type HoldType = 'jug' | 'sloper' | 'pinch' | 'crimp' | 'pocket';
