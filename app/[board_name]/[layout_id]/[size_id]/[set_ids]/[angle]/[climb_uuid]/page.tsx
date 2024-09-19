import ResultsPage from "@/app/components/board-page/ResultsPage";
import { fetchCurrentClimb, fetchBoardDetails } from "@/app/components/rest-api/api";
import { getSetIds } from "@/app/components/board/board-data";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { notFound } from "next/navigation";
import { BoardRouteParametersWithUuid, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { getBoardDetails, getBoulderProblem, searchBoulderProblems } from "@/app/lib/data/queries";
import { parseBoardRouteParams } from "@/app/lib/util";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardRouteParametersWithUuid;
}) {
  const parsedParams = parseBoardRouteParams(params);
  
  // Query parameters for search results
  const queryParameters: SearchRequestPagination = {
    minGrade: 10,
    maxGrade: 33,
    name: "",
    minAscents: 1,
    sortBy: "ascents",
    sortOrder: "desc",
    minRating: 1.0,
    onlyClassics: false,
    gradeAccuracy: 1,
    settername: "",
    setternameSuggestion: "",
    holds: "",
    mirroredHolds: "",
    pageSize: PAGE_LIMIT,
    page: 0
  };

  try {
    // Fetch the search results using searchBoulderProblems
    const [fetchedResults, boardDetails, currentClimb] = await Promise.all([
      searchBoulderProblems(parsedParams, queryParameters),
      getBoardDetails(parsedParams),
      getBoulderProblem(parsedParams)
    ]);

    if (!fetchedResults || fetchedResults.boulderproblems.length === 0) {
      notFound();
    }
    
    
    let boulderProblems = [ ...fetchedResults.boulderproblems ];

    if (!fetchedResults.boulderproblems.find(({ uuid }) => uuid === parsedParams.climb_uuid)) {
      boulderProblems = [ currentClimb, ...boulderProblems];
    }
    
    return (
      <ResultsPage
        board={parsedParams.board_name}
        layout={parsedParams.layout_id}
        size={parsedParams.size_id}
        angle={parsedParams.angle}
        set_ids={parsedParams.set_ids}
        currentClimb={currentClimb}
        results={boulderProblems}
        resultsCount={fetchedResults.totalCount}
        initialQueryParameters={queryParameters}
        boardDetails={boardDetails}
        climb_uuid={parsedParams.climb_uuid}
      />
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
