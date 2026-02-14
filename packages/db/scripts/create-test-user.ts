import { createScriptDb, getScriptDatabaseUrl } from './db-connection.js';
import { users } from '../src/schema/auth/users.js';
import { userCredentials, userProfiles } from '../src/schema/auth/credentials.js';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_EMAIL = 'test@boardsesh.dev';
const TEST_USER_NAME = 'test';
const TEST_USER_DISPLAY_NAME = 'Test User';

// Pre-computed bcrypt hash of "test" with 12 rounds.
// Generated with: bcrypt.hash('test', 12)
const TEST_PASSWORD_HASH = '$2b$12$ICPPBhOLDExMf2JX88WhCOz8wbvGHn0VuA5MI1F1bm1kDewpD1/GC';

async function createTestUser() {
  const databaseUrl = getScriptDatabaseUrl();
  const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
  console.log(`Creating test user on: ${dbHost}`);

  const { db, close } = createScriptDb(databaseUrl);

  try {
    // Insert user
    await db.insert(users).values({
      id: TEST_USER_ID,
      name: TEST_USER_NAME,
      email: TEST_USER_EMAIL,
      emailVerified: new Date(),
    }).onConflictDoNothing();

    // Insert credentials
    await db.insert(userCredentials).values({
      userId: TEST_USER_ID,
      passwordHash: TEST_PASSWORD_HASH,
    }).onConflictDoNothing();

    // Insert profile
    await db.insert(userProfiles).values({
      userId: TEST_USER_ID,
      displayName: TEST_USER_DISPLAY_NAME,
    }).onConflictDoNothing();

    console.log(`Test user created: ${TEST_USER_EMAIL} / test`);
    await close();
    process.exit(0);
  } catch (error) {
    console.error('Failed to create test user:', error);
    await close();
    process.exit(1);
  }
}

createTestUser();
