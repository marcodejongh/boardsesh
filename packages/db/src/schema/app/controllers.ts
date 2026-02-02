import { pgTable, text, timestamp, integer, varchar, index, uuid } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

/**
 * ESP32 Controller registrations
 * Stores API keys and configuration for ESP32 board controllers
 */
export const esp32Controllers = pgTable('esp32_controllers', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Owner of the controller (nullable for anonymous/unowned controllers)
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  // Unique API key for controller authentication
  apiKey: varchar('api_key', { length: 64 }).unique().notNull(),
  // Human-readable name for the controller
  name: varchar('name', { length: 100 }),
  // Board configuration
  boardName: varchar('board_name', { length: 20 }).notNull(),
  layoutId: integer('layout_id').notNull(),
  sizeId: integer('size_id').notNull(),
  setIds: varchar('set_ids', { length: 100 }).notNull(),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at'),
}, (table) => ({
  userIdx: index('esp32_controllers_user_idx').on(table.userId),
  apiKeyIdx: index('esp32_controllers_api_key_idx').on(table.apiKey),
}));

// Type exports
export type Esp32Controller = typeof esp32Controllers.$inferSelect;
export type NewEsp32Controller = typeof esp32Controllers.$inferInsert;
