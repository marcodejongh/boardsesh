import { getPool } from '@/app/lib/db/db';
import { userSync } from '../../api-wrappers/aurora/userSync';
import { SyncOptions, USER_TABLES, UserSyncData, AuroraBoardName } from '../../api-wrappers/aurora/types';
import { eq, and, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { UNIFIED_TABLES } from '../../db/queries/util/table-select';
import { boardseshTicks, auroraCredentials, playlists, playlistClimbs, playlistOwnership } from '../../db/schema';
import { randomUUID } from 'crypto';
import { convertQuality } from './convert-quality';
import { buildInferredSessionsForUser } from './inferred-session-builder';

/**
 * Get NextAuth user ID from Aurora user ID
 */
async function getNextAuthUserId(
  db: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  auroraUserId: number,
): Promise<string | null> {
  const result = await db
    .select({ userId: auroraCredentials.userId })
    .from(auroraCredentials)
    .where(and(eq(auroraCredentials.boardType, boardName), eq(auroraCredentials.auroraUserId, auroraUserId)))
    .limit(1);

  return result[0]?.userId || null;
}

async function upsertTableData(
  db: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  tableName: string,
  auroraUserId: number,
  nextAuthUserId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
) {
  if (data.length === 0) return;

  switch (tableName) {
    case 'users': {
      const usersSchema = UNIFIED_TABLES.users;
      for (const item of data) {
        await db
          .insert(usersSchema)
          .values({
            boardType: boardName,
            id: Number(item.id),
            username: item.username,
            createdAt: item.created_at,
          })
          .onConflictDoUpdate({
            target: [usersSchema.boardType, usersSchema.id],
            set: {
              username: item.username,
            },
          });
      }
      break;
    }

    case 'walls': {
      const wallsSchema = UNIFIED_TABLES.walls;
      for (const item of data) {
        await db
          .insert(wallsSchema)
          .values({
            boardType: boardName,
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
          })
          .onConflictDoUpdate({
            target: [wallsSchema.boardType, wallsSchema.uuid],
            set: {
              name: item.name,
              isAdjustable: Boolean(item.is_adjustable),
              angle: Number(item.angle),
              layoutId: Number(item.layout_id),
              productSizeId: Number(item.product_size_id),
              hsm: Number(item.hsm),
              serialNumber: item.serial_number,
            },
          });
      }
      break;
    }

    case 'draft_climbs': {
      const climbsSchema = UNIFIED_TABLES.climbs;
      for (const item of data) {
        await db
          .insert(climbsSchema)
          .values({
            uuid: item.uuid,
            boardType: boardName,
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
          })
          .onConflictDoUpdate({
            target: climbsSchema.uuid,
            set: {
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
            },
          });
      }
      break;
    }

    case 'ascents': {
      // Write directly to boardsesh_ticks (requires NextAuth user ID)
      for (const item of data) {
        const status = Number(item.attempt_id) === 1 ? 'flash' : 'send';
        const convertedQuality = convertQuality(item.quality);

        await db
          .insert(boardseshTicks)
          .values({
            uuid: randomUUID(),
            userId: nextAuthUserId,
            boardType: boardName,
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            status: status,
            attemptCount: Number(item.bid_count || 1),
            quality: convertedQuality,
            difficulty: item.difficulty ? Number(item.difficulty) : null,
            isBenchmark: Boolean(item.is_benchmark || 0),
            comment: item.comment || '',
            climbedAt: new Date(item.climbed_at).toISOString(),
            createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            auroraType: 'ascents',
            auroraId: item.uuid,
            auroraSyncedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: boardseshTicks.auroraId,
            set: {
              climbUuid: item.climb_uuid,
              angle: Number(item.angle),
              isMirror: Boolean(item.is_mirror),
              status: status,
              attemptCount: Number(item.bid_count || 1),
              quality: convertedQuality,
              difficulty: item.difficulty ? Number(item.difficulty) : null,
              isBenchmark: Boolean(item.is_benchmark || 0),
              comment: item.comment || '',
              climbedAt: new Date(item.climbed_at).toISOString(),
              updatedAt: new Date().toISOString(),
              auroraSyncedAt: new Date().toISOString(),
            },
          });
      }
      break;
    }

    case 'bids': {
      // Write directly to boardsesh_ticks (requires NextAuth user ID)
      for (const item of data) {
        await db
          .insert(boardseshTicks)
          .values({
            uuid: randomUUID(),
            userId: nextAuthUserId,
            boardType: boardName,
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            status: 'attempt',
            attemptCount: Number(item.bid_count || 1),
            quality: null,
            difficulty: null,
            isBenchmark: false,
            comment: item.comment || '',
            climbedAt: new Date(item.climbed_at).toISOString(),
            createdAt: new Date(item.created_at).toISOString(),
            updatedAt: new Date().toISOString(),
            auroraType: 'bids',
            auroraId: item.uuid,
            auroraSyncedAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: boardseshTicks.auroraId,
            set: {
              climbUuid: item.climb_uuid,
              angle: Number(item.angle),
              isMirror: Boolean(item.is_mirror),
              attemptCount: Number(item.bid_count || 1),
              comment: item.comment || '',
              climbedAt: new Date(item.climbed_at).toISOString(),
              updatedAt: new Date().toISOString(),
              auroraSyncedAt: new Date().toISOString(),
            },
          });
      }
      break;
    }

    case 'tags': {
      const tagsSchema = UNIFIED_TABLES.tags;
      for (const item of data) {
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
              eq(tagsSchema.name, item.name),
            ),
          )
          .returning();

        // If no record was updated, insert a new one
        if (result.length === 0) {
          await db.insert(tagsSchema).values({
            boardType: boardName,
            entityUuid: item.entity_uuid,
            userId: Number(auroraUserId),
            name: item.name,
            isListed: Boolean(item.is_listed),
          });
        }
      }
      break;
    }

    case 'circuits': {
      const circuitsSchema = UNIFIED_TABLES.circuits;
      for (const item of data) {
        // 1. Write to unified circuits table
        await db
          .insert(circuitsSchema)
          .values({
            boardType: boardName,
            uuid: item.uuid,
            name: item.name,
            description: item.description,
            color: item.color,
            userId: Number(auroraUserId),
            isPublic: Boolean(item.is_public),
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          })
          .onConflictDoUpdate({
            target: [circuitsSchema.boardType, circuitsSchema.uuid],
            set: {
              name: item.name,
              description: item.description,
              color: item.color,
              isPublic: Boolean(item.is_public),
              updatedAt: item.updated_at,
            },
          });

        // 2. Dual write to playlists table (only if NextAuth user exists)
        if (nextAuthUserId) {
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
      }
      break;
    }

    default:
      console.warn(`No specific upsert logic for table: ${tableName}`);
      break;
  }
}

async function updateUserSyncs(
  tx: NeonDatabase<Record<string, never>>,
  boardName: AuroraBoardName,
  userSyncs: UserSyncData[],
) {
  const userSyncsSchema = UNIFIED_TABLES.userSyncs;

  for (const sync of userSyncs) {
    await tx
      .insert(userSyncsSchema)
      .values({
        boardType: boardName,
        userId: Number(sync.user_id),
        tableName: sync.table_name,
        lastSynchronizedAt: sync.last_synchronized_at,
      })
      .onConflictDoUpdate({
        target: [userSyncsSchema.boardType, userSyncsSchema.userId, userSyncsSchema.tableName],
        set: {
          lastSynchronizedAt: sync.last_synchronized_at,
        },
      });
  }
}

export async function getLastSyncTimes(boardName: AuroraBoardName, userId: number, tableNames: string[]) {
  const userSyncsSchema = UNIFIED_TABLES.userSyncs;
  const pool = getPool();
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

export async function getLastSharedSyncTimes(boardName: AuroraBoardName, tableNames: string[]) {
  const sharedSyncsSchema = UNIFIED_TABLES.sharedSyncs;
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db
      .select()
      .from(sharedSyncsSchema)
      .where(and(eq(sharedSyncsSchema.boardType, boardName), inArray(sharedSyncsSchema.tableName, tableNames)));

    return result;
  } finally {
    client.release();
  }
}

export async function syncUserData(
  board: AuroraBoardName,
  token: string,
  userId: number,
  tables: string[] = USER_TABLES,
): Promise<Record<string, { synced: number }>> {
  try {
    const syncParams: SyncOptions = {
      tables,
    };

    // Get user sync times
    const allSyncTimes = await getLastSyncTimes(board, userId, tables);

    // Create a map of existing sync times
    const userSyncMap = new Map(allSyncTimes.map((sync) => [sync.tableName, sync.lastSynchronizedAt]));

    // Ensure all user tables have a sync entry (default to 1970 if not synced)
    const defaultTimestamp = '1970-01-01 00:00:00.000000';

    syncParams.userSyncs = tables.map((tableName) => ({
      table_name: tableName,
      last_synchronized_at: userSyncMap.get(tableName) || defaultTimestamp,
      user_id: Number(userId),
    }));

    console.log('syncParams', syncParams);

    // Initialize results tracking
    const totalResults: Record<string, { synced: number }> = {};

    // Recursive sync until _complete is true
    let currentSyncParams = syncParams;
    let isComplete = false;
    let syncAttempts = 0;
    const maxSyncAttempts = 50; // Prevent infinite loops

    while (!isComplete && syncAttempts < maxSyncAttempts) {
      syncAttempts++;
      console.log(`Sync attempt ${syncAttempts} for user ${userId}`);

      const syncResults = await userSync(board, userId, currentSyncParams, token);
      console.log('syncResults', syncResults);

      // Process this batch in a transaction
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Create a drizzle instance for this transaction
        const tx = drizzle(client);

        // Get NextAuth user ID for dual write to boardsesh_ticks
        const nextAuthUserId = await getNextAuthUserId(tx, board, userId);
        if (!nextAuthUserId) {
          console.warn(`No NextAuth user found for Aurora user ${userId} on ${board}, skipping ascents/bids sync`);
          // We can still sync other tables (users, walls, etc.) that don't need NextAuth user ID
        }

        // Process each table - data is directly under table names
        for (const tableName of tables) {
          console.log(`Syncing ${tableName} for user ${userId} (batch ${syncAttempts})`);
          if (syncResults[tableName] && Array.isArray(syncResults[tableName])) {
            const data = syncResults[tableName];

            // Skip ascents/bids if no NextAuth user (can't dual write)
            if ((tableName === 'ascents' || tableName === 'bids') && !nextAuthUserId) {
              console.warn(`Skipping ${tableName} sync for Aurora user ${userId} - no NextAuth mapping`);
              continue;
            }

            await upsertTableData(tx, board, tableName, userId, nextAuthUserId || '', data);

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
              user_id: Number(userId),
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
        console.error('Failed to commit sync database transaction:', error);
        throw error;
      } finally {
        client.release();
      }

      // Check if sync is complete
      isComplete = syncResults._complete !== false;

      if (!isComplete) {
        console.log(`Sync not complete for user ${userId}, continuing with next batch...`);
      } else {
        console.log(`Sync complete for user ${userId} after ${syncAttempts} attempts`);
      }
    }

    if (syncAttempts >= maxSyncAttempts) {
      console.warn(`Sync reached maximum attempts (${maxSyncAttempts}) for user ${userId}`);
    }

    // Build inferred sessions for any newly-imported ticks
    const hasTickData = (totalResults['ascents']?.synced ?? 0) > 0 || (totalResults['bids']?.synced ?? 0) > 0;
    if (hasTickData) {
      try {
        const pool = getPool();
        const client = await pool.connect();
        try {
          const tx = drizzle(client);
          const nextAuthUserId = await getNextAuthUserId(tx, board, userId);
          if (nextAuthUserId) {
            const assigned = await buildInferredSessionsForUser(nextAuthUserId);
            if (assigned > 0) {
              console.log(`Built inferred sessions: assigned ${assigned} ticks for user ${nextAuthUserId}`);
            }
          }
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Error building inferred sessions after sync:', error);
      }
    }

    return totalResults;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}
