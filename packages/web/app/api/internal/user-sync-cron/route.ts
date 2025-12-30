import { NextResponse } from 'next/server';
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';
import { getPool } from '@/app/lib/db/db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '@/app/lib/crypto';
import { BoardName } from '@/app/lib/types';
import { auroraCredentials } from '@/packages/db/src/schema/auth/mappings';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

const CRON_SECRET = process.env.CRON_SECRET;

interface SyncResult {
  userId: string;
  boardType: string;
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
    const client = await pool.connect();

    try {
      const db = drizzle(client);

      // Get all users with active Aurora credentials
      const credentials = await db
        .select()
        .from(auroraCredentials)
        .where(eq(auroraCredentials.syncStatus, 'active'));

      console.log(`[User Sync Cron] Found ${credentials.length} users with active Aurora credentials`);

      const results = {
        total: credentials.length,
        successful: 0,
        failed: 0,
        errors: [] as SyncResult[],
      };

      // Sync each user sequentially (to avoid overwhelming Aurora API)
      for (const cred of credentials) {
        try {
          if (!cred.auroraToken || !cred.auroraUserId) {
            console.warn(`[User Sync Cron] Skipping user ${cred.userId} (${cred.boardType}): Missing token or user ID`);
            continue;
          }

          const token = decrypt(cred.auroraToken);
          const boardType = cred.boardType as BoardName;

          console.log(`[User Sync Cron] Syncing user ${cred.userId} for ${boardType}...`);

          await syncUserData(boardType, token, cred.auroraUserId);

          // Update last sync time on success
          await db
            .update(auroraCredentials)
            .set({
              lastSyncAt: new Date(),
              syncStatus: 'active',
              syncError: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(auroraCredentials.userId, cred.userId),
                eq(auroraCredentials.boardType, boardType)
              )
            );

          results.successful++;
          console.log(`[User Sync Cron] ✓ Successfully synced user ${cred.userId} for ${boardType}`);
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({
            userId: cred.userId,
            boardType: cred.boardType,
            error: errorMsg,
          });

          // Update sync status to error
          try {
            await db
              .update(auroraCredentials)
              .set({
                syncStatus: 'error',
                syncError: errorMsg,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(auroraCredentials.userId, cred.userId),
                  eq(auroraCredentials.boardType, cred.boardType)
                )
              );
          } catch (updateError) {
            console.error(`[User Sync Cron] Failed to update error status for user ${cred.userId}:`, updateError);
          }

          console.error(`[User Sync Cron] ✗ Failed to sync user ${cred.userId} for ${cred.boardType}:`, errorMsg);
        }
      }

      return NextResponse.json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[User Sync Cron] Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
