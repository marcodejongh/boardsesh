import { pgTable, bigserial, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../auth/users';

export const userFollows = pgTable('user_follows', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  followerId: text('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: text('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex('unique_user_follow').on(table.followerId, table.followingId),
  followerIdx: index('user_follows_follower_idx').on(table.followerId),
  followingIdx: index('user_follows_following_idx').on(table.followingId),
  noSelfFollow: check('no_self_follow', sql`${table.followerId} != ${table.followingId}`),
}));

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;
