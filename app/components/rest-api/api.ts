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
  routeParameters: Record<string, any>,
): Promise<SearchCountResponse> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      ...routeParameters,
      page: pageNumber,
      pageSize,
      onlyClassics: queryParameters.onlyClassics ? "1" : "0",
    }).reduce((acc, [key, value]) => {
      // Only include the parameter if value is not undefined
      if (value !== undefined) {
        acc[key] = String(value); // Convert all values to strings
      }
      return acc;
    }, {} as Record<string, string>),
  );

  const response = await fetch(`${API_BASE_URL}/v1/search/count?${urlParams}`, {
    headers,
  });
  return response.json();
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

export const fetchResults = async (
  pageNumber: number,
  pageSize: number,
  queryParameters: Partial<SearchRequest>,
  routeParameters: Record<string, any>,
): Promise<BoulderProblem[]> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      ...routeParameters,
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

  const response = await fetch(`${API_BASE_URL}/v1/search?${urlParams}`, { headers });
  const rawResults = await response.json();

  return rawResults.map(
    (row: any): BoulderProblem => ({
      uuid: row[0],
      setter: row[1],
      name: row[2],
      instructions: row[3],
      holds: row[4],
      angle: row[5],
      ascents: row[6],
      grade: row[7],
      gradeAdjustment: `${row[9]}`.replace("0.", "."),
      stars: Math.round(row[8] * 100) / 100,
      mystery2: row[10], // Define a more specific type for mystery2 if needed
    }),
  );
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
  const apiUrl = `${API_BASE_URL}/v1/get_board_details/${board}/${layout}/${size}/${set_ids}`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};
