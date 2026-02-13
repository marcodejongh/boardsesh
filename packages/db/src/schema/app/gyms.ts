import {
  pgTable,
  bigserial,
  bigint,
  text,
  boolean,
  timestamp,
  doublePrecision,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../auth/users';

export const gymMemberRoleEnum = pgEnum('gym_member_role', ['admin', 'member']);

/**
 * Gyms table — represents a physical gym location that can contain multiple boards.
 */
export const gyms = pgTable(
  'gyms',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    uuid: text('uuid').notNull().unique(),
    name: text('name').notNull(),
    slug: text('slug'),
    ownerId: text('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    address: text('address'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    isPublic: boolean('is_public').default(true).notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    uniqueSlugIdx: uniqueIndex('gyms_unique_slug')
      .on(table.slug)
      .where(sql`${table.deletedAt} IS NULL`),
    uuidIdx: index('gyms_uuid_idx').on(table.uuid),
    ownerIdx: index('gyms_owner_idx')
      .on(table.ownerId)
      .where(sql`${table.deletedAt} IS NULL`),
    publicIdx: index('gyms_public_idx')
      .on(table.isPublic)
      .where(sql`${table.deletedAt} IS NULL`),
  })
);

/**
 * Gym members table — tracks which users are members of which gyms.
 */
export const gymMembers = pgTable(
  'gym_members',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    gymId: bigint('gym_id', { mode: 'number' })
      .references(() => gyms.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: gymMemberRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueGymUser: uniqueIndex('gym_members_unique_gym_user').on(
      table.gymId,
      table.userId
    ),
  })
);

/**
 * Gym follows table — tracks which users follow which gyms.
 */
export const gymFollows = pgTable(
  'gym_follows',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    gymId: bigint('gym_id', { mode: 'number' })
      .references(() => gyms.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueGymUser: uniqueIndex('gym_follows_unique_gym_user').on(
      table.gymId,
      table.userId
    ),
  })
);

// Type exports
export type Gym = typeof gyms.$inferSelect;
export type NewGym = typeof gyms.$inferInsert;
export type GymMember = typeof gymMembers.$inferSelect;
export type NewGymMember = typeof gymMembers.$inferInsert;
export type GymFollow = typeof gymFollows.$inferSelect;
export type NewGymFollow = typeof gymFollows.$inferInsert;
