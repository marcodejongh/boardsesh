import React from 'react';

import { notFound } from 'next/navigation';
import { BoardRouteParametersWithUuid, SearchRequestPagination } from '@/app/lib/types';
import { parseBoardRouteParams, parsedRouteSearchParamsToSearchParams, urlParamsToSearchParams } from '@/app/lib/url-utils';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { fetchBoardDetails, fetchResults } from '@/app/components/rest-api/api';

export default async function DynamicResultsPage({
  params,
  searchParams,
}: {
  params: BoardRouteParametersWithUuid;
  searchParams: SearchRequestPagination
}) {
  const parsedParams = parseBoardRouteParams(params);

  try {
    const searchParamsObject: SearchRequestPagination = parsedRouteSearchParamsToSearchParams(searchParams)

    const [fetchedResults, boardDetails] = await Promise.all([
      fetchResults(searchParamsObject, parsedParams),
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids),
    ]);

    if (!fetchedResults || fetchedResults.boulderproblems.length === 0) {
      notFound();
    }

    return (
      <>
        <ClimbsList {...parsedParams} boardDetails={boardDetails} initialClimbs={fetchedResults.boulderproblems} />
      </>
    );
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound(); // or show a 500 error page
  }
}
