import { pgTable, bigserial, text, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const newClimbSubscriptions = pgTable('new_climb_subscriptions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  boardType: text('board_type').notNull(),
  layoutId: integer('layout_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserBoardLayout: uniqueIndex('new_climb_subscriptions_unique_user_board_layout').on(
    table.userId,
    table.boardType,
    table.layoutId,
  ),
  userIdx: index('new_climb_subscriptions_user_idx').on(table.userId),
  boardLayoutIdx: index('new_climb_subscriptions_board_layout_idx').on(table.boardType, table.layoutId),
}));

export type NewClimbSubscription = typeof newClimbSubscriptions.$inferSelect;
export type NewNewClimbSubscription = typeof newClimbSubscriptions.$inferInsert;
