import { getBoardDetails } from "@/app/lib/data/queries";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { board_name: string; layout_id: string; size_id: string; set_ids: string } },
) {
  const { layout_id, size_id, set_ids, board_name } = params;

  // Split comma-separated set_ids
  const setIdsArray = set_ids.split(",");

  try {
    const boardDetails = await getBoardDetails(board_name, Number(layout_id), size_id, setIdsArray);
    
    // Return the combined result
    return NextResponse.json(boardDetails);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}

