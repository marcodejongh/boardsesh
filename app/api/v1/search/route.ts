import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const page = parseInt(query.get("page") || "0", 10);
  const pageSize = parseInt(query.get("pageSize") || "10", 10);
  const offset = page * pageSize;

  // Get sorting information from query params
  const sortBy = query.get("sortBy") || "ascensionist_count";
  const sortOrder = query.get("sortOrder") === "asc" ? "ASC" : "DESC";

  // Ensure safe sorting by allowing only specific fields
  const allowedSortColumns = ["ascensionist_count", "display_difficulty", "name", "quality_average"];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "ascensionist_count";

  try {
    // Parameterized query
    const result = await sql.query({
      text: `
        SELECT
          climbs.uuid, climbs.setter_username, climbs.name, climbs.description,
          climbs.frames, climb_stats.angle, climb_stats.ascensionist_count,
          (SELECT boulder_name FROM difficulty_grades WHERE difficulty = ROUND(climb_stats.display_difficulty::numeric, 2)) AS difficulty,
          climb_stats.quality_average,
          (SELECT ROUND(climb_stats.difficulty_average::numeric - ROUND(climb_stats.display_difficulty::numeric, 2), 2)) AS difficulty_error,
          climb_stats.benchmark_difficulty
        FROM climbs
        LEFT JOIN climb_stats ON climb_stats.climb_uuid = climbs.uuid
        INNER JOIN product_sizes ON product_sizes.id = $1
        WHERE climbs.frames_count = 1
        AND climbs.is_draft = 0
        AND climbs.is_listed = 1
        AND climbs.layout_id = $2
        AND climbs.edge_left > product_sizes.edge_left
        AND climbs.edge_right < product_sizes.edge_right
        AND climbs.edge_bottom > product_sizes.edge_bottom
        AND climbs.edge_top < product_sizes.edge_top
        AND climb_stats.ascensionist_count >= $3
        AND ROUND(climb_stats.display_difficulty::numeric, 0) BETWEEN $4 AND $5
        AND climb_stats.quality_average >= $6
        AND ABS(ROUND(climb_stats.display_difficulty::numeric, 0) - climb_stats.difficulty_average::numeric) <= $7
        ORDER BY ${safeSortBy} ${sortOrder}
        LIMIT $8 OFFSET $9
      `,
      values: [
        query.get("size_id"),
        query.get("layout_id"),
        query.get("minAscents"),
        query.get("minGrade"),
        query.get("maxGrade"),
        query.get("minRating"),
        query.get("gradeAccuracy"),
        pageSize,
        offset,
      ],
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }
}
