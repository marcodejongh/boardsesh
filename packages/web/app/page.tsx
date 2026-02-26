import React from 'react';
import { getServerAuthToken } from './lib/auth/server-auth';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import HomePageContent from './home-page-content';
import { cachedSessionGroupedFeed, serverMyBoards } from './lib/graphql/server-cached-client';
import type { SortMode, SessionFeedResult } from '@boardsesh/shared-schema';

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

  // Read auth cookie to determine if user is authenticated at SSR time
  const authToken = await getServerAuthToken();
  const isAuthenticatedSSR = !!authToken;

  // SSR: fetch boards + feed in parallel
  let initialFeedResult: SessionFeedResult | null = null;
  let initialMyBoards: import('@boardsesh/shared-schema').UserBoard[] | null = null;

  if (authToken) {
    const feedPromise = tab === 'activity'
      ? cachedSessionGroupedFeed(sortBy, boardUuid).catch(() => null)
      : Promise.resolve(null);
    const boardsPromise = serverMyBoards(authToken);

    const [feedResult, boardsResult] = await Promise.all([feedPromise, boardsPromise]);
    initialFeedResult = feedResult;
    initialMyBoards = boardsResult;
  } else if (tab === 'activity') {
    try {
      initialFeedResult = await cachedSessionGroupedFeed(sortBy, boardUuid);
    } catch {
      // Feed fetch failed, client will retry
    }
  }

  return (
    <HomePageContent
      boardConfigs={boardConfigs}
      initialTab={tab}
      initialBoardUuid={boardUuid}
      initialSortBy={sortBy}
      initialFeedResult={initialFeedResult}
      isAuthenticatedSSR={isAuthenticatedSSR}
      initialMyBoards={initialMyBoards}
    />
  );
}
