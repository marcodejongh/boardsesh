import { getPool } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { userSync } from '../../api-wrappers/aurora/userSync';
import { SyncOptions, USER_TABLES, UserSyncData } from '../../api-wrappers/aurora/types';
import { eq, and, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { NeonDatabase } from 'drizzle-orm/neon-serverless';
import { getTable } from '../../db/queries/util/table-select';

async function upsertTableData(
  db: NeonDatabase<Record<string, never>>,
  boardName: BoardName,
  tableName: string,
  userId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
) {
  if (data.length === 0) return;

  switch (tableName) {
    case 'users': {
      const usersSchema = getTable('users', boardName);
      for (const item of data) {
        await db
          .insert(usersSchema)
          .values({
            id: Number(item.id),
            username: item.username,
            createdAt: item.created_at,
          })
          .onConflictDoUpdate({
            target: usersSchema.id,
            set: {
              username: item.username,
            },
          });
      }
      break;
    }

    case 'walls': {
      const wallsSchema = getTable('walls', boardName);
      for (const item of data) {
        await db
          .insert(wallsSchema)
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
            target: wallsSchema.uuid,
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
      const climbsSchema = getTable('climbs', boardName);
      for (const item of data) {
        await db
          .insert(climbsSchema)
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
            target: climbsSchema.uuid,
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
      const ascentsSchema = getTable('ascents', boardName);
      for (const item of data) {
        await db
          .insert(ascentsSchema)
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
            target: ascentsSchema.uuid,
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
      const bidsSchema = getTable('bids', boardName);
      for (const item of data) {
        await db
          .insert(bidsSchema)
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
            target: bidsSchema.uuid,
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
      const tagsSchema = getTable('tags', boardName);
      for (const item of data) {
        // First try to update existing record
        const result = await db
          .update(tagsSchema)
          .set({
            isListed: Boolean(item.is_listed),
          })
          .where(
            and(
              eq(tagsSchema.entityUuid, item.entity_uuid),
              eq(tagsSchema.userId, Number(userId)),
              eq(tagsSchema.name, item.name),
            ),
          )
          .returning();

        // If no record was updated, insert a new one
        if (result.length === 0) {
          await db.insert(tagsSchema).values({
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
      const circuitsSchema = getTable('circuits', boardName);
      for (const item of data) {
        await db
          .insert(circuitsSchema)
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
            target: circuitsSchema.uuid,
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

    case 'circuits_climbs': {
      const circuitsClimbsSchema = getTable('circuitsClimbs', boardName);
      for (const item of data) {
        await db
          .insert(circuitsClimbsSchema)
          .values({
            circuitUuid: item.circuit_uuid,
            climbUuid: item.climb_uuid,
            position: Number(item.position || 0),
          })
          .onConflictDoUpdate({
            target: [circuitsClimbsSchema.circuitUuid, circuitsClimbsSchema.climbUuid],
            set: {
              position: Number(item.position || 0),
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
  tx: NeonDatabase<Record<string, never>>,
  boardName: BoardName,
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

export async function getLastSyncTimes(boardName: BoardName, userId: number, tableNames: string[]) {
  const userSyncsSchema = getTable('userSyncs', boardName);
  const pool = getPool();
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

export async function getLastSharedSyncTimes(boardName: BoardName, tableNames: string[]) {
  const sharedSyncsSchema = getTable('sharedSyncs', boardName);
  const pool = getPool();
  const client = await pool.connect();

  try {
    const db = drizzle(client);
    const result = await db.select().from(sharedSyncsSchema).where(inArray(sharedSyncsSchema.tableName, tableNames));

    return result;
  } finally {
    client.release();
  }
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

        // Process each table - data is directly under table names
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

    return totalResults;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}
