import { eq, sql, and } from 'drizzle-orm';
import { faker } from '@faker-js/faker';

import { users } from '../src/schema/auth/users.js';
import { userProfiles } from '../src/schema/auth/credentials.js';
import { userFollows } from '../src/schema/app/follows.js';
import { boardseshTicks } from '../src/schema/app/ascents.js';
import { userBoards, boardFollows } from '../src/schema/app/boards.js';
import { boardClimbs, boardClimbStats, boardDifficultyGrades } from '../src/schema/boards/unified.js';
import { notifications } from '../src/schema/app/notifications.js';
import { comments } from '../src/schema/app/social.js';
import { createScriptDb, getScriptDatabaseUrl } from './db-connection.js';

// =============================================================================
// Constants
// =============================================================================

const FAKE_EMAIL_DOMAIN = 'fake.boardsesh.com';
const NUM_FAKE_USERS = 40;
const BATCH_SIZE = 100;
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_TICKS_PER_BOARD = 2000;

const CLIMBING_NICKNAMES = [
  'CrimpKing', 'BetaMaster', 'DynoQueen', 'SloperSlayer', 'PinchPro',
  'FlashFred', 'ProjectPaula', 'CampusCrusher', 'HeelHookHero', 'ToeHookTina',
  'SendTrain', 'ChalkBoss', 'WallRider', 'GripStrength', 'MoonCatcher',
  'RoofRunner', 'AreteAce', 'CrackClimber', 'VolumeViper', 'PocketRocket',
  'EdgeLord', 'MantelMaster', 'FlagQueen', 'GastonGuru', 'UnderclingKing',
  'KneeBarNinja', 'DropKneeDoug', 'CutLooseCarl', 'CompClimber', 'BoardBeast',
];

const BOARD_CONFIGS = [
  // Kilter Original (Layout 1, Size 7, Sets "1,20")
  { boardType: 'kilter', layoutId: 1, sizeId: 7, setIds: '1,20' },
  // Kilter Homewall variants
  { boardType: 'kilter', layoutId: 8, sizeId: 25, setIds: '26,27,28,29' },
  { boardType: 'kilter', layoutId: 8, sizeId: 21, setIds: '26,27' },
  { boardType: 'kilter', layoutId: 8, sizeId: 23, setIds: '26,27,28,29' },
  // Tension Original (Layout 9)
  { boardType: 'tension', layoutId: 9, sizeId: 1, setIds: '8,9,10,11' },
  // Tension Board 2 Mirror (Layout 10)
  { boardType: 'tension', layoutId: 10, sizeId: 6, setIds: '12,13' },
  { boardType: 'tension', layoutId: 10, sizeId: 7, setIds: '12,13' },
  // Tension Board 2 Spray (Layout 11)
  { boardType: 'tension', layoutId: 11, sizeId: 6, setIds: '12,13' },
];

const BOARD_NAMES = [
  'The Crimp Factory', 'Summit Climbing Gym', 'Basecamp Boulders',
  'Vertical Limit', 'Granite Arch', 'The Pump Station',
  'Overhang Oasis', 'Pinch Palace', 'Dyno Den',
  'Send Central', 'The Beta Cave', 'Moonrise Gym',
  'Friction Labs HQ', 'Campus Corner', 'The Slab Lab',
  'Rooftop Rocks', 'Urban Ascent', 'Chalk & Awe',
  'The Proj Wall', 'Crimp City', 'Home Wall Heroes',
  'Garage Crushers', 'Backyard Beta',
];

const BOARD_LOCATIONS = [
  { name: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442 },
  { name: 'Boulder, CO', lat: 40.015, lng: -105.2705 },
  { name: 'Portland, OR', lat: 45.5152, lng: -122.6784 },
  { name: 'Austin, TX', lat: 30.2672, lng: -97.7431 },
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Salt Lake City, UT', lat: 40.7608, lng: -111.891 },
  { name: 'Chattanooga, TN', lat: 35.0456, lng: -85.3097 },
  { name: 'Bishop, CA', lat: 37.3636, lng: -118.3951 },
  { name: 'Melbourne, AU', lat: -37.8136, lng: 144.9631 },
  { name: 'Sheffield, UK', lat: 53.3811, lng: -1.4701 },
  { name: 'Fontainebleau, FR', lat: 48.4049, lng: 2.7024 },
  { name: 'Tokyo, JP', lat: 35.6762, lng: 139.6503 },
];

const NUM_BOARDS = 20;

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

const COMMENT_BODIES = [
  'Nice send! What beta did you use for the crux?',
  'That heel hook is key, right?',
  'Solid work! I need to try this one.',
  'How many sessions did this take you?',
  'Love this problem, one of my favorites on the board.',
  'The top out is sketchy, be careful!',
  'Great flash! This took me forever.',
  'I think this is harder than the grade suggests.',
  'Congrats on the send! 🎉',
  'What angle were you climbing at?',
  'The left hand crimp at the crux is brutal.',
  'Way to stick with it!',
  'This climb is so good. Definitely adding to my playlist.',
  'Did you match on the sloper or bump?',
  'Impressive attempt count, consistency pays off!',
];

// =============================================================================
// Main seed function
// =============================================================================

async function seedSocialData() {
  const databaseUrl = getScriptDatabaseUrl();
  const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
  console.log(`Seeding social data to: ${dbHost}`);

  // Use deterministic seed for idempotent output
  faker.seed(42);

  const { db, close } = createScriptDb(databaseUrl);

  try {

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
    // Step 5: Create user boards
    // =========================================================================
    console.log('\n--- Step 5: Creating user boards ---');

    function slugify(name: string): string {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    const boardRecords: (typeof userBoards.$inferInsert)[] = [];
    const usedSlugs = new Set<string>();
    // Track owner+config combos to respect unique constraint
    const usedOwnerConfigs = new Set<string>();

    for (let i = 0; i < NUM_BOARDS; i++) {
      const owner = faker.helpers.arrayElement(fakeUserIds);
      const config = BOARD_CONFIGS[i % BOARD_CONFIGS.length];
      const configKey = `${owner}:${config.boardType}:${config.layoutId}:${config.sizeId}:${config.setIds}`;

      // Skip if this owner already has this config
      if (usedOwnerConfigs.has(configKey)) continue;
      usedOwnerConfigs.add(configKey);

      const name = BOARD_NAMES[i % BOARD_NAMES.length];
      let slug = slugify(name);
      // Ensure unique slug
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      usedSlugs.add(slug);

      const location = BOARD_LOCATIONS[i % BOARD_LOCATIONS.length];
      const isPublic = faker.datatype.boolean(0.85);
      const isOwned = faker.datatype.boolean(0.8);

      boardRecords.push({
        uuid: faker.string.uuid(),
        slug,
        ownerId: owner,
        boardType: config.boardType,
        layoutId: config.layoutId,
        sizeId: config.sizeId,
        setIds: config.setIds,
        name,
        description: faker.datatype.boolean(0.6)
          ? faker.lorem.sentences({ min: 1, max: 3 })
          : null,
        locationName: location.name,
        latitude: location.lat,
        longitude: location.lng,
        isPublic,
        isOwned,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: new Date(),
      });
    }

    await db.insert(userBoards).values(boardRecords).onConflictDoNothing();
    console.log(`Inserted ${boardRecords.length} user boards`);

    // We need the actual inserted board IDs for linking ticks later
    const insertedBoards = await db
      .select({ id: userBoards.id, uuid: userBoards.uuid, boardType: userBoards.boardType, layoutId: userBoards.layoutId, sizeId: userBoards.sizeId, setIds: userBoards.setIds, isPublic: userBoards.isPublic })
      .from(userBoards)
      .where(sql`${userBoards.deletedAt} IS NULL`);

    // =========================================================================
    // Step 6: Create board follows
    // =========================================================================
    console.log('\n--- Step 6: Creating board follows ---');
    const boardFollowRecords: (typeof boardFollows.$inferInsert)[] = [];
    const boardFollowSet = new Set<string>();

    function addBoardFollow(userId: string, boardUuid: string) {
      const key = `${userId}:${boardUuid}`;
      if (boardFollowSet.has(key)) return;
      boardFollowSet.add(key);
      boardFollowRecords.push({ userId, boardUuid });
    }

    const publicBoards = insertedBoards.filter(b => b.isPublic);

    // Each public board gets 5-15 followers from fake users
    for (const board of publicBoards) {
      const followerCount = faker.number.int({ min: 5, max: Math.min(15, fakeUserIds.length) });
      const shuffledFakes = faker.helpers.shuffle([...fakeUserIds]);
      for (let i = 0; i < followerCount; i++) {
        addBoardFollow(shuffledFakes[i], board.uuid);
      }
    }

    // Dev users follow 3-8 random public boards
    for (const devUser of devUsers) {
      if (publicBoards.length === 0) break;
      const followCount = faker.number.int({ min: 3, max: Math.min(8, publicBoards.length) });
      const shuffledBoards = faker.helpers.shuffle([...publicBoards]);
      for (let i = 0; i < followCount; i++) {
        addBoardFollow(devUser.id, shuffledBoards[i].uuid);
      }
    }

    // Batch insert board follows
    for (let i = 0; i < boardFollowRecords.length; i += BATCH_SIZE) {
      const batch = boardFollowRecords.slice(i, i + BATCH_SIZE);
      await db.insert(boardFollows).values(batch).onConflictDoNothing();
    }
    console.log(`Inserted ${boardFollowRecords.length} board follow relationships`);

    // =========================================================================
    // Step 7: Fetch real climb data
    // =========================================================================
    console.log('\n--- Step 7: Fetching real climb data ---');

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
      await close();
      process.exit(0);
    }

    console.log(`Available board types with climbs: ${availableBoardTypes.join(', ')}`);

    // Build a lookup from boardType to inserted board IDs for linking ticks
    const boardsByType: Record<string, { id: number; boardType: string }[]> = {};
    for (const board of insertedBoards) {
      if (!boardsByType[board.boardType]) boardsByType[board.boardType] = [];
      boardsByType[board.boardType].push({ id: board.id, boardType: board.boardType });
    }

    // =========================================================================
    // Step 7b: Fetch climbs with difficulty for test user tick generation
    // =========================================================================
    console.log('\n--- Step 7b: Fetching climbs with difficulty for test user ---');

    type ClimbWithDifficulty = { uuid: string; angle: number; difficulty: number };
    const climbsByDifficultyPerBoard: Record<string, Map<number, ClimbWithDifficulty[]>> = {};

    for (const boardType of availableBoardTypes) {
      const climbsWithStats = await db
        .select({
          uuid: boardClimbs.uuid,
          angle: boardClimbStats.angle,
          difficulty: boardClimbStats.displayDifficulty,
        })
        .from(boardClimbs)
        .innerJoin(
          boardClimbStats,
          and(
            eq(boardClimbs.uuid, boardClimbStats.climbUuid),
            eq(boardClimbs.boardType, boardClimbStats.boardType),
          )
        )
        .where(
          and(
            eq(boardClimbs.boardType, boardType),
            eq(boardClimbs.isListed, true),
          )
        )
        .limit(10000);

      const byDifficulty = new Map<number, ClimbWithDifficulty[]>();
      for (const climb of climbsWithStats) {
        if (climb.difficulty === null) continue;
        const diff = Math.round(climb.difficulty);
        if (!byDifficulty.has(diff)) {
          byDifficulty.set(diff, []);
        }
        byDifficulty.get(diff)!.push({
          uuid: climb.uuid,
          angle: climb.angle,
          difficulty: diff,
        });
      }

      climbsByDifficultyPerBoard[boardType] = byDifficulty;
      console.log(`  ${boardType}: ${climbsWithStats.length} climbs across ${byDifficulty.size} difficulty levels`);
    }

    // =========================================================================
    // Step 8: Create ascent activity (ticks)
    // =========================================================================
    console.log('\n--- Step 8: Creating ascent ticks ---');
    const tickRecords: (typeof boardseshTicks.$inferInsert)[] = [];
    const now = Date.now();

    // ── Step 8a: Realistic test user ticks (~2000 per board type) ──────────
    // Distribution modeled after a strong V8 climber: bell curve peaking at
    // the most popular grade range, with asymmetric tails (wider on easy side,
    // steep dropoff above V8).
    //
    // Session schedule: ~3 sessions/week over 3 years with occasional rest
    // weeks. Each board type gets its own session pool so ticks are spread
    // evenly across the full time span.
    console.log('  Generating test user ticks...');

    // Pre-generate climbing session dates over the past 3 years.
    // Walk week-by-week: 2-4 sessions per normal week, 0-1 on rest weeks.
    const SESSION_SPAN_DAYS = 3 * 365;
    const sessionDates: Date[] = [];

    for (let weekOffset = 0; weekOffset < Math.ceil(SESSION_SPAN_DAYS / 7); weekOffset++) {
      const weekStartDaysAgo = SESSION_SPAN_DAYS - weekOffset * 7;

      const isRestWeek = faker.datatype.boolean(0.1);
      const sessionsThisWeek = isRestWeek
        ? faker.number.int({ min: 0, max: 1 })
        : faker.number.int({ min: 2, max: 4 });

      for (let s = 0; s < sessionsThisWeek; s++) {
        const dayInWeek = faker.number.int({ min: 0, max: 6 });
        const daysAgo = weekStartDaysAgo - dayInWeek;
        if (daysAgo < 0) continue;
        sessionDates.push(new Date(now - daysAgo * 24 * 60 * 60 * 1000));
      }
    }

    console.log(`    ${sessionDates.length} session dates over ${Math.round(SESSION_SPAN_DAYS / 365)} years`);

    for (const boardType of availableBoardTypes) {
      const byDifficulty = climbsByDifficultyPerBoard[boardType];
      if (!byDifficulty || byDifficulty.size === 0) {
        console.log(`    ${boardType}: skipped (no climbs with stats)`);
        continue;
      }

      const difficulties = Array.from(byDifficulty.keys()).sort((a, b) => a - b);

      // Find the difficulty with the most climbs — this is typically the
      // "popular zone" (V3-V5) and serves as the peak for our distribution.
      let peakDifficulty = difficulties[0];
      let maxClimbCount = 0;
      for (const [diff, climbs] of byDifficulty) {
        if (climbs.length > maxClimbCount) {
          maxClimbCount = climbs.length;
          peakDifficulty = diff;
        }
      }

      // Weight function: asymmetric Gaussian centered on the peak difficulty.
      // - Left (easy) side: sigma=3.5 → wide spread for warm-ups
      // - Right (hard) side: sigma=2.2 → steeper decline toward projects
      // - Extra exponential decay above peak+6 (≈V8 territory)
      function getWeight(difficulty: number): number {
        const dist = difficulty - peakDifficulty;
        const sigma = dist < 0 ? 3.5 : 2.2;
        let w = Math.exp(-(dist * dist) / (2 * sigma * sigma));

        // Steep penalty above the V8 limit (peak + 6 difficulty units)
        if (dist > 6) {
          w *= Math.exp(-(dist - 6) * 2);
        }

        return Math.max(w, 0.001);
      }

      // Calculate target tick counts per difficulty
      const weights = difficulties.map(d => getWeight(d));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let boardTickCount = 0;

      for (let gi = 0; gi < difficulties.length; gi++) {
        const difficulty = difficulties[gi];
        const climbs = byDifficulty.get(difficulty)!;
        let targetCount = Math.round((weights[gi] / totalWeight) * TEST_TICKS_PER_BOARD);

        // Ensure at least 1 tick at each available difficulty
        if (targetCount < 1 && climbs.length > 0) targetCount = 1;

        const gradeRank = gi / (difficulties.length - 1);

        for (let i = 0; i < targetCount; i++) {
          const climb = faker.helpers.arrayElement(climbs);

          // Status depends on difficulty relative to the climber's level
          let status: 'flash' | 'send' | 'attempt';
          let attemptCount: number;

          if (gradeRank < 0.3) {
            // Warm-up grades: mostly flashes
            status = faker.datatype.boolean(0.7) ? 'flash' : 'send';
            attemptCount = status === 'flash' ? 1 : faker.number.int({ min: 2, max: 3 });
          } else if (gradeRank > 0.7) {
            // Project grades: fewer flashes, more attempts
            const roll = faker.number.float({ min: 0, max: 1 });
            status = roll < 0.05 ? 'flash' : roll < 0.55 ? 'send' : 'attempt';
            attemptCount = status === 'flash' ? 1
              : status === 'send' ? faker.number.int({ min: 3, max: 20 })
              : faker.number.int({ min: 1, max: 10 });
          } else {
            // Comfort zone: good mix of flashes and sends
            const roll = faker.number.float({ min: 0, max: 1 });
            status = roll < 0.25 ? 'flash' : roll < 0.85 ? 'send' : 'attempt';
            attemptCount = status === 'flash' ? 1
              : status === 'send' ? faker.number.int({ min: 2, max: 8 })
              : faker.number.int({ min: 1, max: 5 });
          }

          const quality = status !== 'attempt' ? faker.number.int({ min: 1, max: 5 }) : null;

          // Pick a random session date from the pre-generated schedule
          const climbedAt = faker.helpers.arrayElement(sessionDates);

          const comment = faker.datatype.boolean(0.08)
            ? faker.helpers.arrayElement(CLIMBING_COMMENTS)
            : '';

          let boardId: number | null = null;
          const matchingBoards = boardsByType[boardType];
          if (matchingBoards && matchingBoards.length > 0 && faker.datatype.boolean(0.8)) {
            boardId = faker.helpers.arrayElement(matchingBoards).id;
          }

          tickRecords.push({
            uuid: faker.string.uuid(),
            userId: TEST_USER_ID,
            boardType,
            climbUuid: climb.uuid,
            angle: climb.angle,
            isMirror: false,
            status,
            attemptCount,
            quality,
            difficulty,
            isBenchmark: false,
            comment,
            climbedAt: climbedAt.toISOString(),
            boardId,
          });

          boardTickCount++;
        }
      }

      console.log(`    ${boardType}: ${boardTickCount} ticks (peak difficulty: ${peakDifficulty})`);
    }

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

        // ~60% of ticks get linked to a matching board (if any exist for this boardType)
        let boardId: number | null = null;
        const matchingBoards = boardsByType[boardType];
        if (matchingBoards && matchingBoards.length > 0 && faker.datatype.boolean(0.6)) {
          boardId = faker.helpers.arrayElement(matchingBoards).id;
        }

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
          boardId,
        });
      }
    }

    // 5-25 ticks per fake user
    for (const fakeId of fakeUserIds) {
      const tickCount = faker.number.int({ min: 5, max: 25 });
      generateTicks(fakeId, tickCount);
    }

    // 2-5 ticks per dev user (skip test user — already generated above)
    for (const devUser of devUsers) {
      if (devUser.id === TEST_USER_ID) continue;
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
    // Step 9: Create comments on ticks
    // =========================================================================
    console.log('\n--- Step 9: Creating comments on ticks ---');
    const commentRecords: (typeof comments.$inferInsert)[] = [];

    // Pick ~30% of ticks to receive comments
    const ticksForComments = tickRecords.filter(() => faker.datatype.boolean(0.3));
    for (const tick of ticksForComments) {
      // 1-3 comments per tick
      const commentCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < commentCount; i++) {
        // Pick a random commenter (not the tick owner)
        const otherUsers = [...fakeUserIds, ...devUsers.map(u => u.id)].filter(id => id !== tick.userId);
        if (otherUsers.length === 0) continue;

        const commenterId = faker.helpers.arrayElement(otherUsers);
        const daysAgo = faker.number.float({ min: 0, max: 14 });
        const commentedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

        commentRecords.push({
          uuid: faker.string.uuid(),
          userId: commenterId,
          entityType: 'tick' as const,
          entityId: tick.uuid!,
          body: faker.helpers.arrayElement(COMMENT_BODIES),
          createdAt: commentedAt,
          updatedAt: commentedAt,
        });
      }
    }

    // Batch insert comments
    for (let i = 0; i < commentRecords.length; i += BATCH_SIZE) {
      const batch = commentRecords.slice(i, i + BATCH_SIZE);
      await db.insert(comments).values(batch).onConflictDoNothing();
      process.stdout.write(`\r  Comments: ${Math.min(i + BATCH_SIZE, commentRecords.length)}/${commentRecords.length}`);
    }
    console.log('');

    // =========================================================================
    // Step 10: Create notifications
    // =========================================================================
    console.log('\n--- Step 10: Creating notifications ---');
    const notificationRecords: (typeof notifications.$inferInsert)[] = [];

    // Helper to create a notification with a random timestamp in the last N days
    function createNotification(
      recipientId: string,
      actorId: string,
      type: (typeof notifications.$inferInsert)['type'],
      entityType: (typeof notifications.$inferInsert)['entityType'],
      entityId: string | null,
      commentId: number | null,
      maxDaysAgo: number,
    ) {
      if (recipientId === actorId) return; // No self-notifications

      const daysAgo = faker.number.float({ min: 0, max: maxDaysAgo });
      const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      // ~40% of notifications are read
      const readAt = faker.datatype.boolean(0.4)
        ? new Date(createdAt.getTime() + faker.number.int({ min: 60000, max: 86400000 }))
        : null;

      notificationRecords.push({
        uuid: faker.string.uuid(),
        recipientId,
        actorId,
        type,
        entityType,
        entityId,
        commentId,
        readAt,
        createdAt,
      });
    }

    // 1. new_follower notifications — for a subset of follows targeting dev users
    const devUserIds = new Set(devUsers.map(u => u.id));
    const followsToDevUsers = followRecords.filter(f => devUserIds.has(f.followingId!));
    // Generate notifications for ~80% of follows to dev users (recent follows)
    for (const follow of followsToDevUsers) {
      if (faker.datatype.boolean(0.8)) {
        createNotification(
          follow.followingId!,
          follow.followerId!,
          'new_follower',
          'tick', // entity type doesn't matter much for follows
          follow.followerId!, // entityId = the follower's userId
          null,
          14,
        );
      }
    }

    // Also generate some new_follower notifications between fake users
    const fakeToFakeFollows = followRecords.filter(
      f => !devUserIds.has(f.followingId!) && !devUserIds.has(f.followerId!),
    );
    for (const follow of faker.helpers.arrayElements(fakeToFakeFollows, Math.min(50, fakeToFakeFollows.length))) {
      createNotification(
        follow.followingId!,
        follow.followerId!,
        'new_follower',
        'tick',
        follow.followerId!,
        null,
        21,
      );
    }

    // 2. comment_on_tick notifications — from the comments we created above
    for (const comment of commentRecords) {
      // Find the tick this comment is on to get the tick owner
      const tick = tickRecords.find(t => t.uuid === comment.entityId);
      if (tick && tick.userId && comment.userId) {
        createNotification(
          tick.userId,
          comment.userId,
          'comment_on_tick',
          'tick',
          tick.uuid!,
          null,
          14,
        );
      }
    }

    // 3. vote_on_tick notifications — for a subset of ticks
    const ticksForVotes = tickRecords.filter(() => faker.datatype.boolean(0.25));
    for (const tick of ticksForVotes) {
      // 1-3 vote notifications per tick
      const voteCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < voteCount; i++) {
        const otherUsers = [...fakeUserIds, ...devUsers.map(u => u.id)].filter(id => id !== tick.userId);
        if (otherUsers.length === 0) continue;

        const voterId = faker.helpers.arrayElement(otherUsers);
        createNotification(
          tick.userId!,
          voterId,
          'vote_on_tick',
          'tick',
          tick.uuid!,
          null,
          14,
        );
      }
    }

    // 4. vote_on_comment notifications — for a subset of comments
    const commentsForVotes = commentRecords.filter(() => faker.datatype.boolean(0.2));
    for (const comment of commentsForVotes) {
      const otherUsers = [...fakeUserIds, ...devUsers.map(u => u.id)].filter(id => id !== comment.userId);
      if (otherUsers.length === 0) continue;

      const voterId = faker.helpers.arrayElement(otherUsers);
      createNotification(
        comment.userId!,
        voterId,
        'vote_on_comment',
        'comment',
        comment.uuid!,
        null,
        14,
      );
    }

    // 5. comment_reply notifications — create some reply chains
    // Pick ~15% of comments to have a reply notification
    const commentsForReplies = commentRecords.filter(() => faker.datatype.boolean(0.15));
    for (const comment of commentsForReplies) {
      const otherUsers = [...fakeUserIds, ...devUsers.map(u => u.id)].filter(id => id !== comment.userId);
      if (otherUsers.length === 0) continue;

      const replierId = faker.helpers.arrayElement(otherUsers);
      createNotification(
        comment.userId!,
        replierId,
        'comment_reply',
        'comment',
        comment.uuid!,
        null,
        10,
      );
    }

    // Shuffle notifications so they're not grouped by type when sorted by createdAt
    const shuffledNotifications = faker.helpers.shuffle(notificationRecords);

    // Batch insert notifications
    for (let i = 0; i < shuffledNotifications.length; i += BATCH_SIZE) {
      const batch = shuffledNotifications.slice(i, i + BATCH_SIZE);
      await db.insert(notifications).values(batch).onConflictDoNothing();
      process.stdout.write(`\r  Notifications: ${Math.min(i + BATCH_SIZE, shuffledNotifications.length)}/${shuffledNotifications.length}`);
    }
    console.log('');

    const unreadNotifications = notificationRecords.filter(n => n.readAt == null).length;
    const devUserNotifications = notificationRecords.filter(n => devUserIds.has(n.recipientId!)).length;
    const devUserUnread = notificationRecords.filter(n => devUserIds.has(n.recipientId!) && n.readAt == null).length;

    // =========================================================================
    // Summary
    // =========================================================================
    const ticksWithBoard = tickRecords.filter(t => t.boardId != null).length;
    const testUserTicks = tickRecords.filter(t => t.userId === TEST_USER_ID).length;

    console.log('\nSeed completed!');
    console.log(`  Fake users: ${fakeUserRecords.length}`);
    console.log(`  User profiles: ${profileRecords.length}`);
    console.log(`  Follow relationships: ${followRecords.length}`);
    console.log(`  User boards: ${boardRecords.length}`);
    console.log(`  Board follows: ${boardFollowRecords.length}`);
    console.log(`  Ascent ticks: ${tickRecords.length} (${testUserTicks} test user, ${ticksWithBoard} linked to boards)`);
    console.log(`  Comments: ${commentRecords.length}`);
    console.log(`  Notifications: ${notificationRecords.length} (${unreadNotifications} unread)`);
    console.log(`    Dev user notifications: ${devUserNotifications} (${devUserUnread} unread)`);

    await close();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedSocialData();
