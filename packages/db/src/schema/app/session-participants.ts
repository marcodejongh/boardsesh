import { pgTable, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { boardSessions } from './sessions';
import { users } from '../auth/users';

// Tracks which authenticated users have participated in a session.
// One row per (session, user) — permanent historical record, never deleted on disconnect.
export const boardSessionParticipants = pgTable('board_session_participants', {
  sessionId: text('session_id')
    .references(() => boardSessions.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSessionUser: uniqueIndex('board_session_participants_session_user_idx').on(table.sessionId, table.userId),
  sessionIdx: index('board_session_participants_session_idx').on(table.sessionId),
  userIdx: index('board_session_participants_user_idx').on(table.userId),
}));

export type BoardSessionParticipant = typeof boardSessionParticipants.$inferSelect;
export type NewBoardSessionParticipant = typeof boardSessionParticipants.$inferInsert;
