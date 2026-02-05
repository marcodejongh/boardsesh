import { beforeAll, beforeEach, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { roomManager } from '../services/room-manager';

const TEST_DB_NAME = 'boardsesh_backend_test';
const connectionString =
  process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5433/${TEST_DB_NAME}`;

// Parse connection string to get base URL (without database name)
const baseConnectionString = connectionString.replace(/\/[^/]+$/, '/postgres');

let migrationClient: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

// SQL to create only the tables needed for backend tests
const createTablesSQL = `
  -- Drop existing tables to ensure schema is up-to-date
  DROP TABLE IF EXISTS "board_session_queues" CASCADE;
  DROP TABLE IF EXISTS "board_session_clients" CASCADE;
  DROP TABLE IF EXISTS "board_sessions" CASCADE;
  DROP TABLE IF EXISTS "users" CASCADE;

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

  -- Create indexes
  CREATE INDEX IF NOT EXISTS "board_sessions_location_idx" ON "board_sessions" ("latitude", "longitude");
  CREATE INDEX IF NOT EXISTS "board_sessions_discoverable_idx" ON "board_sessions" ("discoverable");
  CREATE INDEX IF NOT EXISTS "board_sessions_user_idx" ON "board_sessions" ("created_by_user_id");
  CREATE INDEX IF NOT EXISTS "board_sessions_status_idx" ON "board_sessions" ("status");
  CREATE INDEX IF NOT EXISTS "board_sessions_last_activity_idx" ON "board_sessions" ("last_activity");
  CREATE INDEX IF NOT EXISTS "board_sessions_discovery_idx" ON "board_sessions" ("discoverable", "status", "last_activity");

  -- Drop and recreate esp32_controllers table for controller tests
  DROP TABLE IF EXISTS "esp32_controllers" CASCADE;

  -- Create esp32_controllers table
  CREATE TABLE IF NOT EXISTS "esp32_controllers" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
    "api_key" varchar(64) UNIQUE NOT NULL,
    "name" varchar(100),
    "board_name" varchar(20) NOT NULL,
    "layout_id" integer NOT NULL,
    "size_id" integer NOT NULL,
    "set_ids" varchar(100) NOT NULL,
    "authorized_session_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "last_seen_at" timestamp
  );

  -- Create indexes for esp32_controllers
  CREATE INDEX IF NOT EXISTS "esp32_controllers_user_idx" ON "esp32_controllers" ("user_id");
  CREATE INDEX IF NOT EXISTS "esp32_controllers_api_key_idx" ON "esp32_controllers" ("api_key");
  CREATE INDEX IF NOT EXISTS "esp32_controllers_session_idx" ON "esp32_controllers" ("authorized_session_id");
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

  // Now connect to the test database
  migrationClient = postgres(connectionString, { max: 1, onnotice: () => {} });
  db = drizzle(migrationClient, { schema });

  // Create tables directly (backend tests only need session tables)
  await migrationClient.unsafe(createTablesSQL);
});

beforeEach(async () => {
  // Reset room manager state
  roomManager.reset();

  // Clear all tables in correct order (respect foreign keys)
  await db.execute(sql`TRUNCATE TABLE board_session_queues CASCADE`);
  await db.execute(sql`TRUNCATE TABLE board_session_clients CASCADE`);
  await db.execute(sql`TRUNCATE TABLE board_sessions CASCADE`);
});

afterAll(async () => {
  // Close database connection
  if (migrationClient) {
    await migrationClient.end();
  }
});
