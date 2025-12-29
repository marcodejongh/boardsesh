// api.ts

import {
  FetchCurrentProblemResponse,
  ParsedBoardRouteParameters,
  ParsedBoardRouteParametersWithUuid,
  SearchRequestPagination,
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

