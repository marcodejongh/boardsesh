import {
  pgTable,
  bigserial,
  text,
  timestamp,
  index,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { socialEntityTypeEnum } from './social';

export const feedItemTypeEnum = pgEnum('feed_item_type', [
  'ascent',
  'new_climb',
  'comment',
  'proposal_approved',
]);

export const feedItems = pgTable(
  'feed_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    recipientId: text('recipient_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    actorId: text('actor_id')
      .references(() => users.id, { onDelete: 'set null' }),
    type: feedItemTypeEnum('type').notNull(),
    entityType: socialEntityTypeEnum('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    boardUuid: text('board_uuid'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    recipientCreatedAtIdx: index('feed_items_recipient_created_at_idx').on(
      table.recipientId,
      table.createdAt
    ),
    recipientBoardCreatedAtIdx: index('feed_items_recipient_board_created_at_idx').on(
      table.recipientId,
      table.boardUuid,
      table.createdAt
    ),
    actorCreatedAtIdx: index('feed_items_actor_created_at_idx').on(
      table.actorId,
      table.createdAt
    ),
    createdAtIdx: index('feed_items_created_at_idx').on(table.createdAt),
  })
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;
export type FeedItemType = 'ascent' | 'new_climb' | 'comment' | 'proposal_approved';
