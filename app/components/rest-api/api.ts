// api.ts

import { SetIdList } from "@/app/lib/board-data";
import { SearchBoulderProblemResult } from "@/app/lib/data/queries";
import {
  FetchCurrentProblemResponse,
  BoardDetails,
  ParsedBoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  SearchRequestPagination,
} from "@/app/lib/types";

const API_BASE_URL = `${process.env.BASE_URL || 'https://www.boardsesh.com'}/api`;

export const fetchResults = async (
  queryParameters: SearchRequestPagination,
  routeParameters: ParsedBoardRouteParameters,
): Promise<SearchBoulderProblemResult> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      onlyClassics: queryParameters.onlyClassics ? "1" : "0",
    }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>),
  );
  
  // Build the URL using the new route structure
  const response = await fetch(
    `${API_BASE_URL}/v1/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/${routeParameters.angle}/search?${urlParams}&bustCache=2`,
  );

  const rawResults = await response.json();

  return rawResults;
};

export const fetchCurrentClimb = async (
  routeParameters: ParsedBoardRouteParametersWithUuid,
): Promise<FetchCurrentProblemResponse> =>
  (
    await fetch(
      `${API_BASE_URL}/v1/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/${routeParameters.angle}/${routeParameters.climb_uuid}?bustCache=1`,
    )
  ).json();

// Fetch beta count
export const fetchBetaCount = async (board: string, uuid: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/v1/${board}/beta/${uuid}`);
  const data = await response.json();
  return data.length;
};

// Fetch board details
export const fetchBoardDetails = async (
  board: string,
  layout: number,
  size: number,
  set_ids: SetIdList,
): Promise<BoardDetails> => {
  const apiUrl = `${API_BASE_URL}/v1/${board}/${layout}/${size}/${set_ids.join(",")}/details?bustCache=342`;
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};
