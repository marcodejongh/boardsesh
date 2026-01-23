/**
 * Backfill script to compute and populate holds_hash for existing climbs.
 *
 * Run this script after applying the migration that adds the holds_hash column.
 * It will process climbs in batches to avoid memory issues with large datasets.
 *
 * Usage:
 *   cd packages/db
 *   npx tsx scripts/backfill-holds-hash.ts
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq, isNull, and } from 'drizzle-orm';
import { boardClimbs } from '../src/schema/boards/unified';

// Import the holds hash utility
// Since this is a standalone script, we need to include the logic here
interface HoldStatePair {
  holdId: number;
  roleCode: number;
}

function parseFramesToHoldStatePairs(frames: string): HoldStatePair[] {
  const pairs: HoldStatePair[] = [];
  const frameStrings = frames.split(',').filter(Boolean);

  for (const frameString of frameStrings) {
    const holdMatches = frameString.matchAll(/p(\d+)r(\d+)/g);
    for (const match of holdMatches) {
      pairs.push({
        holdId: parseInt(match[1], 10),
        roleCode: parseInt(match[2], 10),
      });
    }
  }

  return pairs;
}

function generateHoldsHash(frames: string): string {
  if (!frames || frames.trim() === '') {
    return '';
  }

  const pairs = parseFramesToHoldStatePairs(frames);

  if (pairs.length === 0) {
    return '';
  }

  pairs.sort((a, b) => {
    if (a.holdId !== b.holdId) {
      return a.holdId - b.holdId;
    }
    return a.roleCode - b.roleCode;
  });

  return pairs.map(p => `${p.holdId}:${p.roleCode}`).join('|');
}

async function backfillHoldsHash() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const BATCH_SIZE = 1000;
  let totalProcessed = 0;
  let totalUpdated = 0;

  console.log('Starting holds_hash backfill...');

  // Process climbs without a holds_hash
  while (true) {
    // Fetch a batch of climbs that need processing
    const climbs = await db
      .select({
        uuid: boardClimbs.uuid,
        frames: boardClimbs.frames,
        boardType: boardClimbs.boardType,
        layoutId: boardClimbs.layoutId,
      })
      .from(boardClimbs)
      .where(isNull(boardClimbs.holdsHash))
      .limit(BATCH_SIZE);

    if (climbs.length === 0) {
      console.log('No more climbs to process.');
      break;
    }

    console.log(`Processing batch of ${climbs.length} climbs...`);

    // Update each climb with its computed hash
    for (const climb of climbs) {
      if (climb.frames) {
        const hash = generateHoldsHash(climb.frames);
        if (hash) {
          await db
            .update(boardClimbs)
            .set({ holdsHash: hash })
            .where(eq(boardClimbs.uuid, climb.uuid));
          totalUpdated++;
        }
      }
      totalProcessed++;
    }

    console.log(`Processed ${totalProcessed} climbs, updated ${totalUpdated} with hash...`);
  }

  console.log(`\nBackfill complete!`);
  console.log(`Total climbs processed: ${totalProcessed}`);
  console.log(`Total climbs updated with hash: ${totalUpdated}`);
}

backfillHoldsHash().catch(console.error);
