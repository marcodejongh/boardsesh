'use client';

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useInfiniteQuery } from '@tanstack/react-query';
import BoardCard from '@/app/components/board-entity/board-card';
import BoardDetail from '@/app/components/board-entity/board-detail';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_BOARDS,
  type SearchBoardsQueryVariables,
  type SearchBoardsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { UserBoard, UserBoardConnection } from '@boardsesh/shared-schema';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface BoardSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function BoardSearchResults({ query, authToken }: BoardSearchResultsProps) {
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<
    UserBoardConnection,
    Error
  >({
    queryKey: ['searchBoards', debouncedQuery, authToken],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<SearchBoardsQueryResponse, SearchBoardsQueryVariables>(
        SEARCH_BOARDS,
        { input: { query: debouncedQuery, limit: 20, offset: pageParam as number } }
      );
      return response.searchBoards;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + lastPage.boards.length;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const results: UserBoard[] = useMemo(
    () => data?.pages.flatMap((p) => p.boards) ?? [],
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
          No boards found for &quot;{debouncedQuery}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5} sx={{ px: 2, py: 1 }}>
        {results.map((board) => (
          <BoardCard key={board.uuid} board={board} onClick={(b) => setSelectedBoardUuid(b.uuid)} />
        ))}
      </Stack>
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
        {isFetchingNextPage && <CircularProgress size={24} />}
      </Box>
      {selectedBoardUuid && (
        <BoardDetail
          boardUuid={selectedBoardUuid}
          open={!!selectedBoardUuid}
          onClose={() => setSelectedBoardUuid(null)}
          anchor="top"
        />
      )}
    </>
  );
}
