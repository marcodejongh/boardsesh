import { pgTable, text, timestamp, boolean, jsonb, integer, doublePrecision, index } from 'drizzle-orm/pg-core';
import type { ClimbQueueItem } from '@boardsesh/shared-schema';
import { users } from '../auth/users.js';

// Board sessions for party mode (renamed from 'sessions' to avoid conflict with NextAuth sessions)
export const boardSessions = pgTable('board_sessions', {
  id: text('id').primaryKey(),
  boardPath: text('board_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  // GPS coordinates for session discovery
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  // Whether session appears in nearby search
  discoverable: boolean('discoverable').default(false).notNull(),
  // Link to authenticated user who created the session
  createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  // Session name for display in discovery
  name: text('name'),
}, (table) => ({
  locationIdx: index('board_sessions_location_idx').on(table.latitude, table.longitude),
  discoverableIdx: index('board_sessions_discoverable_idx').on(table.discoverable),
  userSessionsIdx: index('board_sessions_user_idx').on(table.createdByUserId),
}));

export const boardSessionClients = pgTable('board_session_clients', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .references(() => boardSessions.id, { onDelete: 'cascade' })
    .notNull(),
  username: text('username'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  isLeader: boolean('is_leader').default(false).notNull(),
});

export const boardSessionQueues = pgTable('board_session_queues', {
  sessionId: text('session_id')
    .primaryKey()
    .references(() => boardSessions.id, { onDelete: 'cascade' }),
  queue: jsonb('queue').$type<ClimbQueueItem[]>().default([]).notNull(),
  currentClimbQueueItem: jsonb('current_climb_queue_item').$type<ClimbQueueItem | null>().default(null),
  version: integer('version').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in other files
export type BoardSession = typeof boardSessions.$inferSelect;
export type NewBoardSession = typeof boardSessions.$inferInsert;
export type BoardSessionClient = typeof boardSessionClients.$inferSelect;
export type NewBoardSessionClient = typeof boardSessionClients.$inferInsert;
export type BoardSessionQueue = typeof boardSessionQueues.$inferSelect;
export type NewBoardSessionQueue = typeof boardSessionQueues.$inferInsert;
