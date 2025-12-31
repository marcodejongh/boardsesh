import { beforeAll, beforeEach, afterAll } from 'vitest';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { db as sharedDb } from '../db/client.js';
import { roomManager } from '../services/room-manager.js';

const TEST_DB_NAME = 'boardsesh_backend_test';
const connectionString =
  process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5433/${TEST_DB_NAME}`;

// Parse connection string to get base URL (without database name)
const baseConnectionString = connectionString.replace(/\/[^/]+$/, '/postgres');

let migrationClient: ReturnType<typeof postgres>;

// SQL to create only the tables needed for backend tests
const createTablesSQL = `
  -- Drop existing tables to ensure schema is up-to-date
  DROP TABLE IF EXISTS "board_session_queues" CASCADE;
  DROP TABLE IF EXISTS "board_session_clients" CASCADE;
  DROP TABLE IF EXISTS "board_sessions" CASCADE;
  DROP TABLE IF EXISTS "users" CASCADE;
  DROP TABLE IF EXISTS "kilter_climbs" CASCADE;
  DROP TABLE IF EXISTS "kilter_climb_stats" CASCADE;
  DROP TABLE IF EXISTS "kilter_difficulty_grades" CASCADE;
  DROP TABLE IF EXISTS "kilter_ascents" CASCADE;
  DROP TABLE IF EXISTS "kilter_bids" CASCADE;
  DROP TABLE IF EXISTS "tension_climbs" CASCADE;
  DROP TABLE IF EXISTS "tension_climb_stats" CASCADE;
  DROP TABLE IF EXISTS "tension_difficulty_grades" CASCADE;
  DROP TABLE IF EXISTS "tension_ascents" CASCADE;
  DROP TABLE IF EXISTS "tension_bids" CASCADE;

  -- Create users table (minimal, needed for FK reference)
  CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text,
    "email" text NOT NULL,
    "emailVerified" timestamp,
    "image" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );

  -- Create board_sessions table
  CREATE TABLE IF NOT EXISTS "board_sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "board_path" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "last_activity" timestamp DEFAULT now() NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "discoverable" boolean DEFAULT false NOT NULL,
    "created_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
    "name" text,
    CONSTRAINT "board_sessions_status_check" CHECK (status IN ('active', 'inactive', 'ended'))
  );

  -- Create board_session_clients table
  CREATE TABLE IF NOT EXISTS "board_session_clients" (
    "id" text PRIMARY KEY NOT NULL,
    "session_id" text NOT NULL REFERENCES "board_sessions"("id") ON DELETE CASCADE,
    "username" text,
    "connected_at" timestamp DEFAULT now() NOT NULL,
    "is_leader" boolean DEFAULT false NOT NULL
  );

  -- Create board_session_queues table
  CREATE TABLE IF NOT EXISTS "board_session_queues" (
    "session_id" text PRIMARY KEY NOT NULL REFERENCES "board_sessions"("id") ON DELETE CASCADE,
    "queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "current_climb_queue_item" jsonb DEFAULT 'null'::jsonb,
    "version" integer DEFAULT 1 NOT NULL,
    "sequence" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );

  -- Create kilter tables for climb query tests
  CREATE TABLE IF NOT EXISTS "kilter_climbs" (
    "uuid" text PRIMARY KEY NOT NULL,
    "layout_id" integer,
    "setter_id" integer,
    "setter_username" text,
    "name" text,
    "description" text,
    "hsm" integer,
    "edge_left" integer,
    "edge_right" integer,
    "edge_bottom" integer,
    "edge_top" integer,
    "frames_count" integer DEFAULT 1,
    "frames_pace" integer,
    "frames" text,
    "is_draft" boolean DEFAULT false,
    "is_listed" boolean DEFAULT true,
    "created_at" text
  );

  CREATE TABLE IF NOT EXISTS "kilter_climb_stats" (
    "climb_uuid" text NOT NULL,
    "angle" integer NOT NULL,
    "display_difficulty" double precision,
    "benchmark_difficulty" double precision,
    "ascensionist_count" bigint,
    "difficulty_average" double precision,
    "quality_average" double precision,
    "fa_username" text,
    "fa_at" timestamp,
    PRIMARY KEY ("climb_uuid", "angle")
  );

  CREATE TABLE IF NOT EXISTS "kilter_difficulty_grades" (
    "difficulty" integer PRIMARY KEY NOT NULL,
    "boulder_name" text,
    "route_name" text,
    "is_listed" boolean DEFAULT true
  );

  CREATE TABLE IF NOT EXISTS "kilter_ascents" (
    "uuid" text PRIMARY KEY NOT NULL,
    "climb_uuid" text,
    "angle" integer,
    "is_mirror" boolean,
    "user_id" integer,
    "attempt_id" integer,
    "bid_count" integer DEFAULT 1,
    "quality" integer,
    "difficulty" integer,
    "is_benchmark" integer DEFAULT 0,
    "comment" text DEFAULT '',
    "climbed_at" text,
    "created_at" text,
    "synced" boolean DEFAULT true NOT NULL,
    "sync_error" text
  );

  CREATE TABLE IF NOT EXISTS "kilter_bids" (
    "uuid" text PRIMARY KEY NOT NULL,
    "user_id" integer,
    "climb_uuid" text,
    "angle" integer,
    "is_mirror" boolean,
    "bid_count" integer DEFAULT 1,
    "comment" text DEFAULT '',
    "climbed_at" text,
    "created_at" text,
    "synced" boolean DEFAULT true NOT NULL,
    "sync_error" text
  );

  -- Create tension tables for climb query tests
  CREATE TABLE IF NOT EXISTS "tension_climbs" (
    "uuid" text PRIMARY KEY NOT NULL,
    "layout_id" integer,
    "setter_id" integer,
    "setter_username" text,
    "name" text,
    "description" text,
    "hsm" integer,
    "edge_left" integer,
    "edge_right" integer,
    "edge_bottom" integer,
    "edge_top" integer,
    "frames_count" integer DEFAULT 1,
    "frames_pace" integer,
    "frames" text,
    "is_draft" boolean DEFAULT false,
    "is_listed" boolean DEFAULT true,
    "created_at" text
  );

  CREATE TABLE IF NOT EXISTS "tension_climb_stats" (
    "climb_uuid" text NOT NULL,
    "angle" integer NOT NULL,
    "display_difficulty" double precision,
    "benchmark_difficulty" double precision,
    "ascensionist_count" bigint,
    "difficulty_average" double precision,
    "quality_average" double precision,
    "fa_username" text,
    "fa_at" timestamp,
    PRIMARY KEY ("climb_uuid", "angle")
  );

  CREATE TABLE IF NOT EXISTS "tension_difficulty_grades" (
    "difficulty" integer PRIMARY KEY NOT NULL,
    "boulder_name" text,
    "route_name" text,
    "is_listed" boolean DEFAULT true
  );

  CREATE TABLE IF NOT EXISTS "tension_ascents" (
    "uuid" text PRIMARY KEY NOT NULL,
    "climb_uuid" text,
    "angle" integer,
    "is_mirror" boolean,
    "user_id" integer,
    "attempt_id" integer,
    "bid_count" integer DEFAULT 1,
    "quality" integer,
    "difficulty" integer,
    "is_benchmark" integer DEFAULT 0,
    "comment" text DEFAULT '',
    "climbed_at" text,
    "created_at" text,
    "synced" boolean DEFAULT true NOT NULL,
    "sync_error" text
  );

  CREATE TABLE IF NOT EXISTS "tension_bids" (
    "uuid" text PRIMARY KEY NOT NULL,
    "user_id" integer,
    "climb_uuid" text,
    "angle" integer,
    "is_mirror" boolean,
    "bid_count" integer DEFAULT 1,
    "comment" text DEFAULT '',
    "climbed_at" text,
    "created_at" text,
    "synced" boolean DEFAULT true NOT NULL,
    "sync_error" text
  );

  -- Create indexes for board_sessions
  CREATE INDEX IF NOT EXISTS "board_sessions_location_idx" ON "board_sessions" ("latitude", "longitude");
  CREATE INDEX IF NOT EXISTS "board_sessions_discoverable_idx" ON "board_sessions" ("discoverable");
  CREATE INDEX IF NOT EXISTS "board_sessions_user_idx" ON "board_sessions" ("created_by_user_id");
  CREATE INDEX IF NOT EXISTS "board_sessions_status_idx" ON "board_sessions" ("status");
  CREATE INDEX IF NOT EXISTS "board_sessions_last_activity_idx" ON "board_sessions" ("last_activity");
  CREATE INDEX IF NOT EXISTS "board_sessions_discovery_idx" ON "board_sessions" ("discoverable", "status", "last_activity");
`;

beforeAll(async () => {
  // First, connect to postgres database to create test database if needed
  // Suppress PostgreSQL NOTICE messages in test output
  const adminClient = postgres(baseConnectionString, { max: 1, onnotice: () => {} });

  try {
    // Check if test database exists
    const result = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}
    `;

    if (result.length === 0) {
      // Create the test database
      await adminClient.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`Created test database: ${TEST_DB_NAME}`);
    }
  } catch (error) {
    // Database might already exist, that's okay
    console.log('Test database check:', error);
  } finally {
    await adminClient.end();
  }

  // Now connect to the test database for schema creation
  migrationClient = postgres(connectionString, { max: 1, onnotice: () => {} });

  // Create tables directly (backend tests only need session tables)
  await migrationClient.unsafe(createTablesSQL);
});

beforeEach(async () => {
  // Reset room manager state
  roomManager.reset();

  // Clear all tables in correct order (respect foreign keys)
  // Use sharedDb (same instance as roomManager) to ensure consistency
  await sharedDb.execute(sql`TRUNCATE TABLE board_session_queues CASCADE`);
  await sharedDb.execute(sql`TRUNCATE TABLE board_session_clients CASCADE`);
  await sharedDb.execute(sql`TRUNCATE TABLE board_sessions CASCADE`);
  await sharedDb.execute(sql`TRUNCATE TABLE users CASCADE`);

  // Create test users that are referenced by tests
  // The session-persistence tests use 'user-123' for discoverable sessions
  await sharedDb.execute(sql`
    INSERT INTO users (id, email, name)
    VALUES ('user-123', 'test@example.com', 'Test User')
    ON CONFLICT (id) DO NOTHING
  `);
});

afterAll(async () => {
  // Close database connection
  if (migrationClient) {
    await migrationClient.end();
  }
});
