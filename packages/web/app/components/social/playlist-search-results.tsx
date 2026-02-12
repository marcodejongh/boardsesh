'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import QueueMusicOutlined from '@mui/icons-material/QueueMusicOutlined';
import { useRouter } from 'next/navigation';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_PLAYLISTS,
  type SearchPlaylistsQueryVariables,
  type SearchPlaylistsQueryResponse,
  type DiscoverablePlaylist,
} from '@/app/lib/graphql/operations';

interface PlaylistSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function PlaylistSearchResults({ query, authToken }: PlaylistSearchResultsProps) {
  const [results, setResults] = useState<DiscoverablePlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const fetchResults = useCallback(async (searchQuery: string, offset = 0) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<SearchPlaylistsQueryResponse, SearchPlaylistsQueryVariables>(
        SEARCH_PLAYLISTS,
        { input: { query: searchQuery, limit: 20, offset } }
      );

      if (offset === 0) {
        setResults(response.searchPlaylists.playlists);
      } else {
        setResults((prev) => [...prev, ...response.searchPlaylists.playlists]);
      }
      setHasMore(response.searchPlaylists.hasMore);
      setTotalCount(response.searchPlaylists.totalCount);
    } catch (error) {
      console.error('Playlist search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setTotalCount(0);
      setHasMore(false);
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchResults(query, results.length);
    }
  };

  if (query.length < 2) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Type at least 2 characters to search
        </Typography>
      </Box>
    );
  }

  if (loading && results.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!loading && results.length === 0 && query.length >= 2) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No playlists found for &quot;{query}&quot;
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
      {hasMore && (
        <Box sx={{ p: 2 }}>
          <MuiButton
            onClick={handleLoadMore}
            disabled={loading}
            variant="outlined"
            fullWidth
          >
            {loading ? 'Loading...' : `Load more (${results.length} of ${totalCount})`}
          </MuiButton>
        </Box>
      )}
    </>
  );
}
