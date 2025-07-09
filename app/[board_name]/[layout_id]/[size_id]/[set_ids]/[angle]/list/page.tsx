import React from 'react';

import { notFound, redirect } from 'next/navigation';
import { BoardRouteParametersWithUuid, SearchRequestPagination } from '@/app/lib/types';
import { parseBoardRouteParams, parsedRouteSearchParamsToSearchParams, parseBoardRouteParamsWithSlugs, constructClimbListWithSlugs } from '@/app/lib/url-utils';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { fetchBoardDetails, fetchClimbs } from '@/app/components/rest-api/api';

export default async function DynamicResultsPage(
  props: {
    params: Promise<BoardRouteParametersWithUuid>;
    searchParams: Promise<SearchRequestPagination>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // Check if any parameters are in numeric format (old URLs)
  const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some(param => 
    param.includes(',') ? param.split(',').every(id => /^\d+$/.test(id.trim())) : /^\d+$/.test(param)
  );
  
  let parsedParams;
  
  if (hasNumericParams) {
    // For old URLs, use the simple parsing function first
    parsedParams = parseBoardRouteParams(params);
    
    // Redirect old URLs to new slug format
    const [boardDetails] = await Promise.all([
      fetchBoardDetails(parsedParams.board_name, parsedParams.layout_id, parsedParams.size_id, parsedParams.set_ids)
    ]);
    
    if (boardDetails.layout_name && boardDetails.size_name && boardDetails.set_names) {
      const newUrl = constructClimbListWithSlugs(
        boardDetails.board_name,
        boardDetails.layout_name,
        boardDetails.size_name,
        boardDetails.set_names,
        parsedParams.angle
      );
      
      // Preserve search parameters
      const searchString = new URLSearchParams(searchParams as any).toString();
      const finalUrl = searchString ? `${newUrl}?${searchString}` : newUrl;
      
      redirect(finalUrl);
    }
  } else {
    // For new URLs, use the slug parsing function
    parsedParams = await parseBoardRouteParamsWithSlugs(params);
  }

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
