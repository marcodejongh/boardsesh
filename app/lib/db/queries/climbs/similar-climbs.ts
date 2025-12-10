import { sql } from 'drizzle-orm';
import { dbz as db } from '@/app/lib/db/db';
import { ParsedBoardRouteParametersWithUuid, Climb } from '@/app/lib/types';
import { getBoardTables } from '@/lib/db/queries/util/table-select';
import { convertLitUpHoldsStringToMap } from '@/app/components/board-renderer/util';
import { getTableName } from '@/app/lib/data-sync/aurora/getTableName';

export type SimilarClimbMatch = Climb & {
  matchType: 'exact_larger' | 'high_similarity';
  similarity: number;
  matchingSizeId: number;
  matchingSizeName: string;
};

export type SimilarClimbsResult = {
  exactLargerMatches: SimilarClimbMatch[];
  highSimilarityMatches: SimilarClimbMatch[];
};

/**
 * Find climbs similar to the given climb based on hold matching.
 *
 * Two types of similarity:
 * 1. Exact match on larger boards: Climbs on larger board sizes that contain ALL the same holds
 *    as the source climb (the source climb's holds are a subset of the larger climb's holds).
 * 2. High similarity (90%+): Climbs where 90% or more of holds match using Jaccard similarity.
 */
export const getSimilarClimbs = async (
  params: ParsedBoardRouteParametersWithUuid,
  similarityThreshold: number = 0.9,
  limit: number = 10,
): Promise<SimilarClimbsResult> => {
  const tables = getBoardTables(params.board_name);
  const climbHoldsTable = getTableName(params.board_name, 'climb_holds');
  const climbsTable = getTableName(params.board_name, 'climbs');
  const climbStatsTable = getTableName(params.board_name, 'climb_stats');
  const difficultyGradesTable = getTableName(params.board_name, 'difficulty_grades');
  const productSizesTable = getTableName(params.board_name, 'product_sizes');

  try {
    // First, get the holds for the source climb
    const sourceHolds = await db
      .select({ holdId: tables.climbHolds.holdId })
      .from(tables.climbHolds)
      .where(sql`${tables.climbHolds.climbUuid} = ${params.climb_uuid}`);

    if (sourceHolds.length === 0) {
      return { exactLargerMatches: [], highSimilarityMatches: [] };
    }

    const sourceHoldIds = sourceHolds.map(h => h.holdId);
    const sourceHoldCount = sourceHoldIds.length;

    // Query 1: Find exact matches on larger board sizes
    // These are climbs that contain ALL the holds of the source climb
    // and are on a larger board (all edge dimensions are >= the current size's edges)
    const exactLargerMatchesQuery = await db.execute(sql`
      WITH source_holds AS (
        SELECT hold_id FROM ${sql.identifier(climbHoldsTable)}
        WHERE climb_uuid = ${params.climb_uuid}
      ),
      current_size AS (
        SELECT edge_left, edge_right, edge_bottom, edge_top
        FROM ${sql.identifier(productSizesTable)}
        WHERE id = ${params.size_id}
      ),
      larger_sizes AS (
        SELECT ps.id as size_id, ps.name as size_name
        FROM ${sql.identifier(productSizesTable)} ps, current_size cs
        WHERE ps.id != ${params.size_id}
          AND ps.edge_left <= cs.edge_left
          AND ps.edge_right >= cs.edge_right
          AND ps.edge_bottom <= cs.edge_bottom
          AND ps.edge_top >= cs.edge_top
      ),
      candidate_climbs AS (
        SELECT DISTINCT ch.climb_uuid
        FROM ${sql.identifier(climbHoldsTable)} ch
        INNER JOIN ${sql.identifier(climbsTable)} c ON c.uuid = ch.climb_uuid
        INNER JOIN larger_sizes ls ON true
        WHERE c.uuid != ${params.climb_uuid}
          AND c.layout_id = ${params.layout_id}
          AND c.is_listed = true
          AND c.is_draft = false
          AND c.frames_count = 1
          -- Climb fits within a larger size
          AND c.edge_left > ls.size_id - ls.size_id + (SELECT edge_left FROM current_size)
          AND c.edge_right < (SELECT edge_right FROM ${sql.identifier(productSizesTable)} WHERE id = ls.size_id)
          AND c.edge_bottom > (SELECT edge_bottom FROM ${sql.identifier(productSizesTable)} WHERE id = ls.size_id)
          AND c.edge_top < (SELECT edge_top FROM ${sql.identifier(productSizesTable)} WHERE id = ls.size_id)
      ),
      climb_hold_counts AS (
        SELECT
          ch.climb_uuid,
          COUNT(*) as total_holds,
          COUNT(*) FILTER (WHERE ch.hold_id IN (SELECT hold_id FROM source_holds)) as matching_holds
        FROM ${sql.identifier(climbHoldsTable)} ch
        WHERE ch.climb_uuid IN (SELECT climb_uuid FROM candidate_climbs)
        GROUP BY ch.climb_uuid
      )
      SELECT
        c.uuid,
        c.setter_username,
        c.name,
        c.description,
        c.frames,
        COALESCE(cs.angle, ${params.angle}) as angle,
        COALESCE(cs.ascensionist_count, 0) as ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(cs.quality_average::numeric, 2) as quality_average,
        ROUND(cs.difficulty_average::numeric - cs.display_difficulty::numeric, 2) as difficulty_error,
        cs.benchmark_difficulty,
        chc.matching_holds,
        chc.total_holds,
        1.0 as similarity,
        ps.id as matching_size_id,
        ps.name as matching_size_name
      FROM climb_hold_counts chc
      INNER JOIN ${sql.identifier(climbsTable)} c ON c.uuid = chc.climb_uuid
      INNER JOIN ${sql.identifier(productSizesTable)} ps ON
        c.edge_left > ps.edge_left AND c.edge_right < ps.edge_right
        AND c.edge_bottom > ps.edge_bottom AND c.edge_top < ps.edge_top
      LEFT JOIN ${sql.identifier(climbStatsTable)} cs ON cs.climb_uuid = c.uuid AND cs.angle = ${params.angle}
      LEFT JOIN ${sql.identifier(difficultyGradesTable)} dg ON dg.difficulty = ROUND(cs.display_difficulty::numeric)
      WHERE chc.matching_holds = ${sourceHoldCount}
        AND ps.id != ${params.size_id}
        AND ps.edge_left <= (SELECT edge_left FROM current_size)
        AND ps.edge_right >= (SELECT edge_right FROM current_size)
        AND ps.edge_bottom <= (SELECT edge_bottom FROM current_size)
        AND ps.edge_top >= (SELECT edge_top FROM current_size)
      ORDER BY cs.ascensionist_count DESC NULLS LAST
      LIMIT ${limit}
    `);

    // Query 2: Find high similarity matches using Jaccard similarity
    // Jaccard = |A ∩ B| / |A ∪ B| = matching_holds / (source_holds + target_holds - matching_holds)
    const highSimilarityMatchesQuery = await db.execute(sql`
      WITH source_holds AS (
        SELECT hold_id FROM ${sql.identifier(climbHoldsTable)}
        WHERE climb_uuid = ${params.climb_uuid}
      ),
      source_hold_count AS (
        SELECT COUNT(*) as cnt FROM source_holds
      ),
      candidate_climbs AS (
        SELECT DISTINCT c.uuid
        FROM ${sql.identifier(climbsTable)} c
        WHERE c.uuid != ${params.climb_uuid}
          AND c.layout_id = ${params.layout_id}
          AND c.is_listed = true
          AND c.is_draft = false
          AND c.frames_count = 1
      ),
      climb_similarity AS (
        SELECT
          ch.climb_uuid,
          COUNT(*) as target_hold_count,
          COUNT(*) FILTER (WHERE ch.hold_id IN (SELECT hold_id FROM source_holds)) as matching_holds
        FROM ${sql.identifier(climbHoldsTable)} ch
        WHERE ch.climb_uuid IN (SELECT uuid FROM candidate_climbs)
        GROUP BY ch.climb_uuid
      ),
      similarity_scores AS (
        SELECT
          climb_uuid,
          matching_holds,
          target_hold_count,
          -- Jaccard similarity: intersection / union
          matching_holds::float / (
            (SELECT cnt FROM source_hold_count) + target_hold_count - matching_holds
          ) as jaccard_similarity
        FROM climb_similarity
        WHERE matching_holds > 0
      )
      SELECT
        c.uuid,
        c.setter_username,
        c.name,
        c.description,
        c.frames,
        COALESCE(cs.angle, ${params.angle}) as angle,
        COALESCE(cs.ascensionist_count, 0) as ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(cs.quality_average::numeric, 2) as quality_average,
        ROUND(cs.difficulty_average::numeric - cs.display_difficulty::numeric, 2) as difficulty_error,
        cs.benchmark_difficulty,
        ss.matching_holds,
        ss.target_hold_count,
        ROUND(ss.jaccard_similarity::numeric, 3) as similarity,
        ps.id as matching_size_id,
        ps.name as matching_size_name
      FROM similarity_scores ss
      INNER JOIN ${sql.identifier(climbsTable)} c ON c.uuid = ss.climb_uuid
      INNER JOIN ${sql.identifier(productSizesTable)} ps ON
        c.edge_left > ps.edge_left AND c.edge_right < ps.edge_right
        AND c.edge_bottom > ps.edge_bottom AND c.edge_top < ps.edge_top
      LEFT JOIN ${sql.identifier(climbStatsTable)} cs ON cs.climb_uuid = c.uuid AND cs.angle = ${params.angle}
      LEFT JOIN ${sql.identifier(difficultyGradesTable)} dg ON dg.difficulty = ROUND(cs.display_difficulty::numeric)
      WHERE ss.jaccard_similarity >= ${similarityThreshold}
        AND ss.jaccard_similarity < 1.0  -- Exclude exact matches (they're in the first query)
      ORDER BY ss.jaccard_similarity DESC, cs.ascensionist_count DESC NULLS LAST
      LIMIT ${limit}
    `);

    // Transform results
    const transformRow = (row: Record<string, unknown>, matchType: 'exact_larger' | 'high_similarity'): SimilarClimbMatch => ({
      uuid: row.uuid as string,
      setter_username: (row.setter_username as string) || '',
      name: (row.name as string) || '',
      description: (row.description as string) || '',
      frames: (row.frames as string) || '',
      angle: Number(row.angle),
      ascensionist_count: Number(row.ascensionist_count || 0),
      difficulty: (row.difficulty as string) || '',
      quality_average: row.quality_average?.toString() || '0',
      stars: Math.round((Number(row.quality_average) || 0) * 5),
      difficulty_error: row.difficulty_error?.toString() || '0',
      benchmark_difficulty: row.benchmark_difficulty?.toString() || null,
      litUpHoldsMap: convertLitUpHoldsStringToMap((row.frames as string) || '', params.board_name)[0],
      matchType,
      similarity: Number(row.similarity),
      matchingSizeId: Number(row.matching_size_id),
      matchingSizeName: (row.matching_size_name as string) || '',
    });

    const exactLargerMatches = exactLargerMatchesQuery.rows.map(row =>
      transformRow(row as Record<string, unknown>, 'exact_larger')
    );

    const highSimilarityMatches = highSimilarityMatchesQuery.rows.map(row =>
      transformRow(row as Record<string, unknown>, 'high_similarity')
    );

    // Filter out any duplicates (climbs that appear in both lists)
    const exactUuids = new Set(exactLargerMatches.map(c => c.uuid));
    const filteredSimilarityMatches = highSimilarityMatches.filter(c => !exactUuids.has(c.uuid));

    return {
      exactLargerMatches,
      highSimilarityMatches: filteredSimilarityMatches,
    };
  } catch (error) {
    console.error('Error in getSimilarClimbs:', error);
    throw error;
  }
};
