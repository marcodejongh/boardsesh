import React from 'react';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import HomePageContent from './home-page-content';
import { cachedTrendingFeed } from './lib/graphql/server-cached-client';
import type { SortMode } from '@boardsesh/shared-schema';

type HomeProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const boardConfigs = await getAllBoardConfigs();

  // Check if user explicitly wants to see the board selector
  if (params.select === 'true') {
    return <ConsolidatedBoardConfig boardConfigs={boardConfigs} />;
  }

  // Parse URL state
  const tab = (params.tab === 'newClimbs' ? 'newClimbs' : 'activity') as 'activity' | 'newClimbs';
  const boardUuid = typeof params.board === 'string' ? params.board : undefined;
  const sortBy = (['new', 'top', 'controversial', 'hot'].includes(params.sort as string)
    ? params.sort : 'new') as SortMode;

  // SSR: fetch initial trending feed (no auth needed)
  let initialTrendingFeed = null;
  if (tab === 'activity') {
    try {
      initialTrendingFeed = await cachedTrendingFeed(sortBy, boardUuid);
    } catch {
      // Trending feed fetch failed, client will retry
    }
  }

  return (
    <HomePageContent
      boardConfigs={boardConfigs}
      initialTab={tab}
      initialBoardUuid={boardUuid}
      initialSortBy={sortBy}
      initialTrendingFeed={initialTrendingFeed}
    />
  );
}
