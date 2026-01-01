import { NextResponse } from 'next/server';
import { syncUserData } from '@/app/lib/data-sync/aurora/user-sync';
import { getPool } from '@/app/lib/db/db';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import { decrypt } from '@/app/lib/crypto';
import { BoardName } from '@/app/lib/types';
import * as schema from '@/app/lib/db/schema';

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

    // Get credentials list - acquire and release connection immediately
    // Include both 'active' and 'error' status to retry failed syncs
    let credentials;
    {
      const client = await pool.connect();
      try {
        const db = drizzle(client);
        credentials = await db
          .select()
          .from(schema.auroraCredentials)
          .where(
            and(
              or(
                eq(schema.auroraCredentials.syncStatus, 'active'),
                eq(schema.auroraCredentials.syncStatus, 'error')
              ),
              isNotNull(schema.auroraCredentials.auroraToken)
            )
          );
      } finally {
        client.release();
      }
    }

    console.log(`[User Sync Cron] Found ${credentials.length} users with Aurora credentials to sync (active + retry)`);

    const results = {
      total: credentials.length,
      successful: 0,
      failed: 0,
      errors: [] as SyncResult[],
    };

    // Sync each user sequentially (to avoid overwhelming Aurora API)
    // Each iteration acquires its own connections as needed
    for (const cred of credentials) {
      try {
        if (!cred.auroraToken || !cred.auroraUserId) {
          console.warn(`[User Sync Cron] Skipping user ${cred.userId} (${cred.boardType}): Missing token or user ID`);
          continue;
        }

        // Decrypt token - handle errors gracefully
        let token: string;
        try {
          token = decrypt(cred.auroraToken);
        } catch (decryptError) {
          const errorMsg = `Failed to decrypt credentials: ${decryptError instanceof Error ? decryptError.message : 'Unknown error'}`;
          console.error(`[User Sync Cron] ${errorMsg} for user ${cred.userId} (${cred.boardType})`);

          results.failed++;
          results.errors.push({
            userId: cred.userId,
            boardType: cred.boardType,
            error: errorMsg,
          });

          // Update status to error
          const updateClient = await pool.connect();
          try {
            const updateDb = drizzle(updateClient);
            await updateDb
              .update(schema.auroraCredentials)
              .set({
                syncStatus: 'error',
                syncError: errorMsg,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.auroraCredentials.userId, cred.userId),
                  eq(schema.auroraCredentials.boardType, cred.boardType)
                )
              );
          } finally {
            updateClient.release();
          }

          continue;
        }

        const boardType = cred.boardType as BoardName;

        console.log(`[User Sync Cron] Syncing user ${cred.userId} for ${boardType}...`);

        // syncUserData manages its own connections internally
        await syncUserData(boardType, token, cred.auroraUserId);

        // Update last sync time on success - acquire new connection
        const updateClient = await pool.connect();
        try {
          const updateDb = drizzle(updateClient);
          await updateDb
            .update(schema.auroraCredentials)
            .set({
              lastSyncAt: new Date(),
              syncStatus: 'active',
              syncError: null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.auroraCredentials.userId, cred.userId),
                eq(schema.auroraCredentials.boardType, boardType)
              )
            );
        } finally {
          updateClient.release();
        }

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

        // Update sync status to error - acquire new connection
        const updateClient = await pool.connect();
        try {
          const updateDb = drizzle(updateClient);
          await updateDb
            .update(schema.auroraCredentials)
            .set({
              syncStatus: 'error',
              syncError: errorMsg,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(schema.auroraCredentials.userId, cred.userId),
                eq(schema.auroraCredentials.boardType, cred.boardType)
              )
            );
        } catch (updateError) {
          console.error(`[User Sync Cron] Failed to update error status for user ${cred.userId}:`, updateError);
        } finally {
          updateClient.release();
        }

        console.error(`[User Sync Cron] ✗ Failed to sync user ${cred.userId} for ${cred.boardType}:`, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
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
