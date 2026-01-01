import React from 'react';

import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import {
  BoardRouteParametersWithUuid,
  SearchRequestPagination,
  BoardDetails,
  BoardRouteParameters,
  ParsedBoardRouteParameters,
} from '@/app/lib/types';
import {
  parseBoardRouteParams,
  parsedRouteSearchParamsToSearchParams,
  constructClimbListWithSlugs,
} from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { cachedSearchClimbs } from '@/app/lib/graphql/server-cached-client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import { getBoardDetails } from '@/app/lib/__generated__/product-sizes-data';
import { MAX_PAGE_SIZE } from '@/app/components/board-page/constants';

/**
 * Generates a user-friendly board description for metadata
 */
function generateBoardDescription(boardDetails: BoardDetails, angle: number): string {
  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  const layoutName = boardDetails.layout_name || '';
  const sizeName = boardDetails.size_name || boardDetails.size_description || '';

  return `Browse climbs on ${boardName} ${layoutName} ${sizeName} at ${angle}°. Find routes by grade, setter, and more.`.trim();
}

/**
 * Generates a user-friendly page title from board details
 */
function generateBoardTitle(boardDetails: BoardDetails): string {
  const parts: string[] = [];

  const boardName = boardDetails.board_name.charAt(0).toUpperCase() + boardDetails.board_name.slice(1);
  parts.push(boardName);

  if (boardDetails.layout_name) {
    const layoutName = boardDetails.layout_name
      .replace(new RegExp(`^${boardDetails.board_name}\\s*(board)?\\s*`, 'i'), '')
      .trim();
    if (layoutName) {
      parts.push(layoutName);
    }
  }

  if (boardDetails.size_name) {
    const sizeMatch = boardDetails.size_name.match(/(\d+)\s*x\s*(\d+)/i);
    if (sizeMatch) {
      parts.push(`${sizeMatch[1]}x${sizeMatch[2]}`);
    } else {
      parts.push(boardDetails.size_name);
    }
  } else if (boardDetails.size_description) {
    parts.push(boardDetails.size_description);
  }

  return parts.join(' ');
}

export async function generateMetadata(props: {
  params: Promise<BoardRouteParameters>;
}): Promise<Metadata> {
  const params = await props.params;

  try {
    const hasNumericParams = [params.layout_id, params.size_id, params.set_ids].some((param) =>
      param.includes(',') ? param.split(',').every((id) => /^\d+$/.test(id.trim())) : /^\d+$/.test(param),
    );

    let parsedParams: ParsedBoardRouteParameters;

    if (hasNumericParams) {
      parsedParams = parseBoardRouteParams(params);
    } else {
      parsedParams = await parseBoardRouteParamsWithSlugs(params);
    }

    const boardDetails = await getBoardDetails(parsedParams);
    const boardTitle = generateBoardTitle(boardDetails);
    const title = `${boardTitle} Climbs | Boardsesh`;
    const description = generateBoardDescription(boardDetails, parsedParams.angle);

    const listUrl = constructClimbListWithSlugs(
      boardDetails.board_name,
      boardDetails.layout_name || '',
      boardDetails.size_name || '',
      boardDetails.size_description,
      boardDetails.set_names || [],
      parsedParams.angle,
    );

    return {
      title,
      description,
      openGraph: {
        title: `${boardTitle} Climbs`,
        description,
        type: 'website',
        url: `https://boardsesh.com${listUrl}`,
      },
      twitter: {
        card: 'summary',
        title: `${boardTitle} Climbs`,
        description,
      },
    };
  } catch {
    return {
      title: 'Browse Climbs | Boardsesh',
      description: 'Browse and search climbing routes on your LED training board',
    };
  }
}

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
    const boardDetails = await getBoardDetails(parsedParams);

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
    (searchParamsObject.sortOrder || 'desc') === 'desc';

  let searchResponse: ClimbSearchResponse;
  let boardDetails: BoardDetails;

  try {
    [searchResponse, boardDetails] = await Promise.all([
      cachedSearchClimbs<ClimbSearchResponse>(SEARCH_CLIMBS, { input: searchInput }, isDefaultSearch),
      getBoardDetails(parsedParams),
    ]);
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound();
  }

  return <ClimbsList {...parsedParams} boardDetails={boardDetails} initialClimbs={searchResponse.searchClimbs.climbs} />;
}
