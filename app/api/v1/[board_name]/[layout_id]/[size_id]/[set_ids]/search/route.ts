import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board_name: string; layout_id: string; size_id: string; set_ids: string } },
) {
  const { 
    // board_name,
    layout_id, size_id, set_ids } = params;

  // Split comma-separated set_ids into an array
  const setIdsArray = set_ids.split(",");

  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;

  const minGrade = query.get("minGrade") || 1; //TODO: Remove hardcoded min and max grade defaults
  const maxGrade = query.get("maxGrade") || 29;
  const minAscents = query.get("minAscents") || "0"; // Default to 0 ascents
  const minRating = query.get("minRating") || "0"; // Default to 0 rating
  const gradeAccuracy = query.get("gradeAccuracy") || "0";
  const sortBy = query.get("sortBy") || "ascensionist_count";
  const sortOrder = query.get("sortOrder") === "asc" ? "ASC" : "DESC";
  const page = parseInt(query.get("page") || "0", 10);
  const pageSize = parseInt(query.get("pageSize") || "10", 10);
  const offset = page * pageSize;

  // Ensure safe sorting by allowing only specific fields
  const allowedSortColumns = ["ascensionist_count", "display_difficulty", "name", "quality_average"];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "ascensionist_count";

  try {
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
        WHERE climbs.layout_id = $2
        AND climbs.is_listed = 1
        AND climbs.is_draft = 0
        AND product_sizes.id = $3
        AND climb_stats.ascensionist_count >= $4
        ${minGrade && maxGrade ? "AND ROUND(climb_stats.display_difficulty::numeric, 0) BETWEEN $5 AND $6" : ""}
        AND climb_stats.quality_average >= $7
        AND ABS(ROUND(climb_stats.display_difficulty::numeric, 0) - climb_stats.difficulty_average::numeric) <= $8
        ORDER BY ${safeSortBy} ${sortOrder}
        LIMIT $9 OFFSET $10
      `,
      values: [
        size_id,
        layout_id,
        size_id,
        minAscents,
        minGrade,
        maxGrade,
        minRating,
        gradeAccuracy,
        pageSize,
        offset,
      ].filter((value) => value !== null), // Filter out null values
    });

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
