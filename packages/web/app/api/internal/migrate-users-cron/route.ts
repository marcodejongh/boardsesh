import { NextResponse } from 'next/server';
import { migrateUserAuroraHistory } from '@/app/lib/data-sync/aurora/migrate-user-history';
import { getPool } from '@/app/lib/db/db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, sql } from 'drizzle-orm';
import { BoardName } from '@/app/lib/types';
import * as schema from '@/app/lib/db/schema';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

const CRON_SECRET = process.env.CRON_SECRET;

interface MigrationResult {
  userId: string;
  boardType: string;
  migrated?: number;
  error?: string;
}

export async function GET(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (process.env.VERCEL_ENV !== 'development' && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();

    // Find users with aurora_credentials but no migrated ticks
    let unmigratedUsers;
    {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT DISTINCT
            ac.user_id,
            ac.board_type,
            ac.aurora_user_id
          FROM aurora_credentials ac
          WHERE ac.sync_status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM boardsesh_ticks bt
              WHERE bt.user_id = ac.user_id
                AND bt.board_type = ac.board_type
                AND bt.aurora_id IS NOT NULL
            )
          LIMIT 10
        `);
        unmigratedUsers = result.rows;
      } finally {
        client.release();
      }
    }

    console.log(`[Migrate Users Cron] Found ${unmigratedUsers.length} users with unmigrated Aurora data`);

    const results = {
      total: unmigratedUsers.length,
      successful: 0,
      failed: 0,
      totalMigrated: 0,
      errors: [] as MigrationResult[],
    };

    // Migrate each user sequentially
    for (const user of unmigratedUsers) {
      try {
        console.log(`[Migrate Users Cron] Migrating user ${user.user_id} (${user.board_type})`);

        const result = await migrateUserAuroraHistory(
          user.user_id,
          user.board_type as BoardName,
          user.aurora_user_id
        );

        results.successful++;
        results.totalMigrated += result.migrated;

        console.log(`[Migrate Users Cron] Successfully migrated ${result.migrated} ticks for user ${user.user_id}`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Migrate Users Cron] Failed to migrate user ${user.user_id}:`, errorMessage);

        results.errors.push({
          userId: user.user_id,
          boardType: user.board_type,
          error: errorMessage,
        });

        // Update sync status in aurora_credentials to reflect error
        const client = await pool.connect();
        try {
          const db = drizzle(client);
          await db
            .update(schema.auroraCredentials)
            .set({
              syncStatus: 'error',
              syncError: `Migration failed: ${errorMessage}`,
              updatedAt: new Date(),
            })
            .where(
              sql`${schema.auroraCredentials.userId} = ${user.user_id} AND ${schema.auroraCredentials.boardType} = ${user.board_type}`
            );
        } catch (updateError) {
          console.error(`[Migrate Users Cron] Failed to update error status:`, updateError);
        } finally {
          client.release();
        }
      }
    }

    console.log(
      `[Migrate Users Cron] Completed: ${results.successful}/${results.total} users, ${results.totalMigrated} ticks migrated`
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Migrate Users Cron] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
