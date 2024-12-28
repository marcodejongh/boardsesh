import { dbz as db } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { LastSyncData, SyncOptions } from '../../api-wrappers/aurora/types';
import { sharedSync } from '../../api-wrappers/aurora/sharedSync';
import { ExtractTablesWithRelations, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import {
  kilterAttempts,
  kilterProducts,
  kilterProductSizes,
  kilterClimbStats,
  kilterSharedSyncs,
  kilterHoles,
  kilterLeds,
  kilterSets,
  kilterProductsAngles,
  kilterLayouts,
  kilterProductSizesLayoutsSets,
  kilterPlacementRoles,
  kilterPlacements,
  kilterClimbs,
  kilterBetaLinks,
  tensionAttempts,
  tensionProducts,
  tensionProductSizes,
  tensionClimbStats,
  tensionSharedSyncs,
  tensionHoles,
  tensionLeds,
  tensionSets,
  tensionProductsAngles,
  tensionLayouts,
  tensionProductSizesLayoutsSets,
  tensionPlacementRoles,
  tensionPlacements,
  tensionClimbs,
  tensionBetaLinks,
  tensionClimbStatsHistory,
  kilterClimbStatsHistory,
} from '@/app/lib/db/schema';
import { PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { VercelPgQueryResultHKT } from 'drizzle-orm/vercel-postgres';

// Define shared sync tables in correct dependency order
export const SHARED_SYNC_TABLES: string[] = [
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
  'climbs',
  'climb_stats',
  'beta_links',
];

const BATCH_SIZE = 100;

function getSharedSchemas(board: BoardName) {
  if (board === 'kilter') {
    return {
      attempts: kilterAttempts,
      products: kilterProducts,
      productSizes: kilterProductSizes,
      holes: kilterHoles,
      leds: kilterLeds,
      sets: kilterSets,
      productsAngles: kilterProductsAngles,
      layouts: kilterLayouts,
      productSizesLayoutsSets: kilterProductSizesLayoutsSets,
      placementRoles: kilterPlacementRoles,
      placements: kilterPlacements,
      climbs: kilterClimbs,
      climbStats: kilterClimbStats,
      betaLinks: kilterBetaLinks,
      sharedSyncs: kilterSharedSyncs,
      climbStatsHistory: kilterClimbStatsHistory,
    };
  } else if (board === 'tension') {
    return {
      attempts: tensionAttempts,
      products: tensionProducts,
      productSizes: tensionProductSizes,
      holes: tensionHoles,
      leds: tensionLeds,
      sets: tensionSets,
      productsAngles: tensionProductsAngles,
      layouts: tensionLayouts,
      productSizesLayoutsSets: tensionProductSizesLayoutsSets,
      placementRoles: tensionPlacementRoles,
      placements: tensionPlacements,
      climbs: tensionClimbs,
      climbStats: tensionClimbStats,
      betaLinks: tensionBetaLinks,
      sharedSyncs: tensionSharedSyncs,
      climbStatsHistory: tensionClimbStatsHistory,
    };
  }
  throw new Error(`Unsupported board type: ${board}`);
}

async function processBatch<T>(items: T[], insertFn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(insertFn));
  }
}

async function upsertSharedTableData(
  db: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  tableName: string,
  data: any[],
) {
  if (data.length === 0) return;

  const schemas = getSharedSchemas(boardName);

  switch (tableName) {
    case 'attempts': {
      await processBatch(data, async (item) => {
        await db
          .insert(schemas.attempts)
          .values({
            id: Number(item.id),
            position: Number(item.position),
            name: item.name,
          })
          .onConflictDoUpdate({
            target: schemas.attempts.id,
            set: {
              position: Number(item.position),
              name: item.name,
            },
          });
      });
      break;
    }

    case 'products': {
      await processBatch(data, async (item) => {
        await db
          .insert(schemas.products)
          .values({
            id: Number(item.id),
            name: item.name,
            isListed: Boolean(item.is_listed),
            password: item.password,
            minCountInFrame: Number(item.min_count_in_frame),
            maxCountInFrame: Number(item.max_count_in_frame),
          })
          .onConflictDoUpdate({
            target: schemas.products.id,
            set: {
              name: item.name,
              isListed: Boolean(item.is_listed),
              password: item.password,
              minCountInFrame: Number(item.min_count_in_frame),
              maxCountInFrame: Number(item.max_count_in_frame),
            },
          });
      });
      break;
    }

    case 'product_sizes': {
      await processBatch(data, async (item) => {
        await db
          .insert(schemas.productSizes)
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
            target: schemas.productSizes.id,
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
      });
      break;
    }

    case 'climb_stats': {
      await Promise.all(
        data.map((item) =>
          Promise.all([
            // Update current stats
            db
              .insert(schemas.climbStats)
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
                target: [schemas.climbStats.climbUuid, schemas.climbStats.angle], // Updated to use new unique constraint
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
            db.insert(schemas.climbStatsHistory).values({
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
          ]),
        ),
      );
      break;
    }

    // Add other table cases as needed...
  }
}

async function updateSharedSyncs(
  tx: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  sharedSyncs: LastSyncData[],
) {
  const schemas = getSharedSchemas(boardName);

  for (const sync of sharedSyncs) {
    await tx
      .insert(schemas.sharedSyncs)
      .values({
        tableName: sync.table_name,
        lastSynchronizedAt: sync.last_synchronized_at,
      })
      .onConflictDoUpdate({
        target: schemas.sharedSyncs.tableName,
        set: {
          lastSynchronizedAt: sync.last_synchronized_at,
        },
      });
  }
}

export async function getLastSharedSyncTimes(boardName: BoardName, tableNames = SHARED_SYNC_TABLES) {
  const schemas = getSharedSchemas(boardName);

  const result = await db
    .select({
      table_name: schemas.sharedSyncs.tableName,
      last_synchronized_at: schemas.sharedSyncs.lastSynchronizedAt,
    })
    .from(schemas.sharedSyncs)
    .where(inArray(schemas.sharedSyncs.tableName, tableNames as unknown as Array<string>));

  return result;
}

export async function syncSharedData(
  board: BoardName,
  tables: string[] = SHARED_SYNC_TABLES,
): Promise<Record<string, { synced: number }>> {
  const results: Record<string, { synced: number }> = {};

  try {
    await db.transaction(
      async (
        tx: PgTransaction<
          VercelPgQueryResultHKT,
          Record<string, never>,
          ExtractTablesWithRelations<Record<string, never>>
        >,
      ) => {
        try {
          const allSyncTimes = await getLastSharedSyncTimes(board, tables);

          const syncParams: SyncOptions = {
            tables: [...tables],
            sharedSyncs: allSyncTimes.map((syncTime) => ({
              table_name: syncTime.table_name || '',
              last_synchronized_at: syncTime.last_synchronized_at || '',
            })),
          };
          // TODO: Move rest api call out of DB transaction to make error messages
          // easier to interpret
          const syncResults = await sharedSync(board, syncParams);

          // Process each table in the specified order
          for (const tableName of SHARED_SYNC_TABLES) {
            // Skip if table wasn't requested
            if (!tables.includes(tableName)) continue;

            if (syncResults.PUT && syncResults.PUT[tableName]) {
              const data = syncResults.PUT[tableName];
              await upsertSharedTableData(tx, board, tableName, data);
              results[tableName] = { synced: data.length };
              console.log(`Updated ${tableName} with ${data.length} rows`);
            } else {
              results[tableName] = { synced: 0 };
            }
          }

          if (syncResults.PUT?.shared_syncs) {
            await updateSharedSyncs(tx, board, syncResults.PUT.shared_syncs);
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
    console.error('Failed to sync with Aurora:', error);
    throw error;
  }
}
