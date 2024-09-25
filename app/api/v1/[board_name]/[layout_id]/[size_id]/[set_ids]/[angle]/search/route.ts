import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { convertLitUpHoldsStringToMap } from "@/app/components/board/util";
import { SearchBoulderProblemResult, searchBoulderProblems } from "@/app/lib/data/queries";
import { BoardRouteParameters, ErrorResponse, FetchResultsResponse, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/util";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

// Refactor: Keep BoardRouteParameters and SearchRequest fields in separate objects
export async function GET(
  req: Request,
  { params }: { params: BoardRouteParameters },
): Promise<NextResponse<SearchBoulderProblemResult | ErrorResponse>> {
  // Extract search parameters from query string
  const query = new URL(req.url).searchParams;
  const parsedParams = parseBoardRouteParams(params);

  const searchParams: SearchRequestPagination = {
    gradeAccuracy: parseFloat(query.get("gradeAccuracy") || "0"),
    maxGrade: parseInt(query.get("maxGrade") || "29", 10),
    minAscents: parseInt(query.get("minAscents") || "0", 10),
    minGrade: parseInt(query.get("minGrade") || "1", 10),
    minRating: parseFloat(query.get("minRating") || "0"),
    sortBy: (query.get("sortBy") || "ascents") as "ascents" | "difficulty" | "name" | "quality",
    sortOrder: (query.get("sortOrder") || "desc") as "asc" | "desc",
    name: query.get("name") || "",
    onlyClassics: query.get("onlyClassics") === "true",
    settername: query.get("settername") || "",
    setternameSuggestion: query.get("setternameSuggestion") || "",
    holds: query.get("holds") || "",
    mirroredHolds: query.get("mirroredHolds") || "",
    pageSize: Number(query.get("pageSize") || PAGE_LIMIT),
    page: Number(query.get("page") || 0),
  };

  try {
    // Call the separate function to perform the search
    const result = await searchBoulderProblems(parsedParams, searchParams);
    
    // Return response
    return NextResponse.json({
      totalCount: result.totalCount,
      boulderproblems: result.boulderproblems.map((boulderProblem) => ({
        ...boulderProblem,
        litUpHoldsMap: convertLitUpHoldsStringToMap(boulderProblem.frames, parsedParams.board_name),
      })),
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Failed to fetch board details" }, { status: 500 });
  }
}