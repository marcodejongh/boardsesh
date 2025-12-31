import { getPool } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { getTable } from '../../db/queries/util/table-select';
import { boardseshTicks } from '../../db/schema';
import { randomUUID } from 'crypto';
import { eq, and, isNotNull } from 'drizzle-orm';

/**
 * Convert Aurora quality (1-5) to Boardsesh quality (1-5)
 * Formula: quality / 3.0 * 5
 */
function convertQuality(auroraQuality: number | null | undefined): number | null {
  if (auroraQuality == null) return null;
  return Math.round((auroraQuality / 3.0) * 5);
}

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
  boardType: BoardName,
  auroraUserId: number,
): Promise<{ migrated: number }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const db = drizzle(client);

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

    for (const ascent of ascents) {
      const status = Number(ascent.attemptId) === 1 ? 'flash' : 'send';
      const convertedQuality = convertQuality(ascent.quality);

      await db.insert(boardseshTicks).values({
        uuid: randomUUID(),
        userId: nextAuthUserId,
        boardType: boardType,
        climbUuid: ascent.climbUuid,
        angle: Number(ascent.angle),
        isMirror: Boolean(ascent.isMirror),
        status: status,
        attemptCount: Number(ascent.bidCount || 1),
        quality: convertedQuality,
        difficulty: Number(ascent.difficulty),
        isBenchmark: Boolean(ascent.isBenchmark || 0),
        comment: ascent.comment || '',
        climbedAt: new Date(ascent.climbedAt).toISOString(),
        createdAt: new Date(ascent.createdAt).toISOString(),
        updatedAt: new Date().toISOString(),
        auroraType: 'ascents',
        auroraId: ascent.uuid,
        auroraSyncedAt: new Date().toISOString(),
      });

      totalMigrated++;
    }

    // Migrate bids (failed attempts)
    const bidsSchema = getTable('bids', boardType);
    const bids = await db
      .select()
      .from(bidsSchema)
      .where(eq(bidsSchema.userId, auroraUserId));

    for (const bid of bids) {
      await db.insert(boardseshTicks).values({
        uuid: randomUUID(),
        userId: nextAuthUserId,
        boardType: boardType,
        climbUuid: bid.climbUuid,
        angle: Number(bid.angle),
        isMirror: Boolean(bid.isMirror),
        status: 'attempt',
        attemptCount: Number(bid.bidCount || 1),
        quality: null,
        difficulty: null,
        isBenchmark: false,
        comment: bid.comment || '',
        climbedAt: new Date(bid.climbedAt).toISOString(),
        createdAt: new Date(bid.createdAt).toISOString(),
        updatedAt: new Date().toISOString(),
        auroraType: 'bids',
        auroraId: bid.uuid,
        auroraSyncedAt: new Date().toISOString(),
      });

      totalMigrated++;
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
