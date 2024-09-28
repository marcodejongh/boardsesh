import { getBoardDetails } from "@/app/lib/data/queries";
import { BoardRouteParameters } from "@/app/lib/types";
import { NextResponse } from "next/server";
import { parseBoardRouteParams } from "@/app/lib/url-utils";

export async function GET(req: Request, { params }: { params: BoardRouteParameters }) {
  try {
    const parsedParams = parseBoardRouteParams(params);
    const boardDetails = await getBoardDetails(parsedParams);

    // Return the combined result
    return NextResponse.json(boardDetails);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}
