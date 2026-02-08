import { userSync } from '../api/user-sync-api';
import { SyncOptions, USER_TABLES, UserSyncData, AuroraBoardName } from '../api/types';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';
import type { Pool } from '@neondatabase/serverless';
import { UNIFIED_TABLES } from '../db/table-select';
import { boardseshTicks, playlists, playlistClimbs, playlistOwnership } from '@boardsesh/db/schema/app';
import { randomUUID } from 'crypto';
import { convertQuality } from './convert-quality';
import {
  validateSyncTimestamp,
  truncate,
  truncateOrNull,
  capRecords,
  STRING_LIMITS,
  VALID_USER_SYNC_TABLES,
} from './sync-validation';

function safeInt(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

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

interface UpsertResult {
  synced: number;
  skipped: number;
  skippedReason?: string;
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
): Promise<UpsertResult> {
  if (data.length === 0) return { synced: 0, skipped: 0 };

  log(`  Upserting ${data.length} rows for ${tableName} in batches of ${BATCH_SIZE}`);

  switch (tableName) {
    case 'users': {
      const usersSchema = UNIFIED_TABLES.users;
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          boardType: boardName,
          id: Number(item.id),
          username: truncate(item.username, STRING_LIMITS.username),
          createdAt: item.created_at,
        }));
        await db
          .insert(usersSchema)
          .values(values)
          .onConflictDoUpdate({
            target: [usersSchema.boardType, usersSchema.id],
            set: {
              username: sql`excluded.username`,
            },
          });
      });
      break;
    }

    case 'walls': {
      const wallsSchema = UNIFIED_TABLES.walls;
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          boardType: boardName,
          uuid: item.uuid,
          userId: Number(auroraUserId),
          name: truncate(item.name, STRING_LIMITS.name),
          productId: Number(item.product_id),
          isAdjustable: Boolean(item.is_adjustable),
          angle: Number(item.angle),
          layoutId: Number(item.layout_id),
          productSizeId: Number(item.product_size_id),
          hsm: Number(item.hsm),
          serialNumber: truncateOrNull(item.serial_number, STRING_LIMITS.serialNumber),
          createdAt: item.created_at,
        }));
        await db
          .insert(wallsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: [wallsSchema.boardType, wallsSchema.uuid],
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
      const climbsSchema = UNIFIED_TABLES.climbs;
      const validData = data.filter((item) => {
        if (!item.uuid) {
          log(`  Warning: skipping draft_climb with missing uuid`);
          return false;
        }
        if (item.layout_id == null || Number.isNaN(Number(item.layout_id))) {
          log(`  Warning: skipping draft_climb ${item.uuid} with invalid layout_id: ${item.layout_id}`);
          return false;
        }
        return true;
      });
      if (validData.length < data.length) {
        log(`  Filtered out ${data.length - validData.length} invalid draft_climbs`);
      }
      await processBatches(validData, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          boardType: boardName,
          uuid: item.uuid,
          layoutId: Number(item.layout_id),
          setterId: safeInt(auroraUserId) ?? Number(auroraUserId),
          setterUsername: truncate(item.setter_username || '', STRING_LIMITS.username),
          name: truncate(item.name || 'Untitled Draft', STRING_LIMITS.name),
          description: truncate(item.description || '', STRING_LIMITS.description),
          hsm: safeInt(item.hsm),
          edgeLeft: safeInt(item.edge_left),
          edgeRight: safeInt(item.edge_right),
          edgeBottom: safeInt(item.edge_bottom),
          edgeTop: safeInt(item.edge_top),
          angle: safeInt(item.angle),
          framesCount: Number(item.frames_count || 1),
          framesPace: Number(item.frames_pace || 0),
          frames: truncate(item.frames || '', STRING_LIMITS.frames),
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
              // Only update fields if existing climb is still a draft.
              // Published climbs (isDraft=false) are fully immutable via sync.
              layoutId: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.layout_id ELSE ${climbsSchema.layoutId} END`,
              setterId: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.setter_id ELSE ${climbsSchema.setterId} END`,
              setterUsername: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.setter_username ELSE ${climbsSchema.setterUsername} END`,
              name: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.name ELSE ${climbsSchema.name} END`,
              description: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.description ELSE ${climbsSchema.description} END`,
              hsm: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.hsm ELSE ${climbsSchema.hsm} END`,
              edgeLeft: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.edge_left ELSE ${climbsSchema.edgeLeft} END`,
              edgeRight: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.edge_right ELSE ${climbsSchema.edgeRight} END`,
              edgeBottom: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.edge_bottom ELSE ${climbsSchema.edgeBottom} END`,
              edgeTop: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.edge_top ELSE ${climbsSchema.edgeTop} END`,
              angle: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.angle ELSE ${climbsSchema.angle} END`,
              framesCount: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.frames_count ELSE ${climbsSchema.framesCount} END`,
              framesPace: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.frames_pace ELSE ${climbsSchema.framesPace} END`,
              frames: sql`CASE WHEN ${climbsSchema.isDraft} = true THEN excluded.frames ELSE ${climbsSchema.frames} END`,
              // Never unpublish: isDraft and isListed stay as-is
              isDraft: sql`${climbsSchema.isDraft}`,
              isListed: sql`${climbsSchema.isListed}`,
            },
          });
      });
      break;
    }

    case 'ascents': {
      // Ascents are now only written to boardsesh_ticks (legacy ascents tables have been dropped)
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
            status: (Number(item.attempt_id) === 1 ? 'flash' : 'send') as 'flash' | 'send' | 'attempt',
            attemptCount: Number(item.bid_count || 1),
            quality: convertQuality(item.quality),
            difficulty: item.difficulty ? Number(item.difficulty) : null,
            isBenchmark: Boolean(item.is_benchmark || 0),
            comment: truncate(item.comment || '', STRING_LIMITS.comment),
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
      } else {
        log(`  Skipping ascents sync: no NextAuth user ID provided`);
        return { synced: 0, skipped: data.length, skippedReason: 'No NextAuth user ID provided' };
      }
      break;
    }

    case 'bids': {
      // Bids are now only written to boardsesh_ticks (legacy bids tables have been dropped)
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
            comment: truncate(item.comment || '', STRING_LIMITS.comment),
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
      } else {
        log(`  Skipping bids sync: no NextAuth user ID provided`);
        return { synced: 0, skipped: data.length, skippedReason: 'No NextAuth user ID provided' };
      }
      break;
    }

    case 'tags': {
      // Tags have a composite key, need special handling
      const tagsSchema = UNIFIED_TABLES.tags;
      await processBatches(data, BATCH_SIZE, async (batch) => {
        for (const item of batch) {
          const tagName = truncate(item.name, STRING_LIMITS.name);
          // First try to update existing record
          const result = await db
            .update(tagsSchema)
            .set({
              isListed: Boolean(item.is_listed),
            })
            .where(
              and(
                eq(tagsSchema.boardType, boardName),
                eq(tagsSchema.entityUuid, item.entity_uuid),
                eq(tagsSchema.userId, Number(auroraUserId)),
                eq(tagsSchema.name, tagName),
              ),
            )
            .returning();

          // If no record was updated, insert a new one
          if (result.length === 0) {
            await db.insert(tagsSchema).values({
              boardType: boardName,
              entityUuid: item.entity_uuid,
              userId: Number(auroraUserId),
              name: tagName,
              isListed: Boolean(item.is_listed),
            });
          }
        }
      });
      break;
    }

    case 'circuits': {
      const circuitsSchema = UNIFIED_TABLES.circuits;

      // 1. Write to unified circuits table (batched)
      await processBatches(data, BATCH_SIZE, async (batch) => {
        const values = batch.map((item) => ({
          boardType: boardName,
          uuid: item.uuid,
          name: truncate(item.name, STRING_LIMITS.name),
          description: truncateOrNull(item.description, STRING_LIMITS.description),
          color: truncateOrNull(item.color, STRING_LIMITS.color),
          userId: Number(auroraUserId),
          isPublic: Boolean(item.is_public),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
        await db
          .insert(circuitsSchema)
          .values(values)
          .onConflictDoUpdate({
            target: [circuitsSchema.boardType, circuitsSchema.uuid],
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
          const circuitName = truncate(item.name, STRING_LIMITS.name);
          const circuitDescription = truncateOrNull(item.description, STRING_LIMITS.description);
          const circuitColor = truncateOrNull(item.color, STRING_LIMITS.color);
          // Format color - Aurora uses hex without #, we store with #
          const formattedColor = circuitColor ? `#${circuitColor}` : null;

          // Insert/update playlist
          const [playlist] = await db
            .insert(playlists)
            .values({
              uuid: item.uuid, // Use same UUID as Aurora circuit
              boardType: boardName,
              layoutId: null, // Nullable for Aurora-synced circuits
              name: circuitName || 'Untitled Circuit',
              description: circuitDescription || null,
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
                name: circuitName || 'Untitled Circuit',
                description: circuitDescription || null,
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
      return { synced: 0, skipped: data.length, skippedReason: `No upsert logic for table: ${tableName}` };
  }

  return { synced: data.length, skipped: 0 };
}

async function updateUserSyncs(
  tx: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  userSyncs: UserSyncData[],
) {
  const userSyncsSchema = UNIFIED_TABLES.userSyncs;

  for (const sync of userSyncs) {
    // Validate table_name against known list
    if (!VALID_USER_SYNC_TABLES.has(sync.table_name)) {
      console.warn(`[sync-validation] Skipping unknown user_sync table_name: ${String(sync.table_name).slice(0, 100)}`);
      continue;
    }

    // Validate timestamp
    const validatedTimestamp = validateSyncTimestamp(sync.last_synchronized_at);
    if (!validatedTimestamp) {
      console.warn(`[sync-validation] Skipping user_sync for ${sync.table_name}: invalid timestamp`);
      continue;
    }

    await tx
      .insert(userSyncsSchema)
      .values({
        boardType: boardName,
        userId: Number(sync.user_id),
        tableName: sync.table_name,
        lastSynchronizedAt: validatedTimestamp,
      })
      .onConflictDoUpdate({
        target: [userSyncsSchema.boardType, userSyncsSchema.userId, userSyncsSchema.tableName],
        set: {
          lastSynchronizedAt: validatedTimestamp,
        },
      });
  }
}

export async function getLastSyncTimes(pool: Pool, boardName: AuroraBoardName, userId: number, tableNames: string[]) {
  const userSyncsSchema = UNIFIED_TABLES.userSyncs;
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db
      .select()
      .from(userSyncsSchema)
      .where(
        and(
          eq(userSyncsSchema.boardType, boardName),
          eq(userSyncsSchema.userId, Number(userId)),
          inArray(userSyncsSchema.tableName, tableNames),
        ),
      );

    return result;
  } finally {
    client.release();
  }
}

export async function getLastSharedSyncTimes(pool: Pool, boardName: AuroraBoardName, tableNames: string[]) {
  const sharedSyncsSchema = UNIFIED_TABLES.sharedSyncs;
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db
      .select()
      .from(sharedSyncsSchema)
      .where(
        and(eq(sharedSyncsSchema.boardType, boardName), inArray(sharedSyncsSchema.tableName, tableNames)),
      );

    return result;
  } finally {
    client.release();
  }
}

export interface SyncTableResult {
  synced: number;
  skipped?: number;
  skippedReason?: string;
}

export interface SyncUserDataResult {
  [tableName: string]: SyncTableResult;
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

    log(`Syncing ${tables.length} tables for user ${auroraUserId}`);

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
            const data = capRecords(syncResults[tableName], tableName);

            const upsertResult = await upsertTableData(tx, board, tableName, auroraUserId, nextAuthUserId, data, log);

            // Accumulate results
            if (!totalResults[tableName]) {
              totalResults[tableName] = { synced: 0 };
            }
            totalResults[tableName].synced += upsertResult.synced;
            if (upsertResult.skipped > 0) {
              totalResults[tableName].skipped = (totalResults[tableName].skipped || 0) + upsertResult.skipped;
              totalResults[tableName].skippedReason = upsertResult.skippedReason;
            }
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
        // Extract meaningful error message from PostgreSQL/Drizzle errors
        const errorMessage =
          error instanceof Error
            ? error.message.includes('violates foreign key constraint')
              ? `FK constraint violation: ${error.message.split('violates foreign key constraint')[1]?.split('"')[1] || 'unknown'}`
              : error.message.slice(0, 2000)
            : String(error).slice(0, 2000);
        log(`Database error: ${errorMessage}`);
        throw new Error(`Database error: ${errorMessage}`);
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
