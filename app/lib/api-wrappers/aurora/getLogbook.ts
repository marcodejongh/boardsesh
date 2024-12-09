import { sql } from '@/lib/db';
import { BoardName, ClimbUuid } from '../../types';
import { LogbookEntry } from './types';
import { getTableName } from './syncAllUserData';

export async function getLogbook(board: BoardName, userId: string, climbUuids: ClimbUuid[]): Promise<LogbookEntry[]> {
  const ascentsTable = getTableName(board, 'ascents');
  const bidsTable = getTableName(board, 'bids');

  // Single query using UNION ALL with proper type casting and IN clause
  const combinedLogbook = await sql.query<LogbookEntry>(
    `
    SELECT 
      uuid,
      climb_uuid,
      angle,
      is_mirror,
      user_id,
      attempt_id,
      bid_count AS tries,
      quality,
      difficulty,
      is_benchmark::boolean,
      comment,
      climbed_at,
      created_at,
      TRUE::boolean AS is_ascent
    FROM ${ascentsTable}
    WHERE user_id = $1
    AND climb_uuid = ANY($2)

    UNION ALL

    SELECT 
      uuid,
      climb_uuid,
      angle,
      is_mirror,
      user_id,
      NULL AS attempt_id,
      bid_count AS tries,
      NULL AS quality,
      NULL AS difficulty,
      FALSE::boolean AS is_benchmark,
      comment,
      climbed_at,
      created_at,
      FALSE::boolean AS is_ascent
    FROM ${bidsTable}
    WHERE user_id = $1
    AND climb_uuid = ANY($2)

    ORDER BY climbed_at DESC
    `,
    [userId, climbUuids],
  );

  return combinedLogbook.rows;
}