import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import type { ClimbQueueItem } from '@boardsesh/shared-schema';

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  boardPath: text('board_path').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
});

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
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports for use in other files
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionClient = typeof sessionClients.$inferSelect;
export type NewSessionClient = typeof sessionClients.$inferInsert;
export type SessionQueue = typeof sessionQueues.$inferSelect;
export type NewSessionQueue = typeof sessionQueues.$inferInsert;
