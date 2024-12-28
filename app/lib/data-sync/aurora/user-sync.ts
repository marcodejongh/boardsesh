import { dbz as db } from '@/lib/db';
import { BoardName } from '../../types';
import { userSync } from '../../api-wrappers/aurora/userSync';
import { LastSyncData, SyncOptions, USER_TABLES, UserSyncData } from '../../api-wrappers/aurora/types';
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
  tensionUsers,
  tensionWalls,
  tensionClimbs,
  tensionAscents,
  tensionBids,
  tensionTags,
  tensionCircuits,
  tensionUserSyncs,
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
    };
  }
  throw new Error(`Unsupported board type: ${board}`);
}

async function upsertTableData(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  tableName: string,
  userId: string,
  data: any[],
) {
  if (data.length === 0) return;

  const schemas = getSchemas(boardName);

  return db.transaction(async (tx) => {
    switch (tableName) {
      case 'users': {
        for (const item of data) {
          await tx
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
          await tx
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
          await tx
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
          await tx
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
          await tx
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
          await tx
            .insert(schemas.tags)
            .values({
              entityUuid: item.entity_uuid,
              userId: Number(userId),
              name: item.name,
              isListed: Boolean(item.is_listed),
            })
            .onConflictDoUpdate({
              target: [schemas.tags.entityUuid, schemas.tags.userId, schemas.tags.name],
              set: {
                isListed: Boolean(item.is_listed),
              },
            });
        }
        break;
      }

      case 'circuits': {
        for (const item of data) {
          await tx
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
  });
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

export async function getLastSyncTimes(boardName: BoardName, userId: string, tableNames: string[]) {
  const schemas = getSchemas(boardName);

  const result = await db
    .select()
    .from(schemas.userSyncs)
    .where(and(eq(schemas.userSyncs.userId, Number(userId)), inArray(schemas.userSyncs.tableName, tableNames)));

  return result;
}

export async function syncUserData(
  board: BoardName,
  token: string,
  userId: string,
  username: string,
  tables: string[] = USER_TABLES,
): Promise<Record<string, { synced: number }>> {
  const results: Record<string, { synced: number }> = {};

  try {
    const syncParams: SyncOptions = {
      tables,
    };

    const allSyncTimes = await getLastSyncTimes(board, userId, tables);

    syncParams.userSyncs = allSyncTimes.map((syncTime) => ({
      table_name: syncTime.tableName || '',
      last_synchronized_at: syncTime.lastSynchronizedAt || '',
      user_id: Number(userId),
    }));
    // TODO: Move rest api call out of DB transaction to make error messages
    // easier to interpret
    const syncResults = await userSync(board, userId, syncParams, token);

    // Process each table in a single transaction
    await db.transaction(
      async (
        tx: PgTransaction<
          VercelPgQueryResultHKT,
          Record<string, never>,
          ExtractTablesWithRelations<Record<string, never>>
        >,
      ) => {
        try {
          // Process each table
          for (const tableName of tables) {
            if (syncResults.PUT && syncResults.PUT[tableName]) {
              const data = syncResults.PUT[tableName];
              await upsertTableData(tx, board, tableName, userId, data);
              results[tableName] = { synced: data.length };
            } else {
              results[tableName] = { synced: 0 };
            }
          }

          // Update user_syncs table with new sync times
          if (syncResults && syncResults.PUT && syncResults.PUT['user_syncs']) {
            //TODO handle user syncs in other method
            await updateUserSyncs(tx, board, syncResults.PUT['user_syncs']);
          }
        } catch (error) {
          //@ts-expect-error
          console.error('Failed to commit sync database transaction ', error.toString());
          tx.rollback();
        }
      },
    );

    return results;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}
