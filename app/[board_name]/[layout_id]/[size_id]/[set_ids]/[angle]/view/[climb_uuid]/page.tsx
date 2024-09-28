import { notFound } from "next/navigation";
import { BoardRouteParametersWithUuid } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/url-utils";
import { fetchBoardDetails, fetchCurrentClimb } from "@/app/components/rest-api/api";
import BoardLitupHolds from "@/app/components/board/board-litup-holds";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardRouteParametersWithUuid;
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    // Fetch the search results using searchBoulderProblems
    const [boardDetails, currentClimb] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
      fetchCurrentClimb(parsedParams)
    ]);
    
    return (
      <BoardLitupHolds 
        holdsData={boardDetails.holdsData} 
        litUpHoldsMap={currentClimb.litUpHoldsMap} 
       />
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
