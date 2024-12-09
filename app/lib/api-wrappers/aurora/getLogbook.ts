import { sql } from '@/lib/db';
import { BoardName } from '../../types';
import { Ascent } from './types';
import { syncUserData } from './syncAllUserData';

export async function getLogbook(board: BoardName, token: string, userId: string): Promise<Ascent[]> {
  // First sync the ascents
  try {
    await syncUserData(board, token, userId, ['ascents']);
  } catch(err) {
    console.warn("Failed to sync tables with Aurora")
  }
  

  // Then fetch from our database
  const tableName = `${board}_ascents`;

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
