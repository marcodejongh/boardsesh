import { dbz as db } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { userSync } from '../../api-wrappers/aurora/userSync';
import { LastSyncData, SyncOptions, USER_TABLES, UserSyncData, SHARED_SYNC_TABLES } from '../../api-wrappers/aurora/types';
import { eq, and, inArray, ExtractTablesWithRelations } from 'drizzle-orm';
import {
  kilterUsers,
  kilterWalls,
  kilterClimbs,
  kilterAscents,
  kilterBids,
  kilterTags,
  kilterCircuits,
  kilterUserSyncs,
  kilterSharedSyncs,
  tensionUsers,
  tensionWalls,
  tensionClimbs,
  tensionAscents,
  tensionBids,
  tensionTags,
  tensionCircuits,
  tensionUserSyncs,
  tensionSharedSyncs,
} from '@/app/lib/db/schema';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { VercelPgQueryResultHKT } from 'drizzle-orm/vercel-postgres';

// Helper to get the correct schema based on board type
function getSchemas(board: BoardName) {
  if (board === 'kilter') {
    return {
      users: kilterUsers,
      walls: kilterWalls,
      climbs: kilterClimbs,
      ascents: kilterAscents,
      bids: kilterBids,
      tags: kilterTags,
      circuits: kilterCircuits,
      userSyncs: kilterUserSyncs,
      sharedSyncs: kilterSharedSyncs,
    };
  } else if (board === 'tension') {
    return {
      users: tensionUsers,
      walls: tensionWalls,
      climbs: tensionClimbs,
      ascents: tensionAscents,
      bids: tensionBids,
      tags: tensionTags,
      circuits: tensionCircuits,
      userSyncs: tensionUserSyncs,
      sharedSyncs: tensionSharedSyncs,
    };
  }
  throw new Error(`Unsupported board type: ${board}`);
}

async function upsertTableData(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  tableName: string,
  userId: number,
  data: any[],
) {
  if (data.length === 0) return;

  const schemas = getSchemas(boardName);

  switch (tableName) {
    case 'users': {
      for (const item of data) {
        await db
          .insert(schemas.users)
          .values({
            id: Number(item.id),
            username: item.username,
            createdAt: item.created_at,
          })
          .onConflictDoUpdate({
            target: schemas.users.id,
            set: {
              username: item.username,
            },
          });
      }
      break;
    }

    case 'walls': {
      for (const item of data) {
        await db
          .insert(schemas.walls)
          .values({
            uuid: item.uuid,
            userId: Number(userId),
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
            target: schemas.walls.uuid,
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
      for (const item of data) {
        await db
          .insert(schemas.climbs)
          .values({
            uuid: item.uuid,
            layoutId: Number(item.layout_id),
            setterId: Number(userId),
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
            target: schemas.climbs.uuid,
            set: {
              layoutId: Number(item.layout_id),
              setterId: Number(userId),
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
      for (const item of data) {
        await db
          .insert(schemas.ascents)
          .values({
            uuid: item.uuid,
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            userId: Number(userId),
            attemptId: Number(item.attempt_id),
            bidCount: Number(item.bid_count || 1),
            quality: Number(item.quality),
            difficulty: Number(item.difficulty),
            isBenchmark: Number(item.is_benchmark || 0),
            comment: item.comment || '',
            climbedAt: item.climbed_at,
            createdAt: item.created_at,
          })
          .onConflictDoUpdate({
            target: schemas.ascents.uuid,
            set: {
              climbUuid: item.climb_uuid,
              angle: Number(item.angle),
              isMirror: Boolean(item.is_mirror),
              attemptId: Number(item.attempt_id),
              bidCount: Number(item.bid_count || 1),
              quality: Number(item.quality),
              difficulty: Number(item.difficulty),
              isBenchmark: Number(item.is_benchmark || 0),
              comment: item.comment || '',
              climbedAt: item.climbed_at,
            },
          });
      }
      break;
    }

    case 'bids': {
      for (const item of data) {
        await db
          .insert(schemas.bids)
          .values({
            uuid: item.uuid,
            userId: Number(userId),
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            isMirror: Boolean(item.is_mirror),
            bidCount: Number(item.bid_count || 1),
            comment: item.comment || '',
            climbedAt: item.climbed_at,
            createdAt: item.created_at,
          })
          .onConflictDoUpdate({
            target: schemas.bids.uuid,
            set: {
              climbUuid: item.climb_uuid,
              angle: Number(item.angle),
              isMirror: Boolean(item.is_mirror),
              bidCount: Number(item.bid_count || 1),
              comment: item.comment || '',
              climbedAt: item.climbed_at,
            },
          });
      }
      break;
    }

    case 'tags': {
      for (const item of data) {
        // First try to update existing record
        const result = await db
          .update(schemas.tags)
          .set({
            isListed: Boolean(item.is_listed),
          })
          .where(and(
            eq(schemas.tags.entityUuid, item.entity_uuid),
            eq(schemas.tags.userId, Number(userId)),
            eq(schemas.tags.name, item.name)
          ))
          .returning();

        // If no record was updated, insert a new one
        if (result.length === 0) {
          await db
            .insert(schemas.tags)
            .values({
              entityUuid: item.entity_uuid,
              userId: Number(userId),
              name: item.name,
              isListed: Boolean(item.is_listed),
            });
        }
      }
      break;
    }

    case 'circuits': {
      for (const item of data) {
        await db
          .insert(schemas.circuits)
          .values({
            uuid: item.uuid,
            name: item.name,
            description: item.description,
            color: item.color,
            userId: Number(userId),
            isPublic: Boolean(item.is_public),
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          })
          .onConflictDoUpdate({
            target: schemas.circuits.uuid,
            set: {
              name: item.name,
              description: item.description,
              color: item.color,
              isPublic: Boolean(item.is_public),
              updatedAt: item.updated_at,
            },
          });
      }
      break;
    }

    default:
      console.warn(`No specific upsert logic for table: ${tableName}`);
      break;
  }
}

async function updateUserSyncs(
  tx: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  userSyncs: UserSyncData[],
) {
  const schemas = getSchemas(boardName);

  for (const sync of userSyncs) {
    await tx
      .insert(schemas.userSyncs)
      .values({
        userId: Number(sync.user_id),
        tableName: sync.table_name,
        lastSynchronizedAt: sync.last_synchronized_at,
      })
      .onConflictDoUpdate({
        target: [schemas.userSyncs.userId, schemas.userSyncs.tableName],
        set: {
          lastSynchronizedAt: sync.last_synchronized_at,
        },
      });
  }
}

export async function getLastSyncTimes(boardName: BoardName, userId: number, tableNames: string[]) {
  const schemas = getSchemas(boardName);

  const result = await db
    .select()
    .from(schemas.userSyncs)
    .where(and(eq(schemas.userSyncs.userId, Number(userId)), inArray(schemas.userSyncs.tableName, tableNames)));

  return result;
}

export async function getLastSharedSyncTimes(boardName: BoardName, tableNames: string[]) {
  const schemas = getSchemas(boardName);

  const result = await db
    .select()
    .from(schemas.sharedSyncs)
    .where(inArray(schemas.sharedSyncs.tableName, tableNames));

  return result;
}

export async function syncUserData(
  board: BoardName,
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
    const userSyncMap = new Map(
      allSyncTimes.map(sync => [sync.tableName, sync.lastSynchronizedAt])
    );
    
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
      await db.transaction(async (tx) => {
        try {
          // Process each table - new API returns data directly under table name keys
          for (const tableName of tables) {
            console.log(`Syncing ${tableName} for user ${userId} (batch ${syncAttempts})`);
            if (syncResults[tableName] && Array.isArray(syncResults[tableName])) {
              const data = syncResults[tableName];
              await upsertTableData(tx, board, tableName, userId, data);
              
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
          if (syncResults && syncResults['user_syncs']) {
            await updateUserSyncs(tx, board, syncResults['user_syncs']);
            
            // Update sync params for next iteration with new timestamps
            const newUserSyncs = syncResults['user_syncs'].map((sync: any) => ({
              table_name: sync.table_name,
              last_synchronized_at: sync.last_synchronized_at,
              user_id: Number(userId),
            }));
            
            currentSyncParams = {
              ...currentSyncParams,
              userSyncs: newUserSyncs,
            };
          }
        } catch (error) {
          console.error('Failed to commit sync database transaction:', error);
          throw error;
        }
      });

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

    return totalResults;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}
