'use client';

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import MuiButton from '@mui/material/Button';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@/app/components/ui/empty-state';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  BROWSE_PROPOSALS,
  type BrowseProposalsVariables,
  type BrowseProposalsResponse,
} from '@/app/lib/graphql/operations/proposals';
import type { Proposal, ProposalConnection } from '@boardsesh/shared-schema';
import ProposalCard from '@/app/components/social/proposal-card';
import FeedItemSkeleton from './feed-item-skeleton';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface ProposalFeedProps {
  isAuthenticated: boolean;
  boardUuid?: string | null;
}

export default function ProposalFeed({
  isAuthenticated,
  boardUuid,
}: ProposalFeedProps) {
  const { token, isLoading: authLoading } = useWsAuthToken();
  const PAGE_SIZE = 20;

  const queryKey = ['proposalFeed', boardUuid] as const;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteQuery<
    ProposalConnection,
    Error
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(isAuthenticated ? token : null);
      const variables: BrowseProposalsVariables = {
        input: {
          limit: PAGE_SIZE,
          offset: (pageParam as number) || 0,
          ...(boardUuid ? { boardUuid } : {}),
        },
      };

      const response = await client.request<BrowseProposalsResponse>(
        BROWSE_PROPOSALS,
        variables,
      );
      return response.browseProposals;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((total, page) => total + page.proposals.length, 0);
    },
    enabled: isAuthenticated ? !!token : true,
    staleTime: 60 * 1000,
  });

  const proposals: Proposal[] = useMemo(
    () => data?.pages.flatMap((p) => p.proposals) ?? [],
    [data],
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage ?? false,
    isFetching: isFetchingNextPage,
  });

  if ((authLoading || isLoading) && proposals.length === 0) {
    return (
      <Box data-testid="proposal-feed" sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </Box>
    );
  }

  return (
    <Box data-testid="proposal-feed" sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {error && (
        <EmptyState
          icon={<ErrorOutline fontSize="inherit" />}
          description="Failed to load proposals. Please try again."
        >
          <MuiButton variant="contained" onClick={() => refetch()}>
            Retry
          </MuiButton>
        </EmptyState>
      )}

      {!error && proposals.length === 0 ? (
        <EmptyState
          icon={<GavelOutlined fontSize="inherit" />}
          description="No proposals yet"
        />
      ) : (
        <>
          {proposals.map((proposal) => (
            <Box key={proposal.uuid} data-testid="proposal-feed-item">
              <ProposalCard proposal={proposal} />
            </Box>
          ))}
          <Box ref={sentinelRef} data-testid="proposal-feed-sentinel" sx={{ display: 'flex', flexDirection: 'column', gap: '12px', py: 2, minHeight: 20 }}>
            {isFetchingNextPage && (
              <>
                <FeedItemSkeleton />
                <FeedItemSkeleton />
              </>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
