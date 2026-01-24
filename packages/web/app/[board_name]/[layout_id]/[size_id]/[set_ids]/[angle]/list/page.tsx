import React from 'react';

import { notFound, permanentRedirect } from 'next/navigation';
import { BoardRouteParametersWithUuid, SearchRequestPagination, BoardDetails, BoardName, Climb } from '@/app/lib/types';
import { SetIdList } from '@/app/lib/board-data';
import {
  parseBoardRouteParams,
  parsedRouteSearchParamsToSearchParams,
  constructClimbListWithSlugs,
} from '@/app/lib/url-utils';
import { parseBoardRouteParamsWithSlugs } from '@/app/lib/url-utils.server';
import ClimbsList from '@/app/components/board-page/climbs-list';
import { cachedSearchClimbs } from '@/app/lib/graphql/server-cached-client';
import { SEARCH_CLIMBS, type ClimbSearchResponse } from '@/app/lib/graphql/operations/climb-search';
import { getBoardDetailsForBoard } from '@/app/lib/board-utils';
import { MOONBOARD_HOLD_STATE_CODES, MOONBOARD_HOLD_STATES } from '@/app/lib/moonboard-config';
import { MAX_PAGE_SIZE } from '@/app/components/board-page/constants';
import { dbz } from '@/app/lib/db/db';
import { UNIFIED_TABLES } from '@/app/lib/db/queries/util/table-select';
import { boardClimbStats } from '@boardsesh/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getGradeByDifficultyId } from '@/app/lib/board-data';
import type { LitUpHoldsMap, HoldState } from '@/app/components/board-renderer/types';


// Parse Moonboard frames string to lit up holds map
function parseMoonboardFrames(frames: string): LitUpHoldsMap {
  const map: LitUpHoldsMap = {};
  // Format: p{holdId}r{roleCode} e.g., "p1r42p45r43p198r44"
  // Role codes: 42=start, 43=hand, 44=finish (see MOONBOARD_HOLD_STATE_CODES)
  const regex = /p(\d+)r(\d+)/g;
  let match;
  while ((match = regex.exec(frames)) !== null) {
    const holdId = parseInt(match[1], 10);
    const roleCode = parseInt(match[2], 10);

    // Determine which hold state to use based on role code
    let holdStateKey: 'start' | 'hand' | 'finish';
    if (roleCode === MOONBOARD_HOLD_STATE_CODES.start) {
      holdStateKey = 'start';
    } else if (roleCode === MOONBOARD_HOLD_STATE_CODES.finish) {
      holdStateKey = 'finish';
    } else if (roleCode === MOONBOARD_HOLD_STATE_CODES.hand) {
      holdStateKey = 'hand';
    } else {
      // Unexpected role code - log a warning and default to 'hand'
      console.warn(
        `[MoonBoard] Unexpected role code ${roleCode} for hold ${holdId} in frames "${frames.slice(0, 50)}${frames.length > 50 ? '...' : ''}". Defaulting to HAND state.`
      );
      holdStateKey = 'hand';
    }
    const holdState = MOONBOARD_HOLD_STATES[holdStateKey];

    map[holdId] = {
      state: holdState.name,
      color: holdState.color,
      displayColor: holdState.displayColor,
    };
  }
  return map;
}

// Query Moonboard climbs directly from the database
async function getMoonboardClimbs(layoutId: number, angle: number, limit: number): Promise<Climb[]> {
  const { climbs } = UNIFIED_TABLES;

  const results = await dbz
    .select({
      uuid: climbs.uuid,
      name: climbs.name,
      description: climbs.description,
      frames: climbs.frames,
      angle: climbs.angle,
      setterUsername: climbs.setterUsername,
      createdAt: climbs.createdAt,
      // Join with climb stats for grade info
      displayDifficulty: boardClimbStats.displayDifficulty,
      benchmarkDifficulty: boardClimbStats.benchmarkDifficulty,
      qualityAverage: boardClimbStats.qualityAverage,
      ascensionistCount: boardClimbStats.ascensionistCount,
    })
    .from(climbs)
    .leftJoin(
      boardClimbStats,
      and(
        eq(boardClimbStats.boardType, 'moonboard'),
        eq(boardClimbStats.climbUuid, climbs.uuid),
        eq(boardClimbStats.angle, angle)
      )
    )
    .where(
      and(
        eq(climbs.boardType, 'moonboard'),
        eq(climbs.layoutId, layoutId),
        eq(climbs.angle, angle)
      )
    )
    .orderBy(desc(climbs.createdAt))
    .limit(limit);

  return results.map((row) => {
    // Look up grade info from the shared BOULDER_GRADES constant.
    // displayDifficulty is stored as double precision in the database but represents
    // an integer difficulty_id. getGradeByDifficultyId rounds it to handle any
    // floating point imprecision from database/ORM serialization.
    const gradeInfo = row.displayDifficulty ? getGradeByDifficultyId(row.displayDifficulty) : undefined;

    return {
      uuid: row.uuid,
      setter_username: row.setterUsername || 'Unknown',
      name: row.name || 'Unnamed Climb',
      description: row.description || '',
      frames: row.frames || '',
      angle: row.angle || angle,
      ascensionist_count: row.ascensionistCount || 0,
      // Format difficulty as "6a/V3" style for ClimbTitle to extract V-grade
      difficulty: gradeInfo ? gradeInfo.difficulty_name : '',
      // Set quality_average to "3" when we have a grade so ClimbTitle shows it
      // (hasGrade check requires quality_average && quality_average !== '0')
      quality_average: gradeInfo ? (row.qualityAverage ? String(row.qualityAverage) : '3') : '0',
      stars: 0,
      difficulty_error: '0',
      litUpHoldsMap: parseMoonboardFrames(row.frames || ''),
      benchmark_difficulty: row.benchmarkDifficulty ? String(row.benchmarkDifficulty) : null,
    };
  });
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
    boardDetails = getBoardDetailsForBoard(parsedParams);

    // Moonboard queries the database directly (no GraphQL support yet)
    if (parsedParams.board_name === 'moonboard') {
      const moonboardClimbs = await getMoonboardClimbs(
        parsedParams.layout_id,
        parsedParams.angle,
        searchParamsObject.pageSize || 50
      );
      searchResponse = {
        searchClimbs: {
          climbs: moonboardClimbs,
          totalCount: moonboardClimbs.length,
          hasMore: false,
        },
      };
    } else {
      searchResponse = await cachedSearchClimbs<ClimbSearchResponse>(
        SEARCH_CLIMBS,
        { input: searchInput },
        isDefaultSearch,
      );
    }
  } catch (error) {
    console.error('Error fetching results or climb:', error);
    notFound();
  }

  return <ClimbsList {...parsedParams} boardDetails={boardDetails} initialClimbs={searchResponse.searchClimbs.climbs} />;
}
