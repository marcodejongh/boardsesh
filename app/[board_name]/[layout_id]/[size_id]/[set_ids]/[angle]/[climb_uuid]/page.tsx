import ResultsPage from "@/app/components/board-page/ResultsPage";
import { fetchCurrentClimb, fetchBoardDetails } from "@/app/components/rest-api/api";
import { getSetIds } from "@/app/components/kilter-board/board-data";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { notFound } from "next/navigation";
import { BoardLayoutSizeSetIdRouteClimbUUIDParameters, SearchRequest, SearchRequestPagination } from "@/app/lib/types";
import { getBoardDetails, getBoulderProblem, searchBoulderProblems } from "@/app/lib/data/queries";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardLayoutSizeSetIdRouteClimbUUIDParameters;
}) {
  console.log(`!!!!!!!!!Route rerendered!!!!!!!!!!!`);
  const { board_name, climb_uuid } = params;
  const layout_id = Number(params.layout_id);
  const size_id = Number(params.size_id);
  const angle = Number(params.angle);
  
  const set_ids = params.set_ids || getSetIds(layout_id, size_id);

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
      searchBoulderProblems({
        board_name,
        layout_id,
        size_id,
        set_ids,
        angle
      }, queryParameters),
      getBoardDetails(board_name, layout_id, size_id, [1,20]),
      getBoulderProblem({
        board_name,
        layout_id,
        size_id,
        set_ids,
        climb_uuid,
        angle
      }) // TODO: Update logic if necessary
    ]);

    if (!fetchedResults || fetchedResults.boulderproblems.length === 0) {
      notFound();
    }
    
    
    let boulderProblems = [ ...fetchedResults.boulderproblems ];

    if (!fetchedResults.boulderproblems.find(({ uuid }) => uuid === climb_uuid)) {
      boulderProblems = [ currentClimb, ...boulderProblems];
    }
    
    return (
      <ResultsPage
        board={board_name}
        layout={layout_id}
        size={size_id}
        angle={angle}
        set_ids={set_ids}
        currentClimb={currentClimb}
        results={boulderProblems}
        resultsCount={fetchedResults.totalCount}
        initialQueryParameters={queryParameters}
        boardDetails={boardDetails}
        climb_uuid={climb_uuid}
      />
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
