'use client';

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import QueueMusicOutlined from '@mui/icons-material/QueueMusicOutlined';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_PLAYLISTS,
  type SearchPlaylistsQueryVariables,
  type SearchPlaylistsQueryResponse,
  type DiscoverablePlaylist,
} from '@/app/lib/graphql/operations';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface PlaylistSearchResultsProps {
  query: string;
  authToken: string | null;
}

type PlaylistPage = {
  playlists: DiscoverablePlaylist[];
  totalCount: number;
  hasMore: boolean;
};

export default function PlaylistSearchResults({ query, authToken }: PlaylistSearchResultsProps) {
  const router = useRouter();
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<
    PlaylistPage,
    Error
  >({
    queryKey: ['searchPlaylists', debouncedQuery, authToken],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<SearchPlaylistsQueryResponse, SearchPlaylistsQueryVariables>(
        SEARCH_PLAYLISTS,
        { input: { query: debouncedQuery, limit: 20, offset: pageParam as number } }
      );
      return response.searchPlaylists;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + lastPage.playlists.length;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const results: DiscoverablePlaylist[] = useMemo(
    () => data?.pages.flatMap((p) => p.playlists) ?? [],
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
          No playlists found for &quot;{debouncedQuery}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5} sx={{ px: 2, py: 1 }}>
        {results.map((playlist) => (
          <Box
            key={playlist.uuid}
            onClick={() => router.push(`/my-library/playlist/${playlist.uuid}`)}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: playlist.color || 'var(--neutral-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <QueueMusicOutlined sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
                {playlist.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {playlist.creatorName} · {playlist.climbCount} climb{playlist.climbCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Chip
              label={playlist.boardType}
              size="small"
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          </Box>
        ))}
      </Stack>
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
        {isFetchingNextPage && <CircularProgress size={24} />}
      </Box>
    </>
  );
}
