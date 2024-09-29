import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  SearchRequestPagination,
  ClimbUuid,
} from "@/app/lib/types";
import { PAGE_LIMIT } from "../components/board-page/constants";

export function parseBoardRouteParams<T extends BoardRouteParameters>(
  params: T
): T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters {
  const { board_name, layout_id, size_id, set_ids, angle, climb_uuid } = params;

  const parsedParams = {
    board_name,
    layout_id: Number(layout_id),
    size_id: Number(size_id),
    set_ids: decodeURIComponent(set_ids)
      .split(",")
      .map((str) => Number(str)),
    angle: Number(angle),
  };

  if (climb_uuid) {
    // TypeScript knows climb_uuid is present, so return the correct type
    return {
      ...parsedParams,
      climb_uuid,
    } as T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : never;
  }

  // Return parsedParams as ParsedBoardRouteParameters when climb_uuid is absent
  return parsedParams as T extends BoardRouteParametersWithUuid ? never : ParsedBoardRouteParameters;
}

export const searchParamsToUrlParams = (params: SearchRequestPagination): URLSearchParams => {
  return new URLSearchParams({
    gradeAccuracy: params.gradeAccuracy.toString(),
    climbName: (params.climbName || '').toString(),
    maxGrade: params.maxGrade.toString(),
    minAscents: params.minAscents.toString(),
    minGrade: params.minGrade.toString(),
    minRating: params.minRating.toString(),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    name: params.name,
    onlyClassics: params.onlyClassics.toString(),
    settername: params.settername,
    setternameSuggestion: params.setternameSuggestion,
    holds: params.holds,
    mirroredHolds: params.mirroredHolds,
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
  });
};

// Helper function to parse search query params
export const urlParamsToSearchParams = (urlParams: URLSearchParams): SearchRequestPagination => {
  return {
    gradeAccuracy: parseFloat(urlParams.get("gradeAccuracy") || "0"),
    climbName: urlParams.get("climbName") || "",
    maxGrade: parseInt(urlParams.get("maxGrade") || "29", 10),
    minAscents: parseInt(urlParams.get("minAscents") || "0", 10),
    minGrade: parseInt(urlParams.get("minGrade") || "1", 10),
    minRating: parseFloat(urlParams.get("minRating") || "0"),
    sortBy: (urlParams.get("sortBy") || "ascents") as "ascents" | "difficulty" | "name" | "quality",
    sortOrder: (urlParams.get("sortOrder") || "desc") as "asc" | "desc",
    name: urlParams.get("name") || "",
    onlyClassics: urlParams.get("onlyClassics") === "true",
    settername: urlParams.get("settername") || "",
    setternameSuggestion: urlParams.get("setternameSuggestion") || "",
    holds: urlParams.get("holds") || "",
    mirroredHolds: urlParams.get("mirroredHolds") || "",
    page: Number(urlParams.get("page") || "0"),
    pageSize: Number(urlParams.get("pageSize") || PAGE_LIMIT),
  };
}


export const constructClimbViewUrl = (
  { board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters,
  climb_uuid: ClimbUuid,
) => `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/view/${climb_uuid}`;

export const constructClimbList = (
  { board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters,
) => `/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/list`;

export const constructClimbSearchUrl = ({ board_name, layout_id, angle, size_id, set_ids }: ParsedBoardRouteParameters, queryString: string) =>
  `/api/v1/${board_name}/${layout_id}/${size_id}/${set_ids}/${angle}/search?${queryString}`;