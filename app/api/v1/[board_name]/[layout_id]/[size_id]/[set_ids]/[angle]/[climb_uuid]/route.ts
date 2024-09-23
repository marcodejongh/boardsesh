// api/v1/[board_name]/[layout_id]/[size_id]/[set_ids]/[climb_uuid]
import { getBoulderProblem } from "@/app/lib/data/queries";
import { BoardRouteParametersWithUuid, ErrorResponse, FetchCurrentProblemResponse } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/util";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: BoardRouteParametersWithUuid },
): Promise<NextResponse<FetchCurrentProblemResponse | ErrorResponse>> {
  try {
    const parsedParams = parseBoardRouteParams(params);
    const result = await getBoulderProblem(parsedParams)

    if (!result) {
      return NextResponse.json({ error: `Failed to find problem ${params.climb_uuid}` }, { status: 404 });
    }
    // Include both the rows and the total count in the response
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
