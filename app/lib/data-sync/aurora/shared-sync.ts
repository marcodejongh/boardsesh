import { sql } from '@/lib/db';
import { BoardName } from '../../types';
import { getTableName } from './getTableName';
import { SyncData, SyncOptions } from '../../api-wrappers/aurora/types';
import { sharedSync } from '../../api-wrappers/aurora/sharedSync';

// Define shared sync tables in correct dependency order
export const SHARED_SYNC_TABLES = [
  // Independent tables first
  'gyms',
  'boards',
  'attempts',
  'kits',
  'products',
  
  // Tables with dependencies on products
  'product_sizes',
  'holes',
  'leds',
  'sets',
  'products_angles',
  
  // Tables depending on product_sizes
  'layouts',
  'product_sizes_layouts_sets',
  'placement_roles',
  'placements',
  
  // Climbs and related tables last (in order)
  'climbs',           // Must come before stats and beta_links
  'climb_stats',      // Depends on climbs
  'beta_links'        // Depends on climbs
];

const BATCH_SIZE = 100;

async function processBatch<T>(
  items: T[],
  fullTableName: string,
  generateValues: (batchItems: T[], startIndex: number) => string,
  generateParams: (batchItems: T[]) => any[],
  generateQuery: (values: string, fullTableName: string) => string,
) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const values = generateValues(batch, i);
    const params = generateParams(batch);
    const query = generateQuery(values, fullTableName);

    await sql.query(query, params);
  }
}

async function upsertSharedTableData(boardName: BoardName, tableName: string, data: any[]) {
  if (data.length === 0) return;
  const fullTableName = getTableName(boardName, tableName);

  switch (tableName) {
    case 'attempts': {
      await processBatch(
        data,
        fullTableName,
        (batch, startIndex) =>
          batch
            .map((_, i) => {
              const offset = i * 3;
              return `($${offset + 1}::integer, $${offset + 2}::integer, $${offset + 3}::text)`;
            })
            .join(','),
        (batch) => batch.flatMap((item) => [item.id, item.position, item.name]),
        (values, table) => `
          INSERT INTO ${table} (id, "position", name)
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            "position" = EXCLUDED."position",
            name = EXCLUDED.name;
        `,
      );
      break;
    }

    case 'products': {
      await processBatch(
        data,
        fullTableName,
        (batch, startIndex) =>
          batch
            .map((_, i) => {
              const offset = i * 6;
              return `($${offset + 1}::integer, $${offset + 2}::text, $${offset + 3}::boolean, 
                    $${offset + 4}::text, $${offset + 5}::integer, $${offset + 6}::integer)`;
            })
            .join(','),
        (batch) =>
          batch.flatMap((item) => [
            item.id,
            item.name,
            item.is_listed,
            item.password,
            item.min_count_in_frame,
            item.max_count_in_frame,
          ]),
        (values, table) => `
          INSERT INTO ${table} (id, name, is_listed, password, min_count_in_frame, max_count_in_frame)
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            is_listed = EXCLUDED.is_listed,
            password = EXCLUDED.password,
            min_count_in_frame = EXCLUDED.min_count_in_frame,
            max_count_in_frame = EXCLUDED.max_count_in_frame;
        `,
      );
      break;
    }

    case 'product_sizes': {
      await processBatch(
        data,
        fullTableName,
        (batch, startIndex) =>
          batch
            .map((_, i) => {
              const offset = i * 11;
              return `($${offset + 1}::integer, $${offset + 2}::integer, $${offset + 3}::integer, 
                    $${offset + 4}::integer, $${offset + 5}::integer, $${offset + 6}::integer,
                    $${offset + 7}::text, $${offset + 8}::text, $${offset + 9}::text,
                    $${offset + 10}::integer, $${offset + 11}::boolean)`;
            })
            .join(','),
        (batch) =>
          batch.flatMap((item) => [
            item.id,
            item.product_id,
            item.edge_left,
            item.edge_right,
            item.edge_bottom,
            item.edge_top,
            item.name,
            item.description,
            item.image_filename,
            item.position,
            item.is_listed,
          ]),
        (values, table) => `
          INSERT INTO ${table} (
            id, product_id, edge_left, edge_right, edge_bottom,
            edge_top, name, description, image_filename, "position", is_listed
          )
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            edge_left = EXCLUDED.edge_left,
            edge_right = EXCLUDED.edge_right,
            edge_bottom = EXCLUDED.edge_bottom,
            edge_top = EXCLUDED.edge_top,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            image_filename = EXCLUDED.image_filename,
            "position" = EXCLUDED."position",
            is_listed = EXCLUDED.is_listed;
        `,
      );
      break;
    }

    // Continue with other cases...
    // I'll show one more example and you can follow the same pattern:

    case 'climb_stats': {
      // First, modify the table - only drop foreign key constraints and add unique constraint if it doesn't exist
      // First clean up any duplicates and then add the constraint
    //   await sql.query(`
    //     -- Clean up duplicates first
    //     WITH latest_ids AS (
    //         SELECT MAX(id) as max_id
    //         FROM ${fullTableName}
    //         GROUP BY climb_uuid, angle
    //     )
    //     DELETE FROM ${fullTableName}
    //     WHERE id NOT IN (SELECT max_id FROM latest_ids);

    //     -- Now it's safe to add the constraint
    //     DO $$ 
    //     BEGIN 
    //         IF NOT EXISTS (
    //             SELECT 1 FROM pg_constraint 
    //             WHERE conname = 'unique_climb_angle'
    //         ) THEN
    //             ALTER TABLE ${fullTableName}
    //             ADD CONSTRAINT unique_climb_angle UNIQUE (climb_uuid, angle);
    //         END IF;
    //     END $$;
    // `);
      await processBatch(
        data,
        fullTableName,
        (batch, startIndex) =>
          batch
            .map((_, i) => {
              const offset = i * 9;
              return `($${offset + 1}::text, $${offset + 2}::bigint, 
                        $${offset + 3}::double precision, $${offset + 4}::double precision,
                        $${offset + 5}::bigint, $${offset + 6}::double precision,
                        $${offset + 7}::double precision, $${offset + 8}::text,
                        $${offset + 9}::timestamp)`;
            })
            .join(','),
        (batch) =>
          batch.flatMap((item) => [
            item.climb_uuid,
            item.angle,
            item.display_difficulty || item.difficulty_average,
            item.benchmark_difficulty,
            item.ascensionist_count,
            item.difficulty_average,
            item.quality_average,
            item.fa_username,
            item.fa_at,
          ]),
        (values, table) => `
            INSERT INTO ${table} (
                climb_uuid, angle, display_difficulty, benchmark_difficulty,
                ascensionist_count, difficulty_average, quality_average,
                fa_username, fa_at
            )
            VALUES ${values}
            ON CONFLICT (climb_uuid, angle) DO UPDATE SET
                display_difficulty = EXCLUDED.display_difficulty,
                benchmark_difficulty = EXCLUDED.benchmark_difficulty,
                ascensionist_count = EXCLUDED.ascensionist_count,
                difficulty_average = EXCLUDED.difficulty_average,
                quality_average = EXCLUDED.quality_average,
                fa_username = EXCLUDED.fa_username,
                fa_at = EXCLUDED.fa_at;
        `,
      );
      break;
    }
  }
}

export async function syncSharedData(
  board: BoardName,
  tables: string[] = SHARED_SYNC_TABLES,
): Promise<Record<string, { synced: number }>> {
  const results: Record<string, { synced: number }> = {};

  try {
    const allSyncTimes = await getLastSharedSyncTimes(board, tables);

    const syncParams: SyncOptions = {
      tables,
      sharedSyncs: allSyncTimes.map((syncTime) => ({
        table_name: syncTime.table_name,
        last_synchronized_at: syncTime.last_synchronized_at,
      })),
    };

    const syncResults = await sharedSync(board, syncParams);

    // Process each table in the specified order
    for (const tableName of SHARED_SYNC_TABLES) {
      // Skip if table wasn't requested
      if (!tables.includes(tableName)) continue;

      if (syncResults.PUT && syncResults.PUT[tableName]) {
        const data = syncResults.PUT[tableName];
        await upsertSharedTableData(board, tableName, data);
        results[tableName] = { synced: data.length };
        console.log(`Update ${tableName} with ${data.length} rows`);
      } else {
        results[tableName] = { synced: 0 };
      }
    }

    await updateSharedSyncs(board, syncResults.PUT.shared_syncs);
    return results;
  } catch (error) {
    console.error('Failed to sync with Aurora:', error);
    throw error;
  }
}

async function updateSharedSyncs(boardName: BoardName, sharedSyncs: SyncData[]) {
  const sharedSyncsTable = getTableName(boardName, 'shared_syncs');

  const values = sharedSyncs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
  const params = sharedSyncs.flatMap((sync) => [sync.table_name, sync.last_synchronized_at]);

  await sql.query(
    `
    INSERT INTO ${sharedSyncsTable} (table_name, last_synchronized_at)
    VALUES ${values}
    ON CONFLICT (table_name) DO UPDATE SET
      last_synchronized_at = EXCLUDED.last_synchronized_at;
    `,
    params,
  );
}

export async function getLastSharedSyncTimes(
  boardName: BoardName,
  tableNames: string[] = SHARED_SYNC_TABLES,
): Promise<Array<{ table_name: string; last_synchronized_at: string }>> {
  const sharedSyncsTable = getTableName(boardName, 'shared_syncs');
  const tablePlaceholders = tableNames.map((_, index) => `$${index + 1}`).join(', ');
  const result = await sql.query(
    `
    SELECT table_name, last_synchronized_at
    FROM ${sharedSyncsTable}
    WHERE table_name IN (${tablePlaceholders})
    `,
    tableNames,
  );

  return result.rows;
}
