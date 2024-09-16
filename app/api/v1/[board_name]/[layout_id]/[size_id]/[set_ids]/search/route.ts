import { ErrorResponse, FetchResultsResponse } from "@/app/lib/types";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board_name: string; layout_id: string; size_id: string; set_ids: string } },
): Promise<NextResponse<FetchResultsResponse | ErrorResponse>> {
  const { layout_id, size_id } = params;

  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;

  const minGrade = query.get("minGrade") || 1;
  const angle = query.get("angle") || 40;
  const maxGrade = query.get("maxGrade") || 29;
  const minAscents = query.get("minAscents") || "0";
  const minRating = query.get("minRating") || "0";
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
          ${minGrade && maxGrade ? "AND ROUND(climb_stats.display_difficulty::numeric, 0) BETWEEN $5 AND $6" : ""}
          AND climb_stats.quality_average >= $7
          AND ABS(ROUND(climb_stats.display_difficulty::numeric, 0) - climb_stats.difficulty_average::numeric) <= $8
        )
        SELECT *, 
        (SELECT COUNT(*) FROM filtered_climbs) as total_count
        FROM filtered_climbs
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
        angle,
      ].filter((value) => value !== null), // Filter out null values
    });

    // Include both the rows and the total count in the response
    return NextResponse.json({
      rows: result.rows,
      totalCount: result.rows.length > 0 ? result.rows[0].total_count : 0,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
