import {
  BoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  ParsedBoardRouteParameters,
  BoardRouteParametersWithUuid,
  SearchRequestPagination,
} from "@/app/lib/types";
import { URLSearchParams } from "url";

export function parseBoardRouteParams<T extends BoardRouteParameters | BoardRouteParametersWithUuid>(
  params: T,
): T extends BoardRouteParametersWithUuid ? ParsedBoardRouteParametersWithUuid : ParsedBoardRouteParameters {
  const { board_name, layout_id, size_id, set_ids, angle } = params;

  const parsedParams = {
    board_name,
    layout_id: Number(layout_id),
    size_id: Number(size_id),
    set_ids: decodeURIComponent(set_ids)
      .split(",")
      .map((str) => Number(str)),
    angle: Number(angle),
  };

  // Type guard to check if `params` has the `climb_uuid` field
  if ("climb_uuid" in params) {
    // Since we know the type here, explicitly return the correct type
    return {
      ...parsedParams,
      climb_uuid: (params as BoardRouteParametersWithUuid).climb_uuid,
    } as any;
  }

  // For the non-climb_uuid case, return as ParsedBoardRouteParameters
  return parsedParams as any;
}

export const searchParamsToUrlParams = (params: SearchRequestPagination): URLSearchParams => {
  return new URLSearchParams({
    gradeAccuracy: params.gradeAccuracy.toString(),
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
    pageSize: Number(urlParams.get("pageSize") || "20"),
  };
}