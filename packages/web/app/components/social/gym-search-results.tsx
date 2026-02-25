'use client';

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useInfiniteQuery } from '@tanstack/react-query';
import GymCard from '@/app/components/gym-entity/gym-card';
import GymDetail from '@/app/components/gym-entity/gym-detail';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_GYMS,
  type SearchGymsQueryVariables,
  type SearchGymsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { Gym, GymConnection } from '@boardsesh/shared-schema';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface GymSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function GymSearchResults({ query, authToken }: GymSearchResultsProps) {
  const [selectedGymUuid, setSelectedGymUuid] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<
    GymConnection,
    Error
  >({
    queryKey: ['searchGyms', debouncedQuery, authToken],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<SearchGymsQueryResponse, SearchGymsQueryVariables>(
        SEARCH_GYMS,
        { input: { query: debouncedQuery, limit: 20, offset: pageParam as number } }
      );
      return response.searchGyms;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + lastPage.gyms.length;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const results: Gym[] = useMemo(
    () => data?.pages.flatMap((p) => p.gyms) ?? [],
    [data],
  );

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: hasNextPage ?? false,
    isFetching: isFetchingNextPage,
  });

  if (query.length < 2) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Type at least 2 characters to search
        </Typography>
      </Box>
    );
  }

  if (isLoading && results.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isLoading && results.length === 0 && debouncedQuery.length >= 2) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No gyms found for &quot;{debouncedQuery}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5} sx={{ px: 2, py: 1 }}>
        {results.map((gym) => (
          <GymCard key={gym.uuid} gym={gym} onClick={(g) => setSelectedGymUuid(g.uuid)} />
        ))}
      </Stack>
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
        {isFetchingNextPage && <CircularProgress size={24} />}
      </Box>
      {selectedGymUuid && (
        <GymDetail
          gymUuid={selectedGymUuid}
          open={!!selectedGymUuid}
          onClose={() => setSelectedGymUuid(null)}
          anchor="top"
        />
      )}
    </>
  );
}
