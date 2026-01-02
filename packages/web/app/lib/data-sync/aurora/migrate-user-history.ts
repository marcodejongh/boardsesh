import { getPool } from '@/app/lib/db/db';
import { BoardName as AuroraBoardName } from '../../api-wrappers/aurora-rest-client/types';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { getTable } from '../../db/queries/util/table-select';
import { boardseshTicks } from '../../db/schema';
import { randomUUID } from 'crypto';
import { eq, and, isNotNull } from 'drizzle-orm';
import { convertQuality } from './convert-quality';

/**
 * Migrate a single user's historical Aurora data to boardsesh_ticks
 * This function is called when:
 * 1. User adds Aurora credentials (user-triggered)
 * 2. Background cron job finds unmigrated users (cron-triggered)
 *
 * @param nextAuthUserId - NextAuth user ID
 * @param boardType - Board type ('kilter' or 'tension')
 * @param auroraUserId - Aurora user ID
 * @returns Object with migrated count
 */
export async function migrateUserAuroraHistory(
  nextAuthUserId: string,
  boardType: AuroraBoardName,
  auroraUserId: number,
): Promise<{ migrated: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const db = drizzle(client);

    // Use advisory lock to prevent concurrent migrations for same user+board
    // Hash the user ID and board type to create a unique lock ID
    const lockId = `${nextAuthUserId}-${boardType}`;
    const lockHash = lockId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const acquired = await client.query('SELECT pg_try_advisory_xact_lock($1)', [lockHash]);

    if (!acquired.rows[0].pg_try_advisory_xact_lock) {
      console.log(`Migration already in progress for user ${nextAuthUserId} (${boardType}), skipping`);
      await client.query('ROLLBACK');
      return { migrated: 0 };
    }

    let totalMigrated = 0;

    // Check if user already has migrated data
    const existingTicks = await db
      .select({ count: boardseshTicks.id })
      .from(boardseshTicks)
      .where(
        and(
          eq(boardseshTicks.userId, nextAuthUserId),
          eq(boardseshTicks.boardType, boardType),
          isNotNull(boardseshTicks.auroraId)
        )
      )
      .limit(1);

    if (existingTicks.length > 0) {
      console.log(`User ${nextAuthUserId} already has migrated data for ${boardType}, skipping`);
      await client.query('COMMIT');
      return { migrated: 0 };
    }

    // Migrate ascents (successful climbs)
    const ascentsSchema = getTable('ascents', boardType);
    const ascents = await db
      .select()
      .from(ascentsSchema)
      .where(eq(ascentsSchema.userId, auroraUserId));

    // Prepare batch insert values for ascents
    const ascentValues = [];
    for (const ascent of ascents) {
      // Skip if missing required fields
      if (!ascent.climbUuid || !ascent.climbedAt) {
        console.warn(`Skipping ascent ${ascent.uuid} - missing required fields`);
        continue;
      }

      const status = Number(ascent.attemptId) === 1 ? ('flash' as const) : ('send' as const);
      const convertedQuality = convertQuality(ascent.quality);

      ascentValues.push({
        uuid: randomUUID(),
        userId: nextAuthUserId,
        boardType: boardType,
        climbUuid: ascent.climbUuid,
        angle: Number(ascent.angle),
        isMirror: Boolean(ascent.isMirror),
        status: status,
        attemptCount: Number(ascent.bidCount || 1),
        quality: convertedQuality,
        difficulty: ascent.difficulty ? Number(ascent.difficulty) : null,
        isBenchmark: Boolean(ascent.isBenchmark || 0),
        comment: ascent.comment || '',
        climbedAt: new Date(ascent.climbedAt).toISOString(),
        createdAt: ascent.createdAt ? new Date(ascent.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auroraType: 'ascents' as const,
        auroraId: ascent.uuid,
        auroraSyncedAt: new Date().toISOString(),
      });
    }

    // Batch insert ascents (if any)
    if (ascentValues.length > 0) {
      await db.insert(boardseshTicks).values(ascentValues);
      totalMigrated += ascentValues.length;
    }

    // Migrate bids (failed attempts)
    const bidsSchema = getTable('bids', boardType);
    const bids = await db
      .select()
      .from(bidsSchema)
      .where(eq(bidsSchema.userId, auroraUserId));

    // Prepare batch insert values for bids
    const bidValues = [];
    for (const bid of bids) {
      // Skip if missing required fields
      if (!bid.climbUuid || !bid.climbedAt) {
        console.warn(`Skipping bid ${bid.uuid} - missing required fields`);
        continue;
      }

      bidValues.push({
        uuid: randomUUID(),
        userId: nextAuthUserId,
        boardType: boardType,
        climbUuid: bid.climbUuid,
        angle: Number(bid.angle),
        isMirror: Boolean(bid.isMirror),
        status: 'attempt' as const,
        attemptCount: Number(bid.bidCount || 1),
        quality: null,
        difficulty: null,
        isBenchmark: false,
        comment: bid.comment || '',
        climbedAt: new Date(bid.climbedAt).toISOString(),
        createdAt: bid.createdAt ? new Date(bid.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auroraType: 'bids' as const,
        auroraId: bid.uuid,
        auroraSyncedAt: new Date().toISOString(),
      });
    }

    // Batch insert bids (if any)
    if (bidValues.length > 0) {
      await db.insert(boardseshTicks).values(bidValues);
      totalMigrated += bidValues.length;
    }

    await client.query('COMMIT');
    console.log(`Migrated ${totalMigrated} historical ticks for user ${nextAuthUserId} on ${boardType}`);

    return { migrated: totalMigrated };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to migrate user Aurora history:', error);
    throw error;
  } finally {
    client.release();
  }
}
