import ResultsPage from "@/app/components/board-page/ResultsPage";
import { fetchResults, fetchCurrentClimb, fetchBoardDetails } from "@/app/components/rest-api/api";
import { getSetIds } from "@/app/components/kilter-board/board-data";
import { PAGE_LIMIT } from "@/app/components/board-page/constants";
import { notFound } from "next/navigation";
import { BoardLayoutSizeSetIdRouteClimbUUIDParameters } from "@/app/lib/types";

export default async function DynamicResultsPage({
  params,
}: {
  params: BoardLayoutSizeSetIdRouteClimbUUIDParameters;
}) {
  console.log(`!!!!!!!!!Route rerendered!!!!!!!!!!!`)
  const { board_name, climb_uuid } = params;
  const layout_id = Number(params.layout_id);
  const size_id = Number(params.size_id);
  const angle = Number(params.angle);
  
  console.log(params.set_ids);
  const set_ids = params.set_ids || getSetIds(layout_id, size_id);

  // Query parameters for search results
  const queryParameters = {
    minGrade: 10,
    maxGrade: 33,
    name: "",
    angle: 40,
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
  };

  try {
    // Fetch the search results
    const [fetchedResults, boardDetails] = await Promise.all([
      fetchResults(0, PAGE_LIMIT, queryParameters, {
        board_name,
        layout_id,
        size_id,
        set_ids,
        angle,
      }),
      fetchBoardDetails(board_name, layout_id, size_id, set_ids)]);
    if (!fetchedResults || fetchedResults.rows.length === 0) {
      notFound();
    }
    

    // Fetch the current climb by UUID if it exists in the URL
    let currentClimb = fetchedResults.rows.find(({ uuid }) => uuid === climb_uuid);
    if (!currentClimb) {
      currentClimb = await fetchCurrentClimb({
        board_name,
        layout_id,
        size_id,
        set_ids,
        climb_uuid,
        angle
      });
    }

    // Fallback: If no climb_uuid provided or fetch fails, use the first result as current climb
    if (!currentClimb && fetchedResults.rows.length > 0) {
      currentClimb = fetchedResults.rows[0];
    }
    console.log(boardDetails);
    console.log('xxxxxxxxx');

    return (
      <ResultsPage
        board={board_name}
        layout={layout_id}
        size={size_id}
        angle={angle}
        set_ids={set_ids}
        currentClimb={currentClimb}
        results={fetchedResults.rows}
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
