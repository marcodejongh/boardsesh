import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

/**
 * Inferred sessions table
 *
 * Materializes inferred climbing sessions for ticks that don't belong to
 * an explicit party-mode session. Sessions are inferred per-user using a
 * 4-hour gap heuristic between ticks. Cross-board ticks (e.g. Kilter then
 * Tension in the same gym visit) are grouped into the same session.
 *
 * Uses deterministic UUIDv5 IDs based on (userId, firstTickTimestamp) so
 * the same ticks always produce the same session ID, enabling stable
 * entity references for votes and comments.
 */
export const inferredSessions = pgTable(
  'inferred_sessions',
  {
    id: text('id').primaryKey(), // Deterministic UUIDv5
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstTickAt: timestamp('first_tick_at', { mode: 'string' }).notNull(),
    lastTickAt: timestamp('last_tick_at', { mode: 'string' }).notNull(),
    endedAt: timestamp('ended_at', { mode: 'string' }), // null = possibly still active
    totalSends: integer('total_sends').default(0).notNull(),
    totalAttempts: integer('total_attempts').default(0).notNull(),
    totalFlashes: integer('total_flashes').default(0).notNull(),
    tickCount: integer('tick_count').default(0).notNull(),
    name: text('name'), // User-editable session name
    description: text('description'), // User-editable notes (maps to "goal" in the feed)
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('inferred_sessions_user_idx').on(table.userId),
    userLastTickIdx: index('inferred_sessions_user_last_tick_idx').on(
      table.userId,
      table.lastTickAt,
    ),
    lastTickIdx: index('inferred_sessions_last_tick_idx').on(table.lastTickAt),
  }),
);

export type InferredSession = typeof inferredSessions.$inferSelect;
export type NewInferredSession = typeof inferredSessions.$inferInsert;
