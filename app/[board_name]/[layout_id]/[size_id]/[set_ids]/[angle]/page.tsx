import { fetchResults } from "@/app/components/rest-api/api";
import { getSetIds } from "@/app/components/kilter-board/board-data";
import { redirect } from "next/navigation";
import { searchBoulderProblems } from "@/app/lib/data/queries";

export default async function ClimbPage({
  params,
}: {
  params: { board_name: string; layout_id: string; size_id: string, set_ids: string; angle: string };
}) {
  const { board_name } = params;
  const layout_id = Number(params.layout_id);
  const size_id = Number(params.size_id);
  const angle = Number(params.angle);

  const set_ids = params.set_ids || getSetIds(layout_id, size_id);

  // Example query parameters
  const queryParameters = {
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
  };
  let fetchedResults;
  try {
    // Fetch results for the initial render
    fetchedResults = (await Promise.all([
      searchBoulderProblems(0, 1, queryParameters, {
        board_name,
        layout_id,
        size_id,
        set_ids,
        angle,
      }),
    ]))[0];

    
  } catch (error) {
    console.error("Error fetching climb data:", error);
    return <div>Failed to load climbs.</div>;
  }
  redirect(`/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/${fetchedResults.rows[0].uuid}`);
}

