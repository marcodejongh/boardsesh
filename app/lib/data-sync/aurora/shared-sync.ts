import { dbz as db } from '@/app/lib/db/db';
import { BoardName } from '../../types';
import { SyncOptions } from '../../api-wrappers/aurora/types';
import { sharedSync } from '../../api-wrappers/aurora/sharedSync';
import { ExtractTablesWithRelations, sql } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { VercelPgQueryResultHKT } from 'drizzle-orm/vercel-postgres';
import {
  Attempt,
  Climb,
  ClimbStats,
  SharedSync,
  SyncPutFields,
} from '../../api-wrappers/sync-api-types';
import { getTable } from '../../db/queries/util/table-select';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';

// Define shared sync tables in correct dependency order
// Order matches what the Android app sends - keep full list to remain indistinguishable
export const SHARED_SYNC_TABLES: string[] = [
  'products',
  'product_sizes', 
  'holes',
  'leds',
  'products_angles',
  'layouts',
  'product_sizes_layouts_sets',
  'placements',
  'sets',
  'placement_roles',
  'climbs',
  'climb_stats',
  'beta_links',
  'attempts',
  'kits',
];

// Tables we actually want to process and store
const TABLES_TO_PROCESS = new Set([
  // TODO: Add beta_links processing
  'climbs',
  'climb_stats',
  'attempts',
  'shared_syncs'
]);

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
            // Only allow position updates if they're reasonable (0-100)
            position: sql`CASE WHEN ${Number(item.position)} >= 0 AND ${Number(item.position)} <= 100 THEN ${Number(item.position)} ELSE ${attemptsSchema.position} END`,
            // Allow name updates for display purposes
            name: item.name,
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
    data.map(async (item: Climb) => {
      const climbsSchema = getTable('climbs', board);
      const climbHoldsSchema = getTable('climbHolds', board);

      // Insert or update the climb
      await db
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
            // Only allow isDraft to change from false to true (publishing)
            isDraft: sql`CASE WHEN ${climbsSchema.isDraft} = false AND ${item.is_draft} = true THEN true ELSE ${climbsSchema.isDraft} END`,
            // Only allow isListed to change from false to true (making public)
            isListed: sql`CASE WHEN ${climbsSchema.isListed} = false AND ${item.is_listed} = true THEN true ELSE ${climbsSchema.isListed} END`,
            // Allow updates to descriptive fields
            name: item.name,
            description: item.description,
            // Preserve all core climb data - never allow hostile updates to these critical fields
            hsm: climbsSchema.hsm,
            edgeLeft: climbsSchema.edgeLeft,
            edgeRight: climbsSchema.edgeRight,
            edgeBottom: climbsSchema.edgeBottom,
            edgeTop: climbsSchema.edgeTop,
            framesCount: climbsSchema.framesCount,
            framesPace: climbsSchema.framesPace,
            frames: climbsSchema.frames,
            setterId: climbsSchema.setterId,
            setterUsername: climbsSchema.setterUsername,
            layoutId: climbsSchema.layoutId,
            angle: climbsSchema.angle,
          },
        });

      const holdsByFrame = convertLitUpHoldsStringToMap(item.frames, board);

      const holdsToInsert = Object.entries(holdsByFrame).flatMap(([frameNumber, holds]) =>
        Object.entries(holds).map(([holdId, { state, color }]) => ({
          climbUuid: item.uuid,
          frameNumber: Number(frameNumber),
          holdId: Number(holdId),
          holdState: state,
          color,
        })),
      );

      await db.insert(climbHoldsSchema).values(holdsToInsert).onConflictDoNothing(); // Avoid duplicate inserts
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
    case 'climb_stats':
      await upsertClimbStats(db, boardName, data as ClimbStats[]);
      break;
    case 'climbs':
      await upsertClimbs(db, boardName, data as Climb[]);
      break;
    case 'shared_syncs':
      await updateSharedSyncs(db, boardName, data as SharedSync[]);
      break;
    default:
      // Tables not in TABLES_TO_PROCESS are handled in the main sync loop
      console.log(`Table ${tableName} not handled in upsertSharedTableData`);
      break;
  }
}
async function updateSharedSyncs(
  tx: PgTransaction<VercelPgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>,
  boardName: BoardName,
  sharedSyncs: SharedSync[],
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

export async function syncSharedData(board: BoardName, token: string, maxBatches: number = 1): Promise<Record<string, { synced: number; complete: boolean }>> {
  try {
    console.log('Entered sync shared data');
    
    // Get shared sync times
    const allSyncTimes = await getLastSharedSyncTimes(board);
    console.log('Fetched previous sync times:', allSyncTimes);
    
    // Create a map of existing sync times
    const sharedSyncMap = new Map(
      allSyncTimes.map(sync => [sync.table_name, sync.last_synchronized_at])
    );
    
    // Ensure all shared tables have a sync entry (default to 1970 if not synced)
    const defaultTimestamp = '1970-01-01 00:00:00.000000';
    
    const syncParams: SyncOptions = {
      tables: [...SHARED_SYNC_TABLES],
      sharedSyncs: SHARED_SYNC_TABLES.map((tableName) => ({
        table_name: tableName,
        last_synchronized_at: sharedSyncMap.get(tableName) || defaultTimestamp,
      })),
    };

    console.log('syncParams', syncParams);

    // Initialize results tracking
    const totalResults: Record<string, { synced: number; complete: boolean }> = {};
    let batchCount = 0;
    let isComplete = false;

    // Process batches up to maxBatches limit
    while (!isComplete && batchCount < maxBatches) {
      batchCount++;
      console.log(`Processing sync batch ${batchCount} for shared data`);
      
      const syncResults = await sharedSync(board, syncParams, token);
      console.log('syncResults keys:', Object.keys(syncResults));
      console.log('syncResults structure:', JSON.stringify(syncResults, null, 2).substring(0, 1000));

      // Process this batch in a transaction
      await db.transaction(async (tx) => {
        try {
          // Process each table - data is directly under table names
          for (const tableName of SHARED_SYNC_TABLES) {
            if (syncResults[tableName] && Array.isArray(syncResults[tableName])) {
              const data = syncResults[tableName];
              
              // Only process tables we actually care about
              if (TABLES_TO_PROCESS.has(tableName)) {
                console.log(`Syncing ${tableName}: ${data.length} records`);
                await upsertSharedTableData(tx, board, tableName, data);
                
                // Accumulate results
                if (!totalResults[tableName]) {
                  totalResults[tableName] = { synced: 0, complete: false };
                }
                totalResults[tableName].synced += data.length;
              } else {
                console.log(`Skipping ${tableName}: ${data.length} records (not processed)`);
                // Still track in results but don't sync
                if (!totalResults[tableName]) {
                  totalResults[tableName] = { synced: 0, complete: false };
                }
              }
            } else if (!totalResults[tableName]) {
              totalResults[tableName] = { synced: 0, complete: false };
            }
          }

          // Update shared_syncs table with new sync times from this batch
          if (syncResults['shared_syncs']) {
            console.log('Updating shared_syncs with data:', syncResults['shared_syncs']);
            await updateSharedSyncs(tx, board, syncResults['shared_syncs']);
            
            // Update sync params for next iteration with new timestamps
            const newSharedSyncs = syncResults['shared_syncs'].map((sync: any) => ({
              table_name: sync.table_name,
              last_synchronized_at: sync.last_synchronized_at,
            }));
            
            // Log timestamp updates for debugging
            const climbsSync = newSharedSyncs.find((s: any) => s.table_name === 'climbs');
            if (climbsSync) {
              console.log(`Climbs table sync timestamp updated to: ${climbsSync.last_synchronized_at}`);
            }
            
            // Update syncParams for next batch
            syncParams.sharedSyncs = newSharedSyncs;
          } else {
            console.log('No shared_syncs data in sync results');
          }
        } catch (error) {
          console.error('Failed to commit sync database transaction:', error);
          throw error;
        }
      });

      // Check if sync is complete - default to true if _complete is not present (matches Android app behavior)
      isComplete = syncResults._complete !== false;
      
      console.log(`Sync batch ${batchCount} complete. _complete flag: ${syncResults._complete}, isComplete: ${isComplete}`);
      
      if (!isComplete && batchCount >= maxBatches) {
        console.log(`Reached max batches (${maxBatches}), will continue in next API call`);
      }
    }

    // Mark completion status for all tables
    Object.keys(totalResults).forEach(table => {
      totalResults[table].complete = isComplete;
    });
    
    // Log summary of what was synced
    console.log('Sync batch summary:');
    Object.entries(totalResults).forEach(([table, result]) => {
      if (result.synced > 0) {
        console.log(`  ${table}: ${result.synced} records synced`);
      }
    });
    console.log(`Sync complete: ${isComplete}`);

    return totalResults;
  } catch (error) {
    console.error('Error syncing shared data:', error);
    throw error;
  }
}

