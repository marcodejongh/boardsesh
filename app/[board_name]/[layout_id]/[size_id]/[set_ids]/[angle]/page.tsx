import { fetchResults } from "@/app/components/rest-api/api";
import { getSetIds } from "@/app/components/board/board-data";
import { redirect } from "next/navigation";
import { searchBoulderProblems } from "@/app/lib/data/queries";
import { BoardRouteParametersWithUuid, SearchRequestPagination } from "@/app/lib/types";
import { parseBoardRouteParams } from "@/app/lib/util";

export default async function ClimbPage({
  params,
}: {
  params: BoardRouteParametersWithUuid;
}) {
  const parsedParams = parseBoardRouteParams(params);
  
  // Example query parameters
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
    page: 1,
    pageSize: 1
  };
  let fetchedResults;
  try {
    // Fetch results for the initial render
    fetchedResults = (await Promise.all([
      searchBoulderProblems(parsedParams, queryParameters),
    ]))[0];

    
  } catch (error) {
    console.error("Error fetching climb data:", error);
    return <div>Failed to load climbs.</div>;
  }
  redirect(`/${parsedParams.board_name}/${parsedParams.layout_id}/${parsedParams.size_id}/${parsedParams.set_ids.join(',')}/${parsedParams.angle}/${fetchedResults.boulderproblems[0].uuid}`);
}

