'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_BULK_VOTE_SUMMARIES,
  type GetBulkVoteSummariesQueryVariables,
  type GetBulkVoteSummariesQueryResponse,
} from '@/app/lib/graphql/operations';
import type { SocialEntityType, VoteSummary } from '@boardsesh/shared-schema';

interface VoteSummaryContextValue {
  getVoteSummary: (entityId: string) => VoteSummary | undefined;
}

const VoteSummaryContext = createContext<VoteSummaryContextValue | null>(null);

/**
 * Returns batch-fetched vote summary data when inside a VoteSummaryProvider,
 * or null when outside one. VoteButton uses this to avoid N+1 requests.
 */
export function useVoteSummaryContext(): VoteSummaryContextValue | null {
  return useContext(VoteSummaryContext);
}

interface VoteSummaryProviderProps {
  entityType: SocialEntityType;
  entityIds: string[];
  children: React.ReactNode;
}

/**
 * Batch-fetches vote summaries (including userVote) for a list of entities
 * in a single GET_BULK_VOTE_SUMMARIES request and provides them via context.
 * Wrap groups of VoteButtons with this provider to avoid N+1 individual requests.
 */
export function VoteSummaryProvider({ entityType, entityIds, children }: VoteSummaryProviderProps) {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useWsAuthToken();

  const sortedIds = useMemo(() => [...entityIds].sort(), [entityIds]);
  const queryKey = useMemo(
    () => ['bulkVoteSummaries', entityType, sortedIds.join(',')] as const,
    [entityType, sortedIds],
  );

  const { data: summariesMap } = useQuery({
    queryKey,
    queryFn: async (): Promise<Map<string, VoteSummary>> => {
      if (sortedIds.length === 0) return new Map();
      const client = createGraphQLHttpClient(token);
      const response = await client.request<
        GetBulkVoteSummariesQueryResponse,
        GetBulkVoteSummariesQueryVariables
      >(GET_BULK_VOTE_SUMMARIES, {
        input: { entityType, entityIds: sortedIds },
      });
      const map = new Map<string, VoteSummary>();
      for (const summary of response.bulkVoteSummaries) {
        map.set(summary.entityId, summary);
      }
      return map;
    },
    enabled: isAuthenticated && !isAuthLoading && sortedIds.length > 0 && !!token,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const value = useMemo<VoteSummaryContextValue>(() => ({
    getVoteSummary: (entityId: string) => summariesMap?.get(entityId),
  }), [summariesMap]);

  return (
    <VoteSummaryContext.Provider value={value}>
      {children}
    </VoteSummaryContext.Provider>
  );
}
