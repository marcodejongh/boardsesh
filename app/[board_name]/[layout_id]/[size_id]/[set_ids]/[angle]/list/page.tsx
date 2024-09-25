import { notFound } from "next/navigation";
import { BoardRouteParametersWithUuid, SearchRequestPagination } from "@/app/lib/types";
import { getBoardDetails, searchBoulderProblems } from "@/app/lib/data/queries";
import { parseBoardRouteParams } from "@/app/lib/util";
import ClimbsList from "@/app/components/board-page/climbs-list";
import { fetchBoardDetails, fetchResults } from "@/app/components/rest-api/api";

const PAGE_LIMIT = 20; // Set your page limit here or import it from elsewhere

export default async function DynamicResultsPage({
  params,
  searchParams
}: {
  params: BoardRouteParametersWithUuid;
  searchParams: {
    query?: string;
    page?: string;
    gradeAccuracy?: string;
    maxGrade?: string;
    minAscents?: string;
    minGrade?: string;
    minRating?: string;
    sortBy?: string;
    sortOrder?: string;
    name?: string;
    onlyClassics?: string;
    settername?: string;
    setternameSuggestion?: string;
    holds?: string;
    mirroredHolds?: string;
    pageSize?: string;
  }
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    // Create searchParams object from the passed query parameters
    const searchParamsObject: SearchRequestPagination = {
      gradeAccuracy: parseFloat(searchParams.gradeAccuracy || "0"),
      maxGrade: parseInt(searchParams.maxGrade || "29", 10),
      minAscents: parseInt(searchParams.minAscents || "0", 10),
      minGrade: parseInt(searchParams.minGrade || "1", 10),
      minRating: parseFloat(searchParams.minRating || "0"),
      sortBy: (searchParams.sortBy || "ascents") as "ascents" | "difficulty" | "name" | "quality",
      sortOrder: (searchParams.sortOrder || "desc") as "asc" | "desc",
      name: searchParams.name || "",
      onlyClassics: searchParams.onlyClassics === "true",
      settername: searchParams.settername || "",
      setternameSuggestion: searchParams.setternameSuggestion || "",
      holds: searchParams.holds || "",
      mirroredHolds: searchParams.mirroredHolds || "",
      pageSize: Number(searchParams.pageSize || PAGE_LIMIT),
      page: Number(searchParams.page || 0),
    };
    // Fetch the climbs and board details server-side
    const [fetchedResults, boardDetails] = await Promise.all([
      fetchResults(searchParamsObject, parsedParams),
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    ]);

    if (!fetchedResults || fetchedResults.boulderproblems.length === 0) {
      notFound();
    }

    return (
      <ClimbsList
        {...parsedParams}
        initialClimbs={fetchedResults.boulderproblems}
        resultsCount={fetchedResults.totalCount}
        boardDetails={boardDetails}
        searchParams={searchParamsObject} // Pass the parsed searchParams
      />
    );
  } catch (error) {
    console.error("Error fetching results or climb:", error);
    notFound(); // or show a 500 error page
  }
}
