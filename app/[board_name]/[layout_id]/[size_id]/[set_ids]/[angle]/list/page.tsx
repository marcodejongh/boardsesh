import React from 'react';

import { notFound } from 'next/navigation';
import { BoardRouteParametersWithUuid, SearchRequestPagination } from '@/app/lib/types';
import {
  parseBoardRouteParams,
  parsedRouteSearchParamsToSearchParams,
  urlParamsToSearchParams,
} from '@/app/lib/url-utils';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { fetchBoardDetails, fetchClimbs } from '@/app/components/rest-api/api';

export default async function DynamicResultsPage({
  params,
  searchParams,
}: {
  params: BoardRouteParametersWithUuid;
  searchParams: SearchRequestPagination;
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    const searchParamsObject: SearchRequestPagination = parsedRouteSearchParamsToSearchParams(searchParams);

    // For the SSR version we increase the pageSize so it also gets whatever page number
    // is in the search params. Without this, it would load the SSR version of the page on page 2
    // which would then flicker once SWR runs on the client.
    searchParamsObject.pageSize = (searchParamsObject.page + 1) * searchParamsObject.pageSize;
    searchParamsObject.page = 0;

    const [fetchedResults, boardDetails] = await Promise.all([
      fetchClimbs(searchParamsObject, parsedParams),
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    ]);

    if (!fetchedResults || fetchedResults.climbs.length === 0) {
      notFound();
    }

    return (
      <>
        <ClimbsList {...parsedParams} boardDetails={boardDetails} initialClimbs={fetchedResults.climbs} />
      </>
    );
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound(); // or show a 500 error page
  }
}
