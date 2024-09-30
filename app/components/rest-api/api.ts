// api.ts

import { SetIdList } from '@/app/lib/board-data';
import { LayoutRow, SearchBoulderProblemResult, SetRow, SizeRow } from '@/app/lib/data/queries';
import {
  FetchCurrentProblemResponse,
  BoardDetails,
  ParsedBoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  SearchRequestPagination,
  BoardName,
  LayoutId,
  Size,
} from '@/app/lib/types';

const API_BASE_URL = `${process.env.BASE_URL || 'https://www.boardsesh.com'}/api`;

export const fetchResults = async (
  queryParameters: SearchRequestPagination,
  routeParameters: ParsedBoardRouteParameters,
): Promise<SearchBoulderProblemResult> => {
  const urlParams = new URLSearchParams(
    Object.entries({
      ...queryParameters,
      onlyClassics: queryParameters.onlyClassics ? '1' : '0',
    }).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      },
      {} as Record<string, string>,
    ),
  );

  // Build the URL using the new route structure
  const response = await fetch(
    `${API_BASE_URL}/v1/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/${routeParameters.angle}/search?${urlParams}&bustCache=32`,
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
  const apiUrl = `${API_BASE_URL}/v1/${board}/${layout}/${size}/${set_ids.join(',')}/details?bustCache=100`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchLayouts = async (board_name: BoardName): Promise<LayoutRow[]> => {
  //TODO: Fix type definition
  const apiUrl = `${API_BASE_URL}/v1/${board_name}/layouts`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchSizes = async (board_name: BoardName, layout_id: LayoutId): Promise<SizeRow[]> => {
  //TODO: Fix type definition
  const apiUrl = `${API_BASE_URL}/v1/${board_name}/${layout_id}/sizes`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchSets = async (board_name: BoardName, layout_id: LayoutId, size_id: Size): Promise<SetRow[]> => {
  const apiUrl = `${API_BASE_URL}/v1/${board_name}/${layout_id}/${size_id}/sets`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
