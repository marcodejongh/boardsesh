import React from 'react';

import { notFound, permanentRedirect } from 'next/navigation';
import { BoardRouteParametersWithUuid, SearchRequestPagination, BoardDetails } from '@/app/lib/types';
import {
  parseBoardRouteParams,
  parsedRouteSearchParamsToSearchParams,
  constructClimbListWithSlugs,
} from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import QueueClimbsList from '@/app/components/board-page/queue-climbs-list';
import { cachedSearchClimbs } from '@/app/lib/graphql/server-cached-client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { MAX_PAGE_SIZE } from '@/app/components/board-page/constants';

export default async function DynamicResultsPage(props: {
  params: Promise<BoardRouteParametersWithUuid>;
  searchParams: Promise<SearchRequestPagination>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
    param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
  );

  let parsedParams;

  if (hasNumericParams) {
    // For old URLs, use the simple parsing function first
    parsedParams = parseBoardRouteParams(params);

    // Redirect old URLs to new slug format
    const boardDetails = getBoardDetailsForBoard(parsedParams);

    if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
      const newUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.size_description,
        boardDetails.set_names,
        parsedParams.angle,
      );

      // Preserve search parameters
      const searchString = new URLSearchParams(
        Object.entries(searchParams).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = String(value);
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      ).toString();
      const finalUrl = searchString ? `${newUrl}?${searchString}` : newUrl;

      permanentRedirect(finalUrl);
    }
  } else {
    // For new URLs, use the slug parsing function
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

  const searchParamsObject: SearchRequestPagination = parsedRouteSearchParamsToSearchParams(searchParams);

  // For the SSR version we increase the pageSize so it also gets whatever page number
  // is in the search params. Without this, it would load the SSR version of the page on page 2
  // which would then flicker once SWR runs on the client.
  const requestedPageSize = (Number(searchParamsObject.page) + 1) * Number(searchParamsObject.pageSize);

  // Enforce max page size to prevent excessive database queries
  searchParamsObject.pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  searchParamsObject.page = 0;

  // Build the search input for caching
  // Note: We only cache non-personalized queries (no auth-dependent filters)
  // User-specific filters (hideAttempted, hideCompleted, etc.) are applied client-side
  const searchInput = {
    boardName: parsedParams.board_name,
    layoutId: parsedParams.layout_id,
    sizeId: parsedParams.size_id,
    setIds: parsedParams.set_ids.join(','),
    angle: parsedParams.angle,
    page: searchParamsObject.page,
    pageSize: searchParamsObject.pageSize,
    gradeAccuracy: searchParamsObject.gradeAccuracy ? String(searchParamsObject.gradeAccuracy) : undefined,
    minGrade: searchParamsObject.minGrade || undefined,
    maxGrade: searchParamsObject.maxGrade || undefined,
    minAscents: searchParamsObject.minAscents || undefined,
    sortBy: searchParamsObject.sortBy || 'ascents',
    sortOrder: searchParamsObject.sortOrder || 'desc',
    name: searchParamsObject.name || undefined,
    setter: searchParamsObject.settername && searchParamsObject.settername.length > 0 ? searchParamsObject.settername : undefined,
    onlyTallClimbs: searchParamsObject.onlyTallClimbs || undefined,
    // Convert holdsFilter from LitUpHoldsMap to Record<string, HoldState> format expected by GraphQL
    holdsFilter: searchParamsObject.holdsFilter && Object.keys(searchParamsObject.holdsFilter).length > 0
      ? Object.fromEntries(
          Object.entries(searchParamsObject.holdsFilter).map(([key, value]) => [
            key.replace('hold_', ''),
            value.state
          ])
        )
      : undefined,
  };

  // Check if this is a default search (no custom filters applied)
  // Default searches can be cached much longer (30 days vs 1 hour)
  const isDefaultSearch =
    !searchParamsObject.gradeAccuracy &&
    !searchParamsObject.minGrade &&
    !searchParamsObject.maxGrade &&
    !searchParamsObject.minAscents &&
    !searchParamsObject.name &&
    (!searchParamsObject.settername || searchParamsObject.settername.length === 0) &&
    (searchParamsObject.sortBy || 'ascents') === 'ascents' &&
    (searchParamsObject.sortOrder || 'desc') === 'desc' &&
    !searchParamsObject.onlyTallClimbs &&
    (!searchParamsObject.holdsFilter || Object.keys(searchParamsObject.holdsFilter).length === 0);

  let searchResponse: ClimbSearchResponse;
  let boardDetails: BoardDetails;

  try {
    boardDetails = getBoardDetailsForBoard(parsedParams);
  } catch (error) {
    console.error('Error resolving board details:', error);
    return notFound();
  }

  try {
    searchResponse = await cachedSearchClimbs<ClimbSearchResponse>(
      SEARCH_CLIMBS,
      { input: searchInput },
      isDefaultSearch,
    );
  } catch (error) {
    // Log the error for server-side visibility. We intentionally degrade to empty results
    // rather than returning a 404, since the client-side React Query in QueueContext will
    // independently retry the search and surface errors through its own error handling.
    console.error(
      'Error fetching climb search results (degrading to empty results for SSR):',
      { boardName: parsedParams.board_name, searchInput },
      error,
    );
    searchResponse = {
      searchClimbs: {
        climbs: [],
        totalCount: 0,
        hasMore: false,
      },
    };
  }

  return <QueueClimbsList {...parsedParams} boardDetails={boardDetails} initialClimbs={searchResponse.searchClimbs.climbs} />;
}
