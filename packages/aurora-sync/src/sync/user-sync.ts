import { userSync } from '../api/user-sync-api.js';
import { SyncOptions, USER_TABLES, UserSyncData, AuroraBoardName } from '../api/types.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Pool } from '@neondatabase/serverless';
import { getTable } from '../db/table-select.js';
import { boardseshTicks, playlists, playlistClimbs, playlistOwnership } from '@boardsesh/db/schema/app';
import { randomUUID } from 'crypto';
import { convertQuality } from './convert-quality.js';

// Batch size for bulk inserts
const BATCH_SIZE = 100;

/**
 * Process data in batches
 */
async function processBatches<T>(
  data: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await processor(batch);
  }
}

async function upsertTableData(
  db: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  tableName: string,
  auroraUserId: number,
  nextAuthUserId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  log: (message: string) => void = console.log,
) {
  if (data.length === 0) return;

  log(`  Upserting ${data.length} rows for ${tableName} in batches of ${BATCH_SIZE}`);

  switch (tableName) {
    case 'users': {
      const usersSchema = getTable('users', boardName);
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          id: Number(item.id),
          username: item.username,
          createdAt: item.created_at,
        }));
        await db
          .insert(usersSchema)
          .values(values)
          .onConflictDoUpdate({
            target: usersSchema.id,
            set: {
              username: sql`excluded.username`,
            },
          });
      });
      break;
    }

    case 'walls': {
      const wallsSchema = getTable('walls', boardName);
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          uuid: item.uuid,
          userId: Number(auroraUserId),
          name: item.name,
          productId: Number(item.product_id),
          isAdjustable: Boolean(item.is_adjustable),
          angle: Number(item.angle),
          layoutId: Number(item.layout_id),
          productSizeId: Number(item.product_size_id),
          hsm: Number(item.hsm),
          serialNumber: item.serial_number,
          createdAt: item.created_at,
        }));
        await db
          .insert(wallsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: wallsSchema.uuid,
            set: {
              name: sql`excluded.name`,
              isAdjustable: sql`excluded.is_adjustable`,
              angle: sql`excluded.angle`,
              layoutId: sql`excluded.layout_id`,
              productSizeId: sql`excluded.product_size_id`,
              hsm: sql`excluded.hsm`,
              serialNumber: sql`excluded.serial_number`,
            },
          });
      });
      break;
    }

    case 'draft_climbs': {
      const climbsSchema = getTable('climbs', boardName);
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          uuid: item.uuid,
          layoutId: Number(item.layout_id),
          setterId: Number(auroraUserId),
          setterUsername: item.setter_username || '',
          name: item.name || 'Untitled Draft',
          description: item.description || '',
          hsm: Number(item.hsm),
          edgeLeft: Number(item.edge_left),
          edgeRight: Number(item.edge_right),
          edgeBottom: Number(item.edge_bottom),
          edgeTop: Number(item.edge_top),
          angle: Number(item.angle),
          framesCount: Number(item.frames_count || 1),
          framesPace: Number(item.frames_pace || 0),
          frames: item.frames || '',
          isDraft: true,
          isListed: false,
          createdAt: item.created_at || new Date().toISOString(),
        }));
        await db
          .insert(climbsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: climbsSchema.uuid,
            set: {
              layoutId: sql`excluded.layout_id`,
              setterId: sql`excluded.setter_id`,
              setterUsername: sql`excluded.setter_username`,
              name: sql`excluded.name`,
              description: sql`excluded.description`,
              hsm: sql`excluded.hsm`,
              edgeLeft: sql`excluded.edge_left`,
              edgeRight: sql`excluded.edge_right`,
              edgeBottom: sql`excluded.edge_bottom`,
              edgeTop: sql`excluded.edge_top`,
              angle: sql`excluded.angle`,
              framesCount: sql`excluded.frames_count`,
              framesPace: sql`excluded.frames_pace`,
              frames: sql`excluded.frames`,
              isDraft: sql`excluded.is_draft`,
              isListed: sql`excluded.is_listed`,
            },
          });
      });
      break;
    }

    case 'ascents': {
      const ascentsSchema = getTable('ascents', boardName);

      // Batch insert to ascents table
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          uuid: item.uuid,
          climbUuid: item.climb_uuid,
          angle: Number(item.angle),
          isMirror: Boolean(item.is_mirror),
          userId: Number(auroraUserId),
          attemptId: Number(item.attempt_id),
          bidCount: Number(item.bid_count || 1),
          quality: Number(item.quality),
          difficulty: Number(item.difficulty),
          isBenchmark: Number(item.is_benchmark || 0),
          comment: item.comment || '',
          climbedAt: item.climbed_at,
          createdAt: item.created_at,
        }));
        await db
          .insert(ascentsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: ascentsSchema.uuid,
            set: {
              climbUuid: sql`excluded.climb_uuid`,
              angle: sql`excluded.angle`,
              isMirror: sql`excluded.is_mirror`,
              attemptId: sql`excluded.attempt_id`,
              bidCount: sql`excluded.bid_count`,
              quality: sql`excluded.quality`,
              difficulty: sql`excluded.difficulty`,
              isBenchmark: sql`excluded.is_benchmark`,
              comment: sql`excluded.comment`,
              climbedAt: sql`excluded.climbed_at`,
            },
          });
      });

      // Dual write to boardsesh_ticks (only if we have NextAuth user ID)
      if (nextAuthUserId) {
        const now = new Date().toISOString();
        await processBatches(data, BATCH_SIZE, async (batch) => {
          const tickValues = batch.map((item) => ({
            uuid: randomUUID(),
            userId: nextAuthUserId,
            boardType: boardName,
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            status: Number(item.attempt_id) === 1 ? 'flash' : 'send',
            attemptCount: Number(item.bid_count || 1),
            quality: convertQuality(item.quality),
            difficulty: item.difficulty ? Number(item.difficulty) : null,
            isBenchmark: Boolean(item.is_benchmark || 0),
            comment: item.comment || '',
            climbedAt: new Date(item.climbed_at).toISOString(),
            createdAt: item.created_at ? new Date(item.created_at).toISOString() : now,
            updatedAt: now,
            auroraType: 'ascents' as const,
            auroraId: item.uuid,
            auroraSyncedAt: now,
          }));
          await db
            .insert(boardseshTicks)
            .values(tickValues)
            .onConflictDoUpdate({
              target: boardseshTicks.auroraId,
              set: {
                climbUuid: sql`excluded.climb_uuid`,
                angle: sql`excluded.angle`,
                isMirror: sql`excluded.is_mirror`,
                status: sql`excluded.status`,
                attemptCount: sql`excluded.attempt_count`,
                quality: sql`excluded.quality`,
                difficulty: sql`excluded.difficulty`,
                isBenchmark: sql`excluded.is_benchmark`,
                comment: sql`excluded.comment`,
                climbedAt: sql`excluded.climbed_at`,
                updatedAt: sql`excluded.updated_at`,
                auroraSyncedAt: sql`excluded.aurora_synced_at`,
              },
            });
        });
      }
      break;
    }

    case 'bids': {
      const bidsSchema = getTable('bids', boardName);

      // Batch insert to bids table
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          uuid: item.uuid,
          userId: Number(auroraUserId),
          climbUuid: item.climb_uuid,
          angle: Number(item.angle),
          isMirror: Boolean(item.is_mirror),
          bidCount: Number(item.bid_count || 1),
          comment: item.comment || '',
          climbedAt: item.climbed_at,
          createdAt: item.created_at,
        }));
        await db
          .insert(bidsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: bidsSchema.uuid,
            set: {
              climbUuid: sql`excluded.climb_uuid`,
              angle: sql`excluded.angle`,
              isMirror: sql`excluded.is_mirror`,
              bidCount: sql`excluded.bid_count`,
              comment: sql`excluded.comment`,
              climbedAt: sql`excluded.climbed_at`,
            },
          });
      });

      // Dual write to boardsesh_ticks (only if we have NextAuth user ID)
      if (nextAuthUserId) {
        const now = new Date().toISOString();
        await processBatches(data, BATCH_SIZE, async (batch) => {
          const tickValues = batch.map((item) => ({
            uuid: randomUUID(),
            userId: nextAuthUserId,
            boardType: boardName,
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            status: 'attempt' as const,
            attemptCount: Number(item.bid_count || 1),
            quality: null,
            difficulty: null,
            isBenchmark: false,
            comment: item.comment || '',
            climbedAt: new Date(item.climbed_at).toISOString(),
            createdAt: new Date(item.created_at).toISOString(),
            updatedAt: now,
            auroraType: 'bids' as const,
            auroraId: item.uuid,
            auroraSyncedAt: now,
          }));
          await db
            .insert(boardseshTicks)
            .values(tickValues)
            .onConflictDoUpdate({
              target: boardseshTicks.auroraId,
              set: {
                climbUuid: sql`excluded.climb_uuid`,
                angle: sql`excluded.angle`,
                isMirror: sql`excluded.is_mirror`,
                attemptCount: sql`excluded.attempt_count`,
                comment: sql`excluded.comment`,
                climbedAt: sql`excluded.climbed_at`,
                updatedAt: sql`excluded.updated_at`,
                auroraSyncedAt: sql`excluded.aurora_synced_at`,
              },
            });
        });
      }
      break;
    }

    case 'tags': {
      // Tags have a composite key, need special handling
      // Use raw SQL for efficient upsert
      const tagsSchema = getTable('tags', boardName);
      await processBatches(data, BATCH_SIZE, async (batch) => {
        for (const item of batch) {
          // First try to update existing record
          const result = await db
            .update(tagsSchema)
            .set({
              isListed: Boolean(item.is_listed),
            })
            .where(
              and(
                eq(tagsSchema.entityUuid, item.entity_uuid),
                eq(tagsSchema.userId, Number(auroraUserId)),
                eq(tagsSchema.name, item.name),
              ),
            )
            .returning();

          // If no record was updated, insert a new one
          if (result.length === 0) {
            await db.insert(tagsSchema).values({
              entityUuid: item.entity_uuid,
              userId: Number(auroraUserId),
              name: item.name,
              isListed: Boolean(item.is_listed),
            });
          }
        }
      });
      break;
    }

    case 'circuits': {
      const circuitsSchema = getTable('circuits', boardName);

      // 1. Write to Aurora circuits table (batched)
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          uuid: item.uuid,
          name: item.name,
          description: item.description,
          color: item.color,
          userId: Number(auroraUserId),
          isPublic: Boolean(item.is_public),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        await db
          .insert(circuitsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: circuitsSchema.uuid,
            set: {
              name: sql`excluded.name`,
              description: sql`excluded.description`,
              color: sql`excluded.color`,
              isPublic: sql`excluded.is_public`,
              updatedAt: sql`excluded.updated_at`,
            },
          });
      });

      // 2. Dual write to playlists table (only if NextAuth user exists)
      if (nextAuthUserId) {
        for (const item of data) {
          // Format color - Aurora uses hex without #, we store with #
          const formattedColor = item.color ? `#${item.color}` : null;

          // Insert/update playlist
          const [playlist] = await db
            .insert(playlists)
            .values({
              uuid: item.uuid, // Use same UUID as Aurora circuit
              boardType: boardName,
              layoutId: null, // Nullable for Aurora-synced circuits
              name: item.name || 'Untitled Circuit',
              description: item.description || null,
              isPublic: Boolean(item.is_public),
              color: formattedColor,
              auroraType: 'circuits',
              auroraId: item.uuid,
              auroraSyncedAt: new Date(),
              createdAt: item.created_at ? new Date(item.created_at) : new Date(),
              updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
            })
            .onConflictDoUpdate({
              target: playlists.auroraId,
              set: {
                name: item.name || 'Untitled Circuit',
                description: item.description || null,
                isPublic: Boolean(item.is_public),
                color: formattedColor,
                updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
                auroraSyncedAt: new Date(),
              },
            })
            .returning({ id: playlists.id });

          // 3. Create ownership if not exists
          await db
            .insert(playlistOwnership)
            .values({
              playlistId: playlist.id,
              userId: nextAuthUserId,
              role: 'owner',
            })
            .onConflictDoNothing();

          // 4. Sync playlist climbs (from nested climbs array)
          if (item.climbs && Array.isArray(item.climbs)) {
            // Delete existing climbs for this playlist to handle removals
            await db.delete(playlistClimbs).where(eq(playlistClimbs.playlistId, playlist.id));

            // Insert new climbs
            for (let i = 0; i < item.climbs.length; i++) {
              const climb = item.climbs[i];
              // Handle different possible structures of climb data
              const climbUuid = climb.climb_uuid || climb.uuid || climb;
              const climbAngle = climb.angle ?? null;
              const climbPosition = climb.position ?? i;

              if (typeof climbUuid === 'string') {
                await db.insert(playlistClimbs).values({
                  playlistId: playlist.id,
                  climbUuid: climbUuid,
                  angle: climbAngle,
                  position: climbPosition,
                });
              }
            }
          }
        }
        log(`  Synced ${data.length} circuits to playlists table`);
      }
      break;
    }

    default:
      log(`  No specific upsert logic for table: ${tableName}`);
      break;
  }
}

async function updateUserSyncs(
  tx: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  userSyncs: UserSyncData[],
) {
  const userSyncsSchema = getTable('userSyncs', boardName);

  for (const sync of userSyncs) {
    await tx
      .insert(userSyncsSchema)
      .values({
        userId: Number(sync.user_id),
        tableName: sync.table_name,
        lastSynchronizedAt: sync.last_synchronized_at,
      })
      .onConflictDoUpdate({
        target: [userSyncsSchema.userId, userSyncsSchema.tableName],
        set: {
          lastSynchronizedAt: sync.last_synchronized_at,
        },
      });
  }
}

export async function getLastSyncTimes(pool: Pool, boardName: AuroraBoardName, userId: number, tableNames: string[]) {
  const userSyncsSchema = getTable('userSyncs', boardName);
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db
      .select()
      .from(userSyncsSchema)
      .where(and(eq(userSyncsSchema.userId, Number(userId)), inArray(userSyncsSchema.tableName, tableNames)));

    return result;
  } finally {
    client.release();
  }
}

export async function getLastSharedSyncTimes(pool: Pool, boardName: AuroraBoardName, tableNames: string[]) {
  const sharedSyncsSchema = getTable('sharedSyncs', boardName);
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db.select().from(sharedSyncsSchema).where(inArray(sharedSyncsSchema.tableName, tableNames));

    return result;
  } finally {
    client.release();
  }
}

export interface SyncUserDataResult {
  [tableName: string]: { synced: number };
}

export async function syncUserData(
  pool: Pool,
  board: AuroraBoardName,
  token: string,
  auroraUserId: number,
  nextAuthUserId: string,
  tables: string[] = USER_TABLES,
  log: (message: string) => void = console.log,
): Promise<SyncUserDataResult> {
  try {
    const syncParams: SyncOptions = {
      tables,
    };

    // Get user sync times
    const allSyncTimes = await getLastSyncTimes(pool, board, auroraUserId, tables);

    // Create a map of existing sync times
    const userSyncMap = new Map(allSyncTimes.map((sync) => [sync.tableName, sync.lastSynchronizedAt]));

    // Ensure all user tables have a sync entry (default to 1970 if not synced)
    const defaultTimestamp = '1970-01-01 00:00:00.000000';

    syncParams.userSyncs = tables.map((tableName) => ({
      table_name: tableName,
      last_synchronized_at: userSyncMap.get(tableName) || defaultTimestamp,
      user_id: Number(auroraUserId),
    }));

    log(`syncParams: ${JSON.stringify(syncParams, null, 2)}`);

    // Initialize results tracking
    const totalResults: SyncUserDataResult = {};

    // Recursive sync until _complete is true
    let currentSyncParams = syncParams;
    let isComplete = false;
    let syncAttempts = 0;
    const maxSyncAttempts = 50; // Prevent infinite loops

    while (!isComplete && syncAttempts < maxSyncAttempts) {
      syncAttempts++;
      log(`Sync attempt ${syncAttempts} for user ${auroraUserId}`);

      const syncResults = await userSync(board, auroraUserId, currentSyncParams, token);
      log(`syncResults: ${JSON.stringify(syncResults, null, 2)}`);

      // Process this batch in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create a drizzle instance for this transaction
        const tx = drizzle(client);

        // Process each table - data is directly under table names
        for (const tableName of tables) {
          log(`Syncing ${tableName} for user ${auroraUserId} (batch ${syncAttempts})`);
          if (syncResults[tableName] && Array.isArray(syncResults[tableName])) {
            const data = syncResults[tableName];

            await upsertTableData(tx, board, tableName, auroraUserId, nextAuthUserId, data, log);

            // Accumulate results
            if (!totalResults[tableName]) {
              totalResults[tableName] = { synced: 0 };
            }
            totalResults[tableName].synced += data.length;
          } else if (!totalResults[tableName]) {
            totalResults[tableName] = { synced: 0 };
          }
        }

        // Update user_syncs table with new sync times from this batch
        if (syncResults['user_syncs']) {
          await updateUserSyncs(tx, board, syncResults['user_syncs']);

          // Update sync params for next iteration with new timestamps
          const newUserSyncs = syncResults['user_syncs'].map(
            (sync: { table_name: string; last_synchronized_at: string }) => ({
              table_name: sync.table_name,
              last_synchronized_at: sync.last_synchronized_at,
              user_id: Number(auroraUserId),
            }),
          );

          currentSyncParams = {
            ...currentSyncParams,
            userSyncs: newUserSyncs,
          };
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        log(`Failed to commit sync database transaction: ${error}`);
        throw error;
      } finally {
        client.release();
      }

      // Check if sync is complete
      isComplete = syncResults._complete !== false;

      if (!isComplete) {
        log(`Sync not complete for user ${auroraUserId}, continuing with next batch...`);
      } else {
        log(`Sync complete for user ${auroraUserId} after ${syncAttempts} attempts`);
      }
    }

    if (syncAttempts >= maxSyncAttempts) {
      log(`Sync reached maximum attempts (${maxSyncAttempts}) for user ${auroraUserId}`);
    }

    return totalResults;
  } catch (error) {
    log(`Error syncing user data: ${error}`);
    throw error;
  }
}
