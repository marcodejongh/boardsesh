import { dbz as db } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { LastSyncData, SyncOptions } from '../../api-wrappers/aurora/types';
import { sharedSync } from '../../api-wrappers/aurora/sharedSync';
import { ExtractTablesWithRelations, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { VercelPgQueryResultHKT } from 'drizzle-orm/vercel-postgres';
import {
  Attempt,
  Climb,
  ClimbStats,
  Product,
  ProductSize,
  SharedSync,
  SyncData,
  SyncPutFields,
} from '../../api-wrappers/sync-api-types';
import { getTable } from '../../db/queries/util/table-select';

// Define shared sync tables in correct dependency order
export const SHARED_SYNC_TABLES: string[] = [
  'climbs',
  'attempts',
  'products',
  'product_sizes',
  'holes',
  'leds',
  'sets',
  'products_angles',
  'layouts',
  'product_sizes_layouts_sets',
  'placement_roles',
  'placements',
  'climb_stats',
  'beta_links',
];

const upsertAttempts = (
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  board: BoardName,
  data: Attempt[],
) =>
  Promise.all(
    data.map(async (item) => {
      const attemptsSchema = getTable('attempts', board);
      return db
        .insert(attemptsSchema)
        .values({
          id: Number(item.id),
          position: Number(item.position),
          name: item.name,
        })
        .onConflictDoUpdate({
          target: attemptsSchema.id,
          set: {
            position: Number(item.position),
            name: item.name,
          },
        });
    }),
  );

const upsertProducts = async (
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  board: BoardName,
  data: Product[],
) =>
  Promise.all(
    data.map(async (item) => {
      const productsSchema = getTable('products', board);
      return db
        .insert(productsSchema)
        .values({
          id: Number(item.id),
          name: item.name,
          isListed: Boolean(item.is_listed),
          password: item.password,
          minCountInFrame: Number(item.min_count_in_frame),
          maxCountInFrame: Number(item.max_count_in_frame),
        })
        .onConflictDoUpdate({
          target: productsSchema.id,
          set: {
            name: item.name,
            isListed: Boolean(item.is_listed),
            password: item.password,
            minCountInFrame: Number(item.min_count_in_frame),
            maxCountInFrame: Number(item.max_count_in_frame),
          },
        });
    }),
  );

const upsertProductSizes = async (
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  board: BoardName,
  data: ProductSize[],
) =>
  Promise.all(
    data.map(async (item) => {
      const productSizesSchema = getTable('productSizes', board);
      return db
        .insert(productSizesSchema)
        .values({
          id: Number(item.id),
          productId: Number(item.product_id),
          edgeLeft: Number(item.edge_left),
          edgeRight: Number(item.edge_right),
          edgeBottom: Number(item.edge_bottom),
          edgeTop: Number(item.edge_top),
          name: item.name,
          description: item.description,
          imageFilename: item.image_filename,
          position: Number(item.position),
          isListed: Boolean(item.is_listed),
        })
        .onConflictDoUpdate({
          target: productSizesSchema.id,
          set: {
            productId: Number(item.product_id),
            edgeLeft: Number(item.edge_left),
            edgeRight: Number(item.edge_right),
            edgeBottom: Number(item.edge_bottom),
            edgeTop: Number(item.edge_top),
            name: item.name,
            description: item.description,
            imageFilename: item.image_filename,
            position: Number(item.position),
            isListed: Boolean(item.is_listed),
          },
        });
    }),
  );

async function upsertClimbStats(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  board: BoardName,
  data: ClimbStats[],
) {
  // Filter data to only include stats for valid climbs

  await Promise.all(
    data.map((item) => {
      // Changed from data.map to validStats.map
      const climbStatsSchema = getTable('climbStats', board);
      const climbStatHistorySchema = getTable('climbStatsHistory', board);
      return Promise.all([
        // Update current stats
        db
          .insert(climbStatsSchema)
          .values({
            climbUuid: item.climb_uuid,
            angle: Number(item.angle),
            displayDifficulty: Number(item.display_difficulty || item.difficulty_average),
            benchmarkDifficulty: Number(item.benchmark_difficulty),
            ascensionistCount: Number(item.ascensionist_count),
            difficultyAverage: Number(item.difficulty_average),
            qualityAverage: Number(item.quality_average),
            faUsername: item.fa_username,
            faAt: item.fa_at,
          })
          .onConflictDoUpdate({
            target: [climbStatsSchema.climbUuid, climbStatsSchema.angle],
            set: {
              displayDifficulty: Number(item.display_difficulty || item.difficulty_average),
              benchmarkDifficulty: Number(item.benchmark_difficulty),
              ascensionistCount: Number(item.ascensionist_count),
              difficultyAverage: Number(item.difficulty_average),
              qualityAverage: Number(item.quality_average),
              faUsername: item.fa_username,
              faAt: item.fa_at,
            },
          }),

        // Also insert into history table
        db.insert(climbStatHistorySchema).values({
          climbUuid: item.climb_uuid,
          angle: Number(item.angle),
          displayDifficulty: Number(item.display_difficulty || item.difficulty_average),
          benchmarkDifficulty: Number(item.benchmark_difficulty),
          ascensionistCount: Number(item.ascensionist_count),
          difficultyAverage: Number(item.difficulty_average),
          qualityAverage: Number(item.quality_average),
          faUsername: item.fa_username,
          faAt: item.fa_at,
        }),
      ]);
    }),
  );
}

async function upsertClimbs(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  board: BoardName,
  data: Climb[],
) {
  await Promise.all(
    data.map((item: Climb) => {
      const climbsSchema = getTable('climbs', board);
      return db
        .insert(climbsSchema)
        .values({
          uuid: item.uuid,
          name: item.name,
          description: item.description,
          hsm: item.hsm,
          edgeLeft: item.edge_left,
          edgeRight: item.edge_right,
          edgeBottom: item.edge_bottom,
          edgeTop: item.edge_top,
          framesCount: item.frames_count,
          framesPace: item.frames_pace,
          frames: item.frames,
          setterId: item.setter_id,
          setterUsername: item.setter_username,
          layoutId: item.layout_id,
          isDraft: item.is_draft,
          isListed: item.is_listed,
          createdAt: item.created_at,
          angle: item.angle,
        })
        .onConflictDoUpdate({
          target: [climbsSchema.uuid],
          set: {
            uuid: item.uuid,
            name: item.name,
            description: item.description,
            hsm: item.hsm,
            edgeLeft: item.edge_left,
            edgeRight: item.edge_right,
            edgeBottom: item.edge_bottom,
            edgeTop: item.edge_top,
            framesCount: item.frames_count,
            framesPace: item.frames_pace,
            frames: item.frames,
            setterId: item.setter_id,
            setterUsername: item.setter_username,
            layoutId: item.layout_id,
            isDraft: item.is_draft,
            isListed: item.is_listed,
            angle: item.angle,
          },
        });
    }),
  );
}

async function upsertSharedTableData(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  tableName: string,
  data: SyncPutFields[],
) {
  switch (tableName) {
    case 'attempts':
      await upsertAttempts(db, boardName, data as Attempt[]);
      break;
    case 'products':
      await upsertProducts(db, boardName, data as Product[]);
      break;
    case 'product_sizes':
      await upsertProductSizes(db, boardName, data as ProductSize[]);
      break;
    case 'climb_stats':
      await upsertClimbStats(db, boardName, data as ClimbStats[]);
      break;
    case 'climbs':
      await upsertClimbs(db, boardName, data as Climb[]);
      break;
    case 'shared_syncs':
      await updateSharedSyncs(db, boardName, data as SharedSync[]);
      break;
  }
}
async function updateSharedSyncs(
  tx: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  sharedSyncs: LastSyncData[],
) {
  const sharedSyncsSchema = getTable('sharedSyncs', boardName);

  for (const sync of sharedSyncs) {
    await tx
      .insert(sharedSyncsSchema)
      .values({
        tableName: sync.table_name,
        lastSynchronizedAt: sync.last_synchronized_at,
      })
      .onConflictDoUpdate({
        target: sharedSyncsSchema.tableName,
        set: {
          lastSynchronizedAt: sync.last_synchronized_at,
        },
      });
  }
}

export async function getLastSharedSyncTimes(boardName: BoardName) {
  const sharedSyncsSchema = getTable('sharedSyncs', boardName);

  const result = await db
    .select({
      table_name: sharedSyncsSchema.tableName,
      last_synchronized_at: sharedSyncsSchema.lastSynchronizedAt,
    })
    .from(sharedSyncsSchema);

  return result;
}

export async function syncSharedData(
  board: BoardName,
): Promise<Record<string, { synced: number }>> {
  console.log('Entered sync shared data');
  const allSyncTimes = await getLastSharedSyncTimes(board);
  console.log('Fetched previous sync times');
  const syncParams: SyncOptions = {
    tables: [...SHARED_SYNC_TABLES],
    sharedSyncs: allSyncTimes.map((syncTime) => ({
      table_name: syncTime.table_name || '',
      last_synchronized_at: syncTime.last_synchronized_at || '',
    })),
  };

  console.log(syncParams.);

  const syncResults = await sharedSync(board, syncParams);

  console.log(`Received ${syncResults.PUT.climbs.length} climbs and ${syncResults.PUT.climb_stats.length} climb_stats`);
  
  return upsertAllSharedTableData(board, syncResults);
}

const upsertAllSharedTableData = async (board: BoardName, syncResults: SyncData) => {
  const results: Record<string, { synced: number }> = {};

  await db.transaction(
    async (
      tx: PgTransaction<
        VercelPgQueryResultHKT,
        Record<string, never>,
        ExtractTablesWithRelations<Record<string, never>>
      >,
    ) => {
      try {
        await tx.execute(sql`SET CONSTRAINTS ALL DEFERRED`);
        // TODO: Move rest api call out of DB transaction to make error messages
        // easier to interpret
        const promises = [...SHARED_SYNC_TABLES, 'shared_syncs']
        .filter(name => syncResults.PUT[name])
        .map(async (tableName) => {
          const data = syncResults.PUT[tableName];

          await upsertSharedTableData(tx, board, tableName, data);
          console.log(`Updated ${tableName} with ${data.length} rows`);
          return [tableName, { synced: data.length }];
        });
        const results = Object.fromEntries(await Promise.all(promises));
      } catch (error) {
        //@ts-expect-error
        console.error('Failed to commit sync database transaction ', error.toString());
        tx.rollback();
      }
    },
  );

  return results;
};
