import {
  pgTable,
  bigserial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

// User board mappings table to link NextAuth users with Aurora board users
export const userBoardMappings = pgTable(
  "user_board_mappings",
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardType: text("board_type").notNull(), // 'kilter', 'tension', etc.
    boardUserId: integer("board_user_id").notNull(),
    boardUsername: text("board_username"), // Store username for display
    linkedAt: timestamp("linked_at").defaultNow().notNull(),
  },
  (table) => ({
    // Ensure unique mapping per board type for each user
    uniqueUserBoard: uniqueIndex("unique_user_board_mapping").on(
      table.userId,
      table.boardType
    ),
    // Index for efficient lookup by board user
    boardUserIdx: index("board_user_mapping_idx").on(
      table.boardType,
      table.boardUserId
    ),
  })
);

// Aurora credentials for Kilter/Tension board accounts (encrypted)
export const auroraCredentials = pgTable(
  "aurora_credentials",
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardType: text("board_type").notNull(), // 'kilter', 'tension'
    encryptedUsername: text("encrypted_username").notNull(),
    encryptedPassword: text("encrypted_password").notNull(),
    auroraUserId: integer("aurora_user_id"), // Aurora board user ID after successful login
    auroraToken: text("aurora_token"), // Session token (encrypted)
    lastSyncAt: timestamp("last_sync_at"), // Last successful sync
    syncStatus: text("sync_status").default("pending").notNull(), // 'pending', 'active', 'error', 'expired'
    syncError: text("sync_error"), // Error message if sync failed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // Ensure unique credential per board type for each user
    uniqueUserBoardCredential: uniqueIndex("unique_user_board_credential").on(
      table.userId,
      table.boardType
    ),
    // Index for efficient lookup by user
    userCredentialsIdx: index("aurora_credentials_user_idx").on(table.userId),
  })
);
