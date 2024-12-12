import { sql } from '@/lib/db';
import { BoardName } from '../../types';
import { userSync } from './userSync';
import { SyncData, SyncOptions, UserSyncData } from './types';

export const USER_TABLES = ['walls', 'wall_expungements', 'draft_climbs', 'ascents', 'bids', 'tags', 'circuits'];

export const getTableName = (boardName: BoardName, tableName: string) => {
  if (!boardName) {
    throw new Error('Boardname is required, but received falsey');
  }
  switch (boardName) {
    case 'tension':
    case 'kilter':
      return `${boardName}_${tableName}`;
    default:
      return tableName;
  }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertTableData(boardName: BoardName, tableName: string, userId: string, data: any[]) {
  if (data.length === 0) return;

  const fullTableName = getTableName(boardName, tableName);

  switch (tableName) {
    case 'users': {
      const values = data
        .map((_, i) => {
          const offset = i * 3;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        })
        .join(',');

      const params = data.flatMap((item) => [item.id, item.username, item.created_at]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (id, username, created_at)
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username;
      `,
        params,
      );
      break;
    }

    case 'walls': {
      const values = data
        .map((_, i) => {
          const offset = i * 11;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
        })
        .join(',');

      const params = data.flatMap((item) => [
        item.uuid,
        userId,
        item.name,
        item.product_id,
        item.is_adjustable,
        item.angle,
        item.layout_id,
        item.product_size_id,
        item.hsm,
        item.serial_number,
        item.created_at,
      ]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (
          uuid, user_id, name, product_id, is_adjustable, angle,
          layout_id, product_size_id, hsm, serial_number, created_at
        )
        VALUES ${values}
        ON CONFLICT (uuid) DO UPDATE SET
          name = EXCLUDED.name,
          is_adjustable = EXCLUDED.is_adjustable,
          angle = EXCLUDED.angle,
          layout_id = EXCLUDED.layout_id,
          product_size_id = EXCLUDED.product_size_id,
          hsm = EXCLUDED.hsm,
          serial_number = EXCLUDED.serial_number;
      `,
        params,
      );
      break;
    }

    case 'wall_expungements': {
      // Since this table isn't in the schema dump, we'll need its structure
      console.warn('wall_expungements table structure needed');
      break;
    }

    case 'draft_climbs': {
      // Write to the climbs table but mark as drafts
      const climbs_table = getTableName(boardName, 'climbs');

      const values = data
        .map((_, i) => {
          const offset = i * 18;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18})`;
        })
        .join(',');

      const params = data.flatMap((item) => [
        item.uuid,
        item.layout_id,
        userId, // setter_id is the user_id for drafts
        item.setter_username || '', // might be empty for drafts
        item.name || 'Untitled Draft',
        item.description || '',
        item.hsm,
        item.edge_left,
        item.edge_right,
        item.edge_bottom,
        item.edge_top,
        item.angle,
        item.frames_count || 1,
        item.frames_pace || 0,
        item.frames || '',
        true, // is_draft
        false, // is_listed - drafts are not listed
        item.created_at || new Date().toISOString(),
      ]);

      await sql.query(
        `
        INSERT INTO ${climbs_table} (
          uuid, layout_id, setter_id, setter_username, name, description,
          hsm, edge_left, edge_right, edge_bottom, edge_top, angle,
          frames_count, frames_pace, frames, is_draft, is_listed, created_at
        )
        VALUES ${values}
        ON CONFLICT (uuid) DO UPDATE SET
          layout_id = EXCLUDED.layout_id,
          setter_id = EXCLUDED.setter_id,
          setter_username = EXCLUDED.setter_username,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          hsm = EXCLUDED.hsm,
          edge_left = EXCLUDED.edge_left,
          edge_right = EXCLUDED.edge_right,
          edge_bottom = EXCLUDED.edge_bottom,
          edge_top = EXCLUDED.edge_top,
          angle = EXCLUDED.angle,
          frames_count = EXCLUDED.frames_count,
          frames_pace = EXCLUDED.frames_pace,
          frames = EXCLUDED.frames,
          is_draft = true,
          is_listed = false;
      `,
        params,
      );
      break;
    }

    case 'ascents': {
      const values = data
        .map((_, i) => {
          const offset = i * 13;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
        })
        .join(',');

      const params = data.flatMap((item) => [
        item.uuid,
        item.climb_uuid,
        item.angle,
        item.is_mirror,
        userId,
        item.attempt_id,
        item.bid_count || 1,
        item.quality,
        item.difficulty,
        item.is_benchmark || 0,
        item.comment || '',
        item.climbed_at,
        item.created_at,
      ]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (
          uuid, climb_uuid, angle, is_mirror, user_id, attempt_id, 
          bid_count, quality, difficulty, is_benchmark, comment, 
          climbed_at, created_at
        )
        VALUES ${values}
        ON CONFLICT (uuid) DO UPDATE SET
          climb_uuid = EXCLUDED.climb_uuid,
          angle = EXCLUDED.angle,
          is_mirror = EXCLUDED.is_mirror,
          attempt_id = EXCLUDED.attempt_id,
          bid_count = EXCLUDED.bid_count,
          quality = EXCLUDED.quality,
          difficulty = EXCLUDED.difficulty,
          is_benchmark = EXCLUDED.is_benchmark,
          comment = EXCLUDED.comment,
          climbed_at = EXCLUDED.climbed_at;
      `,
        params,
      );
      break;
    }

    case 'bids': {
      const values = data
        .map((_, i) => {
          const offset = i * 9;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
        })
        .join(',');

      const params = data.flatMap((item) => [
        item.uuid,
        userId,
        item.climb_uuid,
        item.angle,
        item.is_mirror,
        item.bid_count || 1,
        item.comment || '',
        item.climbed_at,
        item.created_at,
      ]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (
          uuid, user_id, climb_uuid, angle, is_mirror, bid_count,
          comment, climbed_at, created_at
        )
        VALUES ${values}
        ON CONFLICT (uuid) DO UPDATE SET
          climb_uuid = EXCLUDED.climb_uuid,
          angle = EXCLUDED.angle,
          is_mirror = EXCLUDED.is_mirror,
          bid_count = EXCLUDED.bid_count,
          comment = EXCLUDED.comment,
          climbed_at = EXCLUDED.climbed_at;
      `,
        params,
      );
      break;
    }

    case 'tags': {
      const values = data
        .map((_, i) => {
          const offset = i * 4;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        })
        .join(',');

      const params = data.flatMap((item) => [item.entity_uuid, userId, item.name, item.is_listed]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (entity_uuid, user_id, name, is_listed)
        VALUES ${values}
        ON CONFLICT (entity_uuid, user_id, name) DO UPDATE SET
          is_listed = EXCLUDED.is_listed;
      `,
        params,
      );
      break;
    }

    case 'circuits': {
      const values = data
        .map((_, i) => {
          const offset = i * 8;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
        })
        .join(',');

      const params = data.flatMap((item) => [
        item.uuid,
        item.name,
        item.description,
        item.color,
        userId,
        item.is_public,
        item.created_at,
        item.updated_at,
      ]);

      await sql.query(
        `
        INSERT INTO ${fullTableName} (
          uuid, name, description, color, user_id, is_public,
          created_at, updated_at
        )
        VALUES ${values}
        ON CONFLICT (uuid) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          color = EXCLUDED.color,
          is_public = EXCLUDED.is_public,
          updated_at = EXCLUDED.updated_at;
      `,
        params,
      );
      break;
    }

    default:
      console.warn(`No specific upsert logic for table: ${tableName}`);
      break;
  }
}

async function updateUserSyncs(boardName: BoardName, userSyncs: UserSyncData[]) {
  const userSyncsTable = getTableName(boardName, 'user_syncs');

  const values = userSyncs.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
  const params = userSyncs.flatMap((sync) => [sync.user_id, sync.table_name, sync.last_synchronized_at]);

  await sql.query(
    `
      INSERT INTO ${userSyncsTable} (user_id, table_name, last_synchronized_at)
      VALUES ${values}
      ON CONFLICT (user_id, table_name) DO UPDATE SET
        last_synchronized_at = EXCLUDED.last_synchronized_at;
      `,
    params,
  );
}

export async function getLastSyncTimes(
  boardName: BoardName,
  userId: string,
  tableNames: string[],
): Promise<SyncData[]> {
  const userSyncsTable = getTableName(boardName, 'user_syncs');

  // Generate placeholders for the `IN` clause
  const tablePlaceholders = tableNames.map((_, index) => `$${index + 2}`).join(', ');
  const result = await sql.query(
    `
    SELECT table_name, last_synchronized_at
    FROM ${userSyncsTable}
    WHERE user_id = $1 AND table_name IN (${tablePlaceholders})
    `,
    [userId, ...tableNames],
  );

  return result.rows;
}

// async function checkSharedSyncs(boardName: BoardName, tableName: string): Promise<[string, string] | null> {
//   const sharedSyncsTable = getTableName(boardName, 'shared_syncs');

//   const result = await sql.query(
//     `
//     SELECT table_name, last_synchronized_at
//     FROM ${sharedSyncsTable}
//     WHERE table_name = $1
//     LIMIT 1;
//   `,
//     [tableName],
//   );

//   return result.rows[0]?.last_synchronized_at || null;
// }

export async function syncUserData(
  board: BoardName,
  token: string,
  userId: string,
  tables: string[] = USER_TABLES,
): Promise<Record<string, { synced: number }>> {
  const results: Record<string, { synced: number }> = {};

  try {
    // For large tables like 'climbs', check shared_syncs first
    const syncParams: SyncOptions = {
      tables,
    };

    const allSyncTimes = await getLastSyncTimes(board, userId, tables);

    syncParams.userSyncs = allSyncTimes.map((syncTime) => ({
      table_name: syncTime.table_name,
      last_synchronized_at: syncTime.last_synchronized_at,
      user_id: Number(userId),
    }));

    const syncResults = await userSync(board, token, userId, syncParams);

    // Process each table
    for (const tableName of tables) {
      if (syncResults.PUT && syncResults.PUT[tableName]) {
        const data = syncResults.PUT[tableName];
        await upsertTableData(board, tableName, userId, data);
        results[tableName] = { synced: data.length };
      } else {
        results[tableName] = { synced: 0 };
      }
    }

    // Update user_syncs table with new sync times
    if (syncResults.PUT['user_syncs']) {
      await updateUserSyncs(board, syncResults.PUT['user_syncs']);
    }

    return results;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
}
