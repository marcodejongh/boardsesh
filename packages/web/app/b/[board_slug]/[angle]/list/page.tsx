import React from 'react';
import { notFound } from 'next/navigation';
import { SearchRequestPagination, BoardDetails } from '@/app/lib/types';
import { parsedRouteSearchParamsToSearchParams } from '@/app/lib/url-utils';
import { resolveBoardBySlug, boardToRouteParams } from '@/app/lib/board-slug-utils';
import QueueClimbsList from '@/app/components/board-page/queue-climbs-list';
import { cachedSearchClimbs } from '@/app/lib/graphql/server-cached-client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { MAX_PAGE_SIZE } from '@/app/components/board-page/constants';

interface BoardSlugListPageProps {
  params: Promise<{ board_slug: string; angle: string }>;
  searchParams: Promise<SearchRequestPagination>;
}

export default async function BoardSlugListPage(props: BoardSlugListPageProps) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);

  const board = await resolveBoardBySlug(params.board_slug);
  if (!board) {
    return notFound();
  }

  const parsedParams = boardToRouteParams(board, Number(params.angle));
  const searchParamsObject: SearchRequestPagination = parsedRouteSearchParamsToSearchParams(searchParams);

  const requestedPageSize = (Number(searchParamsObject.page) + 1) * Number(searchParamsObject.pageSize);
  searchParamsObject.pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  searchParamsObject.page = 0;

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
    holdsFilter: searchParamsObject.holdsFilter && Object.keys(searchParamsObject.holdsFilter).length > 0
      ? Object.fromEntries(
          Object.entries(searchParamsObject.holdsFilter).map(([key, value]) => [
            key.replace('hold_', ''),
            value.state
          ])
        )
      : undefined,
  };

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
  } catch {
    return notFound();
  }

  try {
    searchResponse = await cachedSearchClimbs<ClimbSearchResponse>(
      SEARCH_CLIMBS,
      { input: searchInput },
      isDefaultSearch,
    );
  } catch (error) {
    console.error('Error fetching climb search results:', error);
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
