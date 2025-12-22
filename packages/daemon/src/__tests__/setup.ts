import { beforeAll, beforeEach, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { roomManager } from '../services/room-manager.js';

const TEST_DB_NAME = 'boardsesh_daemon_test';
const connectionString =
  process.env.DATABASE_URL || `postgresql://postgres:postgres@localhost:5433/${TEST_DB_NAME}`;

// Parse connection string to get base URL (without database name)
const baseConnectionString = connectionString.replace(/\/[^/]+$/, '/postgres');

let migrationClient: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

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

  // Run migrations
  await migrate(db, { migrationsFolder: './src/db/migrations' });
});

beforeEach(async () => {
  // Reset room manager state
  roomManager.reset();

  // Clear all tables in correct order (respect foreign keys)
  await db.execute(sql`TRUNCATE TABLE session_queues CASCADE`);
  await db.execute(sql`TRUNCATE TABLE session_clients CASCADE`);
  await db.execute(sql`TRUNCATE TABLE sessions CASCADE`);
});

afterAll(async () => {
  // Close database connection
  if (migrationClient) {
    await migrationClient.end();
  }
});
