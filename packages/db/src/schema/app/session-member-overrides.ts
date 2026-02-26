import {
  pgTable,
  text,
  bigserial,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { inferredSessions } from './inferred-sessions';

/**
 * Session member overrides table
 *
 * Tracks when a user's ticks are manually reassigned to another user's
 * inferred session. This enables non-destructive undo — when a user is
 * removed from a session, their ticks can be restored to their original
 * inferred session using the previousInferredSessionId on boardsesh_ticks.
 */
export const sessionMemberOverrides = pgTable(
  'session_member_overrides',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    sessionId: text('session_id')
      .notNull()
      .references(() => inferredSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedByUserId: text('added_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => ({
    sessionUserUnique: unique('session_member_overrides_session_user_unique').on(
      table.sessionId,
      table.userId,
    ),
    sessionIdx: index('session_member_overrides_session_idx').on(table.sessionId),
    userIdx: index('session_member_overrides_user_idx').on(table.userId),
  }),
);

export type SessionMemberOverride = typeof sessionMemberOverrides.$inferSelect;
export type NewSessionMemberOverride = typeof sessionMemberOverrides.$inferInsert;
