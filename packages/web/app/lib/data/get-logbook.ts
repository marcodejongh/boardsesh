import { sql } from '@/app/lib/db/db';
import { ClimbUuid } from '../types';
import { LogbookEntry, AuroraBoardName } from '../api-wrappers/aurora/types';
import { getTableName } from '../data-sync/aurora/getTableName';

export async function getLogbook(board: AuroraBoardName, userId: string, climbUuids?: ClimbUuid[]): Promise<LogbookEntry[]> {
  const ascentsTable = getTableName(board, 'ascents');
  const bidsTable = getTableName(board, 'bids');

  if (climbUuids && climbUuids.length > 0) {
    // If climbUuids are provided
    const combinedLogbook = await sql`
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
      FROM ${sql.unsafe(ascentsTable)}
      WHERE user_id = ${userId}
      AND climb_uuid = ANY(${climbUuids})

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
      FROM ${sql.unsafe(bidsTable)}
      WHERE user_id = ${userId}
      AND climb_uuid = ANY(${climbUuids})

      ORDER BY climbed_at DESC
      `;

    return combinedLogbook as unknown as LogbookEntry[];
  } else {
    // If climbUuids are not provided
    const combinedLogbook = await sql`
      SELECT * FROM (
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
          TRUE AS is_ascent
        FROM ${sql.unsafe(ascentsTable)}
        WHERE user_id = ${userId}

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
          FALSE AS is_benchmark,
          comment,
          climbed_at,
          created_at,
          FALSE AS is_ascent
        FROM ${sql.unsafe(bidsTable)}
        WHERE user_id = ${userId}

        ORDER BY climbed_at DESC
      ) subquery
      WHERE difficulty IS NOT NULL;
      `;

    return combinedLogbook as unknown as LogbookEntry[];
  }
}
