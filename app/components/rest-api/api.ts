// api.ts

import {
  BoulderProblem,
  GetAnglesResponse,
  GetBoardDetailsResponse,
  GetGradesResponse,
  GetLayoutsResponse,
  GetSearchResultsResponse,
  SearchCountResponse,
  SearchRequest,
} from "./types";

const API_BASE_URL = "/api";
// 
const headers = new Headers({ "ngrok-skip-browser-warning": "true" });



export const fetchResultsCount = async (
  pageNumber: number,
  pageSize: number,
  queryParameters: Partial<SearchRequest>,
  routeParameters: { board_name: string; layout_id: string; size_id: string; set_ids: string },
): Promise<SearchCountResponse> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      page: pageNumber,
      pageSize,
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
    `${API_BASE_URL}/v1/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/count?${urlParams}`,
    { headers },
  );

  return response.json();
};

export const fetchResults = async (
  pageNumber: number,
  pageSize: number,
  queryParameters: Partial<SearchRequest>,
  routeParameters: { board_name: string; layout_id: string; size_id: string; set_ids: string },
): Promise<BoulderProblem[]> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      page: pageNumber,
      pageSize,
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
    `${API_BASE_URL}/v1/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/search?${urlParams}`,
    { headers },
  );

  const rawResults = await response.json();

  return rawResults as BoulderProblem[];
};

const gradesCache = new Map<string, GetGradesResponse>();

// Fetch grades
export const fetchGrades = async (boardName: string): Promise<GetGradesResponse> => {
  if (gradesCache.has(boardName)) {
    return gradesCache.get(boardName)!;
  }

  const response = await fetch(`${API_BASE_URL}/v1/grades/${boardName}`, { headers });
  const data: GetGradesResponse = await response.json();

  gradesCache.set(boardName, data);

  return data;
};

const anglesCache = new Map<string, GetAnglesResponse>();

// Fetch angles
export const fetchAngles = async (boardName: string, layout: number): Promise<GetAnglesResponse> => {
  const cacheKey = `${boardName}_${layout}`;
  if (anglesCache.has(cacheKey)) {
    return anglesCache.get(cacheKey)!;
  }

  const response = await fetch(`${API_BASE_URL}/v1/angles/${boardName}/${layout}`, { headers });
  const data: GetAnglesResponse = (await response.json()).flat();

  anglesCache.set(cacheKey, data);

  return data;
};



// Fetch beta count
export const fetchBetaCount = async (board: string, uuid: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/v1/${board}/beta/${uuid}`, { headers });
  const data = await response.json();
  return data.length;
};

// Fetch board details
export const fetchBoardDetails = async (
  board: string,
  layout: string,
  size: string,
  set_ids: string,
): Promise<GetBoardDetailsResponse> => {
  const apiUrl = `${API_BASE_URL}/v1/${board}/${layout}/${size}/${set_ids}/details`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
