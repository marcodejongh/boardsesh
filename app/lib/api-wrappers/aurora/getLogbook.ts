import { sql } from '@/lib/db';
import { BoardName } from '../../types';
import { Ascent } from './types';
import { getLastSyncTimes, getTableName, syncUserData } from './syncAllUserData';

export async function getLogbook(board: BoardName, token: string, userId: string): Promise<Ascent[]> {
  // Fetch the last sync time for the 'ascents' table
  const lastSync = await getLastSyncTimes(board, userId, ['ascents']);

  // Check if 'last_synchronized_at' for 'ascents' is more than a day ago
  const now = new Date();
  let shouldSync = true; // Default to syncing if we don't have a timestamp

  if (lastSync.length > 0) {
    const ascentsSyncTime = lastSync.find((sync) => sync.table_name === 'ascents')?.last_synchronized_at;
    if (ascentsSyncTime) {
      const lastSyncDate = new Date(ascentsSyncTime);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000); // 24 hours ago

      // Only sync if the last sync was more than a day ago
      shouldSync = lastSyncDate < tenMinutesAgo;
    }
  }

  if (shouldSync) {
    try {
      console.log(`Syncing ascents table with Aurora`);
      await syncUserData(board, token, userId, ['ascents']);
    } catch (err) {
      console.warn('Failed to sync tables with Aurora:', err);
    }
  } else {
    console.log('Sync not required for ascents. Last sync was within the last 24 hours.');
  }

  // Fetch data from the database
  const tableName = getTableName(board, 'ascents');

  const result = await sql.query<Ascent>(
    `
    SELECT 
      uuid,
      climb_uuid,
      angle,
      is_mirror,
      user_id,
      attempt_id,
      bid_count,
      quality,
      difficulty,
      is_benchmark,
      comment,
      climbed_at,
      created_at
    FROM ${tableName}
    WHERE user_id = $1
    ORDER BY created_at DESC
  `,
    [userId],
  );

  return result.rows;
}
