'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import BoardCard from '@/app/components/board-entity/board-card';
import BoardDetail from '@/app/components/board-entity/board-detail';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_BOARDS,
  type SearchBoardsQueryVariables,
  type SearchBoardsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { UserBoard } from '@boardsesh/shared-schema';

interface BoardSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function BoardSearchResults({ query, authToken }: BoardSearchResultsProps) {
  const [results, setResults] = useState<UserBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBoardUuid, setSelectedBoardUuid] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
      const response = await client.request<SearchBoardsQueryResponse, SearchBoardsQueryVariables>(
        SEARCH_BOARDS,
        { input: { query: searchQuery, limit: 20, offset } }
      );

      if (offset === 0) {
        setResults(response.searchBoards.boards);
      } else {
        setResults((prev) => [...prev, ...response.searchBoards.boards]);
      }
      setHasMore(response.searchBoards.hasMore);
      setTotalCount(response.searchBoards.totalCount);
    } catch (error) {
      console.error('Board search failed:', error);
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
          No boards found for &quot;{query}&quot;
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
