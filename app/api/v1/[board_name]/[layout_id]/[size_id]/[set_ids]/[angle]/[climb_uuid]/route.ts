// api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/[climb_uuid]
import { BoardLayoutSizeSetIdRouteClimbUUIDParameters, ErrorResponse, FetchCurrentProblemResponse } from "@/app/lib/types";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: BoardLayoutSizeSetIdRouteClimbUUIDParameters },
): Promise<NextResponse<FetchCurrentProblemResponse | ErrorResponse>> {
  const { layout_id, size_id, climb_uuid, angle } = params;

  try {
    const result = await sql.query({
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
      values: [size_id, layout_id, size_id, climb_uuid, angle].filter((value) => value !== null), // Filter out null values
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: `Failed to find problem ${climb_uuid}` }, { status: 404 });
    }
    // Include both the rows and the total count in the response
    return NextResponse.json({
      ...result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
