import { sql } from "@vercel/postgres";
import { BoardRouteParametersWithUuid, BoardRouteParameters, BoulderProblem, ParsedBoardRouteParametersWithUuid, ParsedBoardRouteParameters, SearchRequest, SearchRequestPagination } from "../types";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";

// Collect data for each set_id
export const getBoardDetails = async ({board_name, layout_id, size_id, set_ids} : ParsedBoardRouteParameters) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imagesToHolds: Record<string, any> = {};

  for (const set_id of set_ids) {
    // Get image filename
    const { rows } = await sql`
        SELECT image_filename
        FROM product_sizes_layouts_sets
        WHERE layout_id = ${layout_id}
        AND product_size_id = ${size_id}
        AND set_id = ${set_id}
      `;

    if (rows.length === 0) continue;

    const imageFilename = rows[0].image_filename;

    // Extract image filename
    const image_url = imageFilename.split("/")[1];

    // Get holds data
    const { rows: holds } = await sql`
        SELECT 
          placements.id AS placement_id, 
          mirrored_placements.id AS mirrored_placement_id, 
          holes.x, holes.y
        FROM holes
        INNER JOIN placements ON placements.hole_id = holes.id
        AND placements.set_id = ${set_id}
        AND placements.layout_id = ${layout_id}
        LEFT JOIN placements mirrored_placements ON mirrored_placements.hole_id = holes.mirrored_hole_id
        AND mirrored_placements.set_id = ${set_id}
        AND mirrored_placements.layout_id = ${layout_id}
      `;

    if (holds.length > 0) {
      imagesToHolds[image_url] = holds.map((hold) => [
        hold.placement_id, // First position: regular placement ID
        hold.mirrored_placement_id || null, // Second position: mirrored placement ID (or null)
        hold.x, // Third position: x coordinate
        hold.y, // Fourth position: y coordinate
      ]);
    }
  }

  // Get size dimensions
  const { rows: sizeDimensions } = await sql`
    SELECT edge_left, edge_right, edge_bottom, edge_top
    FROM product_sizes
    WHERE id = ${size_id}
  `;

  if (sizeDimensions.length === 0) {
    throw new Error("Size dimensions not found");
  }

  return {
    images_to_holds: imagesToHolds,
    edge_left: sizeDimensions[0].edge_left,
    edge_right: sizeDimensions[0].edge_right,
    edge_bottom: sizeDimensions[0].edge_bottom,
    edge_top: sizeDimensions[0].edge_top,
  };
};


export const getBoulderProblem = async (params: ParsedBoardRouteParametersWithUuid): Promise<BoulderProblem> => {
  return (await sql.query({
    text: `
        SELECT climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
        climbs.frames, climb_stats.angle, climb_stats.ascensionist_count,
        dg.boulder_name as difficulty,
        ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
        ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
        climb_stats.benchmark_difficulty
        FROM climbs
        LEFT JOIN climb_stats ON climb_stats.climb_uuid = climbs.uuid
        LEFT JOIN difficulty_grades dg on difficulty = ROUND(climb_stats.display_difficulty::numeric)
        INNER JOIN product_sizes ON product_sizes.id = $1
        WHERE climbs.layout_id = $2
        AND product_sizes.id = $3
        AND climbs.uuid = $4
        AND climb_stats.angle = $5
        limit 1
      `,
    values: [params.size_id, params.layout_id, params.size_id, params.climb_uuid, params.angle]
  })).rows[0];
};

export type SearchBoulderProblemResult = {
  boulderproblems: BoulderProblem[];
  totalCount: number;
}

export const searchBoulderProblems = async (
  params: ParsedBoardRouteParameters,
  searchParams: SearchRequestPagination,
): Promise<SearchBoulderProblemResult> => {
  const allowedSortColumns: Record<SearchRequest["sortBy"], string> = {
    ascents: "ascensionist_count",
    difficulty: "display_difficulty",
    name: "name",
    quality: "quality_average",
  };

  const safeSortBy = allowedSortColumns[searchParams.sortBy] || "ascensionist_count";

  const query = await sql.query({
    text: `
        WITH filtered_climbs AS (
          SELECT
            climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
            climbs.frames, climb_stats.angle, climb_stats.ascensionist_count,
            dg.boulder_name as difficulty,
            ROUND(climb_stats.quality_average::numeric, 2) as quality_average,
            ROUND(climb_stats.difficulty_average::numeric - climb_stats.display_difficulty::numeric, 2) AS difficulty_error,
            climb_stats.benchmark_difficulty
          FROM climbs
          LEFT JOIN climb_stats ON climb_stats.climb_uuid = climbs.uuid
          LEFT JOIN difficulty_grades dg on difficulty = ROUND(climb_stats.display_difficulty::numeric)
          INNER JOIN product_sizes ON product_sizes.id = $1
          WHERE climbs.layout_id = $2
          AND climbs.is_listed = 1
          AND climbs.is_draft = 0
          AND product_sizes.id = $3
          AND climb_stats.angle = $11
          AND climb_stats.ascensionist_count >= $4
          ${
            searchParams.minGrade && searchParams.maxGrade
              ? "AND ROUND(climb_stats.display_difficulty::numeric, 0) BETWEEN $5 AND $6"
              : ""
          }
          AND climb_stats.quality_average >= $7
          AND ABS(ROUND(climb_stats.display_difficulty::numeric, 0) - climb_stats.difficulty_average::numeric) <= $8
        )
        SELECT *, 
        (SELECT COUNT(*) FROM filtered_climbs) as total_count
        FROM filtered_climbs
        ORDER BY ${safeSortBy} ${searchParams.sortOrder === "asc" ? "ASC" : "DESC"}
        LIMIT $9 OFFSET $10
      `,
    values: [
      params.size_id,
      params.layout_id,
      params.size_id,
      searchParams.minAscents,
      searchParams.minGrade,
      searchParams.maxGrade,
      searchParams.minRating,
      searchParams.gradeAccuracy,
      searchParams.pageSize,
      searchParams.page * PAGE_LIMIT,
      params.angle,
    ],
  });

  return {
    boulderproblems: query.rows,
    totalCount: query.rows.length > 0 ? query.rows[0].total_count : 0,
  };
};
