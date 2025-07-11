// api.ts

import { SetIdList } from '@/app/lib/board-data';
import { LayoutRow, SetRow, SizeRow } from '@/app/lib/data/queries';
import {
  FetchCurrentProblemResponse,
  BoardDetails,
  ParsedBoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  SearchRequestPagination,
  BoardName,
  LayoutId,
  Size,
  SearchClimbsResult,
} from '@/app/lib/types';
import { BetaLink } from '@/app/lib/api-wrappers/sync-api-types';

const API_BASE_URL = `/api/v1`;

export const fetchClimbs = async (
  queryParameters: SearchRequestPagination,
  routeParameters: ParsedBoardRouteParameters,
): Promise<SearchClimbsResult> => {
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
    `${API_BASE_URL}/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/${routeParameters.angle}/search?${urlParams}`,
    {
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const rawResults = await response.json();

  return rawResults;
};

export const fetchCurrentClimb = async (
  routeParameters: ParsedBoardRouteParametersWithUuid,
): Promise<FetchCurrentProblemResponse> =>
  (
    await fetch(
      `${API_BASE_URL}/${routeParameters.board_name}/${routeParameters.layout_id}/${routeParameters.size_id}/${routeParameters.set_ids}/${routeParameters.angle}/${routeParameters.climb_uuid}?bustCache=1`,
    )
  ).json();

// Fetch beta links
export const fetchBetaLinks = async (board: string, uuid: string): Promise<BetaLink[]> => {
  const response = await fetch(`${API_BASE_URL}/${board}/beta/${uuid}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch beta links: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Fetch board details
export const fetchBoardDetails = async (
  board: string,
  layout: number,
  size: number,
  set_ids: SetIdList,
): Promise<BoardDetails> => {
  const apiUrl = `${API_BASE_URL}/${board}/${layout}/${size}/${set_ids.join(',')}/details?bustCache=101`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchLayouts = async (board_name: BoardName): Promise<LayoutRow[]> => {
  //TODO: Fix type definition
  const apiUrl = `${API_BASE_URL}/${board_name}/layouts`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchSizes = async (board_name: BoardName, layout_id: LayoutId): Promise<SizeRow[]> => {
  //TODO: Fix type definition
  const apiUrl = `${API_BASE_URL}/${board_name}/${layout_id}/sizes`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Fetch board details
export const fetchSets = async (board_name: BoardName, layout_id: LayoutId, size_id: Size): Promise<SetRow[]> => {
  const apiUrl = `${API_BASE_URL}/${board_name}/${layout_id}/${size_id}/sets`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
