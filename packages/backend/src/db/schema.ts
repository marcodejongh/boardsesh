import { pgTable, text, timestamp, boolean, jsonb, integer, doublePrecision, index } from 'drizzle-orm/pg-core';
import type { ClimbQueueItem } from '@boardsesh/shared-schema';

export const sessions = pgTable('sessions', {
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
  createdByUserId: text('created_by_user_id'),
  // Session name for display in discovery
  name: text('name'),
  // Expiry timestamp for cleanup (7 days from creation)
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  locationIdx: index('sessions_location_idx').on(table.latitude, table.longitude),
  discoverableIdx: index('sessions_discoverable_idx').on(table.discoverable, table.expiresAt),
  userSessionsIdx: index('sessions_user_idx').on(table.createdByUserId),
}));

export const sessionClients = pgTable('session_clients', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .references(() => sessions.id, { onDelete: 'cascade' })
    .notNull(),
  username: text('username'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  isLeader: boolean('is_leader').default(false).notNull(),
});

export const sessionQueues = pgTable('session_queues', {
  sessionId: text('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  queue: jsonb('queue').$type<ClimbQueueItem[]>().default([]).notNull(),
  currentClimbQueueItem: jsonb('current_climb_queue_item').$type<ClimbQueueItem | null>().default(null),
  version: integer('version').default(1).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in other files
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionClient = typeof sessionClients.$inferSelect;
export type NewSessionClient = typeof sessionClients.$inferInsert;
export type SessionQueue = typeof sessionQueues.$inferSelect;
export type NewSessionQueue = typeof sessionQueues.$inferInsert;
