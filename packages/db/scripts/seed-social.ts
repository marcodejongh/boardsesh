import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, ne, sql, and, isNotNull } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

import { users } from '../src/schema/auth/users.js';
import { userProfiles } from '../src/schema/auth/credentials.js';
import { userFollows } from '../src/schema/app/follows.js';
import { boardseshTicks } from '../src/schema/app/ascents.js';
import { boardClimbs, boardDifficultyGrades } from '../src/schema/boards/unified.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment files (same as migrate.ts / import-moonboard-problems.ts)
config({ path: path.resolve(__dirname, '../../../.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.local') });
config({ path: path.resolve(__dirname, '../../web/.env.development.local') });

// Enable WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Configure Neon for local development (uses neon-proxy on port 4444)
function configureNeonForLocal(connectionString: string): void {
  const connectionStringUrl = new URL(connectionString);
  const isLocalDb = connectionStringUrl.hostname === 'db.localtest.me';

  if (isLocalDb) {
    neonConfig.fetchEndpoint = (host) => {
      const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
      return `${protocol}://${host}:${port}/sql`;
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
  }
}

// =============================================================================
// Constants
// =============================================================================

const FAKE_EMAIL_DOMAIN = 'fake.boardsesh.dev';
const NUM_FAKE_USERS = 40;
const BATCH_SIZE = 100;

const CLIMBING_NICKNAMES = [
  'CrimpKing', 'BetaMaster', 'DynoQueen', 'SloperSlayer', 'PinchPro',
  'FlashFred', 'ProjectPaula', 'CampusCrusher', 'HeelHookHero', 'ToeHookTina',
  'SendTrain', 'ChalkBoss', 'WallRider', 'GripStrength', 'MoonCatcher',
  'RoofRunner', 'AreteAce', 'CrackClimber', 'VolumeViper', 'PocketRocket',
  'EdgeLord', 'MantelMaster', 'FlagQueen', 'GastonGuru', 'UnderclingKing',
  'KneeBarNinja', 'DropKneeDoug', 'CutLooseCarl', 'CompClimber', 'BoardBeast',
];

const CLIMBING_COMMENTS = [
  'Finally sent this one! Took me ages to figure out the beta.',
  'Clean flash, felt great today!',
  'That crux move is so tricky. Need to come back stronger.',
  'Love the movement on this one.',
  'Unexpected top out, stoked!',
  'Fingers are wrecked but worth it.',
  'The heel hook makes this so much easier.',
  'Tried the sit start variation, way harder.',
  'Great warm up problem.',
  'This one is sandbagged for sure.',
  'Perfect conditions today, skin was amazing.',
  'Need to work on my crimp strength for this.',
  'The dyno at the top is terrifying.',
  'Smooth run, no falls.',
  'So close! Fell on the last move.',
  'Managed to skip the kneebar, felt strong.',
  'This route flows so well once you find the beta.',
  'My project for the month, finally done!',
  'Way harder than the grade suggests.',
  'Board felt extra sticky today, crushed it.',
];

// =============================================================================
// Main seed function
// =============================================================================

async function seedSocialData() {
  // Check for DATABASE_URL first, then POSTGRES_URL
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL or POSTGRES_URL is not set');
    process.exit(1);
  }

  // Safety: Block local dev URLs in production builds
  const isLocalUrl = databaseUrl.includes('localhost') ||
                     databaseUrl.includes('localtest.me') ||
                     databaseUrl.includes('127.0.0.1');

  if (process.env.VERCEL && isLocalUrl) {
    console.error('Refusing to run seed with local DATABASE_URL in Vercel build');
    process.exit(1);
  }

  const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
  console.log(`Seeding social data to: ${dbHost}`);

  // Use deterministic seed for idempotent output
  faker.seed(42);

  try {
    configureNeonForLocal(databaseUrl);
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle(pool);

    // =========================================================================
    // Step 1: Find existing dev users
    // =========================================================================
    console.log('\n--- Step 1: Finding existing dev users ---');
    const devUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.email} NOT LIKE ${'%@' + FAKE_EMAIL_DOMAIN}`);

    console.log(`Found ${devUsers.length} dev user(s): ${devUsers.map(u => u.email).join(', ') || '(none)'}`);

    // =========================================================================
    // Step 2: Create fake users
    // =========================================================================
    console.log('\n--- Step 2: Creating fake users ---');
    const fakeUserRecords: (typeof users.$inferInsert)[] = [];

    for (let i = 0; i < NUM_FAKE_USERS; i++) {
      fakeUserRecords.push({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email({ provider: FAKE_EMAIL_DOMAIN }),
        image: faker.datatype.boolean(0.8) ? faker.image.avatar() : null,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: new Date(),
      });
    }

    await db.insert(users).values(fakeUserRecords).onConflictDoNothing();
    console.log(`Inserted ${fakeUserRecords.length} fake users`);

    // =========================================================================
    // Step 3: Create profiles
    // =========================================================================
    console.log('\n--- Step 3: Creating user profiles ---');
    const profileRecords: (typeof userProfiles.$inferInsert)[] = [];

    for (let i = 0; i < fakeUserRecords.length; i++) {
      const user = fakeUserRecords[i];
      profileRecords.push({
        userId: user.id!,
        displayName: faker.datatype.boolean(0.7)
          ? CLIMBING_NICKNAMES[i % CLIMBING_NICKNAMES.length]
          : null,
        avatarUrl: faker.datatype.boolean(0.8) ? faker.image.avatar() : null,
        instagramUrl: faker.datatype.boolean(0.4)
          ? `https://instagram.com/${faker.internet.username()}`
          : null,
      });
    }

    await db.insert(userProfiles).values(profileRecords).onConflictDoNothing();
    console.log(`Inserted ${profileRecords.length} user profiles`);

    // =========================================================================
    // Step 4: Create follow relationships
    // =========================================================================
    console.log('\n--- Step 4: Creating follow relationships ---');
    const followRecords: (typeof userFollows.$inferInsert)[] = [];
    const followSet = new Set<string>(); // Dedup "followerId:followingId"

    function addFollow(followerId: string, followingId: string) {
      if (followerId === followingId) return; // Respect no_self_follow constraint
      const key = `${followerId}:${followingId}`;
      if (followSet.has(key)) return;
      followSet.add(key);
      followRecords.push({ followerId, followingId });
    }

    const fakeUserIds = fakeUserRecords.map(u => u.id!);
    const allUserIds = [...devUsers.map(u => u.id), ...fakeUserIds];

    // Each dev user gets 10-20 followers from fake users
    for (const devUser of devUsers) {
      const followerCount = faker.number.int({ min: 10, max: Math.min(20, fakeUserIds.length) });
      const shuffledFakes = faker.helpers.shuffle([...fakeUserIds]);
      for (let i = 0; i < followerCount; i++) {
        addFollow(shuffledFakes[i], devUser.id);
      }
    }

    // Each dev user follows 5-15 fake users
    for (const devUser of devUsers) {
      const followingCount = faker.number.int({ min: 5, max: Math.min(15, fakeUserIds.length) });
      const shuffledFakes = faker.helpers.shuffle([...fakeUserIds]);
      for (let i = 0; i < followingCount; i++) {
        addFollow(devUser.id, shuffledFakes[i]);
      }
    }

    // Each fake user follows 3-10 other fake users (random social graph)
    for (const fakeId of fakeUserIds) {
      const followingCount = faker.number.int({ min: 3, max: 10 });
      const otherFakes = fakeUserIds.filter(id => id !== fakeId);
      const shuffled = faker.helpers.shuffle([...otherFakes]);
      for (let i = 0; i < Math.min(followingCount, shuffled.length); i++) {
        addFollow(fakeId, shuffled[i]);
      }
    }

    // Batch insert follows
    for (let i = 0; i < followRecords.length; i += BATCH_SIZE) {
      const batch = followRecords.slice(i, i + BATCH_SIZE);
      await db.insert(userFollows).values(batch).onConflictDoNothing();
    }
    console.log(`Inserted ${followRecords.length} follow relationships`);

    // =========================================================================
    // Step 5: Fetch real climb data
    // =========================================================================
    console.log('\n--- Step 5: Fetching real climb data ---');

    // Get climbs for each board type
    const boardTypes = ['kilter', 'tension', 'moonboard'];
    const climbsByBoard: Record<string, { uuid: string; boardType: string; angle: number | null }[]> = {};
    const gradesByBoard: Record<string, number[]> = {};

    for (const boardType of boardTypes) {
      const climbs = await db
        .select({
          uuid: boardClimbs.uuid,
          boardType: boardClimbs.boardType,
          angle: boardClimbs.angle,
        })
        .from(boardClimbs)
        .where(
          and(
            eq(boardClimbs.boardType, boardType),
            eq(boardClimbs.isListed, true),
          )
        )
        .limit(200);

      climbsByBoard[boardType] = climbs;
      console.log(`  ${boardType}: ${climbs.length} climbs`);

      const grades = await db
        .select({ difficulty: boardDifficultyGrades.difficulty })
        .from(boardDifficultyGrades)
        .where(
          and(
            eq(boardDifficultyGrades.boardType, boardType),
            eq(boardDifficultyGrades.isListed, true),
          )
        );

      gradesByBoard[boardType] = grades.map(g => g.difficulty);
      console.log(`  ${boardType}: ${grades.length} difficulty grades`);
    }

    // Filter to board types that actually have climbs
    const availableBoardTypes = boardTypes.filter(bt => climbsByBoard[bt].length > 0);
    if (availableBoardTypes.length === 0) {
      console.log('\nNo climbs found in database. Skipping tick generation.');
      console.log('Run the app sync first to populate board_climbs, then re-run this script.');
      await pool.end();
      process.exit(0);
    }

    console.log(`Available board types with climbs: ${availableBoardTypes.join(', ')}`);

    // =========================================================================
    // Step 6: Create ascent activity (ticks)
    // =========================================================================
    console.log('\n--- Step 6: Creating ascent ticks ---');
    const tickRecords: (typeof boardseshTicks.$inferInsert)[] = [];
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    function generateTicks(userId: string, count: number) {
      for (let i = 0; i < count; i++) {
        const boardType = faker.helpers.arrayElement(availableBoardTypes);
        const climbs = climbsByBoard[boardType];
        const grades = gradesByBoard[boardType];

        if (climbs.length === 0 || grades.length === 0) continue;

        const climb = faker.helpers.arrayElement(climbs);

        // Weighted status: flash 20%, send 50%, attempt 30%
        const statusRoll = faker.number.float({ min: 0, max: 1 });
        const status = statusRoll < 0.2 ? 'flash' as const
          : statusRoll < 0.7 ? 'send' as const
          : 'attempt' as const;

        // Exponential distribution favoring recent dates
        const exponentialRandom = -Math.log(1 - faker.number.float({ min: 0, max: 0.999 })) / 3;
        const daysAgo = Math.min(exponentialRandom * 10, 30);
        const climbedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

        const difficulty = status !== 'attempt' ? faker.helpers.arrayElement(grades) : null;
        const quality = status !== 'attempt' ? faker.number.int({ min: 1, max: 5 }) : null;
        const attemptCount = status === 'flash' ? 1 : status === 'send' ? faker.number.int({ min: 2, max: 15 }) : faker.number.int({ min: 1, max: 5 });

        const comment = faker.datatype.boolean(0.3)
          ? faker.helpers.arrayElement(CLIMBING_COMMENTS)
          : '';

        tickRecords.push({
          uuid: faker.string.uuid(),
          userId,
          boardType,
          climbUuid: climb.uuid,
          angle: climb.angle ?? 40,
          isMirror: false,
          status,
          attemptCount,
          quality,
          difficulty,
          isBenchmark: false,
          comment,
          climbedAt: climbedAt.toISOString(),
        });
      }
    }

    // 5-25 ticks per fake user
    for (const fakeId of fakeUserIds) {
      const tickCount = faker.number.int({ min: 5, max: 25 });
      generateTicks(fakeId, tickCount);
    }

    // 2-5 ticks per dev user
    for (const devUser of devUsers) {
      const tickCount = faker.number.int({ min: 2, max: 5 });
      generateTicks(devUser.id, tickCount);
    }

    // Batch insert ticks
    for (let i = 0; i < tickRecords.length; i += BATCH_SIZE) {
      const batch = tickRecords.slice(i, i + BATCH_SIZE);
      await db.insert(boardseshTicks).values(batch).onConflictDoNothing();
      process.stdout.write(`\r  Ticks: ${Math.min(i + BATCH_SIZE, tickRecords.length)}/${tickRecords.length}`);
    }
    console.log('');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('\nSeed completed!');
    console.log(`  Fake users: ${fakeUserRecords.length}`);
    console.log(`  User profiles: ${profileRecords.length}`);
    console.log(`  Follow relationships: ${followRecords.length}`);
    console.log(`  Ascent ticks: ${tickRecords.length}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedSocialData();
