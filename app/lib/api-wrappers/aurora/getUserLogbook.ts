import { sql } from '@/lib/db'; // Assuming you have a database utility setup
import { LogbookEntry } from './types'; // Import your types as needed

export async function getUserLogbook(userId: string, boardName: string): Promise<LogbookEntry[]> {
  if (!/^[a-zA-Z0-9_]+$/.test(boardName)) {
    throw new Error('Invalid board name');
  }

  const ascentsTable = `public.${boardName}_ascents`;
  const bidsTable = `public.${boardName}_bids`;

  const query = `
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
      FROM ${ascentsTable}
      WHERE user_id = $1

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
      FROM ${bidsTable}
      WHERE user_id = $1

      ORDER BY climbed_at DESC
    ) subquery
    WHERE difficulty IS NOT NULL;
  `;

  try {
    const result = await sql.query<LogbookEntry>(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching logbook:', error);
    throw new Error('Could not fetch logbook data');
  }
}
