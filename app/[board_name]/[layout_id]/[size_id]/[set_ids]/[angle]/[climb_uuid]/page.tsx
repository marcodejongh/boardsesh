import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { notFound } from "next/navigation";
import { BoardRouteParametersWithUuid, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { getBoardDetails, getBoulderProblem, searchBoulderProblems } from "@/app/lib/data/queries";
import { parseBoardRouteParams } from "@/app/lib/util";
import Board from "@/app/components/board/board";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardRouteParametersWithUuid;
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    // Fetch the search results using searchBoulderProblems
    const [boardDetails, currentClimb] = await Promise.all([
      getBoardDetails(parsedParams),
      getBoulderProblem(parsedParams)
    ]);
    
    return (
      <Board
        currentClimb={currentClimb}
        boardDetails={boardDetails}
        routeParams={parsedParams}
      />
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
