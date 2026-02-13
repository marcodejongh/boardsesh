import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { socialEntityTypeEnum } from './social';

export const voteCounts = pgTable(
  'vote_counts',
  {
    entityType: socialEntityTypeEnum('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    score: integer('score').notNull().default(0),
    hotScore: doublePrecision('hot_score').notNull().default(0),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityType, table.entityId] }),
    scoreIdx: index('vote_counts_score_idx').on(table.entityType, table.score),
    hotScoreIdx: index('vote_counts_hot_score_idx').on(table.entityType, table.hotScore),
  }),
);

export type VoteCount = typeof voteCounts.$inferSelect;
