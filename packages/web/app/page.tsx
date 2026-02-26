import React from 'react';
import { cookies } from 'next/headers';
import ConsolidatedBoardConfig from './components/setup-wizard/consolidated-board-config';
import { getAllBoardConfigs } from './lib/server-board-configs';
import HomePageContent from './home-page-content';
import { cachedTrendingFeed, serverActivityFeed, serverMyBoards } from './lib/graphql/server-cached-client';
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

  // Read auth cookie to determine if user is authenticated at SSR time
  const cookieStore = await cookies();
  const authToken = cookieStore.get('next-auth.session-token')?.value
    ?? cookieStore.get('__Secure-next-auth.session-token')?.value;
  const isAuthenticatedSSR = !!authToken;

  // SSR: fetch boards + feed in parallel for authenticated users
  let initialFeedResult: { items: import('@boardsesh/shared-schema').ActivityFeedItem[]; cursor: string | null; hasMore: boolean } | null = null;
  let initialFeedSource: 'personalized' | 'trending' = 'trending';
  let initialMyBoards: import('@boardsesh/shared-schema').UserBoard[] | null = null;

  if (authToken) {
    const feedPromise = tab === 'activity'
      ? serverActivityFeed(authToken, sortBy, boardUuid).catch(() => null)
      : Promise.resolve(null);
    const boardsPromise = serverMyBoards(authToken);

    const [feedResult, boardsResult] = await Promise.all([feedPromise, boardsPromise]);

    if (feedResult) {
      initialFeedResult = feedResult.result;
      initialFeedSource = feedResult.source;
    }
    initialMyBoards = boardsResult;
  } else if (tab === 'activity') {
    try {
      initialFeedResult = await cachedTrendingFeed(sortBy, boardUuid);
      initialFeedSource = 'trending';
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
      initialTrendingFeed={initialFeedResult}
      isAuthenticatedSSR={isAuthenticatedSSR}
      initialFeedSource={initialFeedSource}
      initialMyBoards={initialMyBoards}
    />
  );
}
