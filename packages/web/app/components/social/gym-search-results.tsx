'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import GymCard from '@/app/components/gym-entity/gym-card';
import GymDetail from '@/app/components/gym-entity/gym-detail';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_GYMS,
  type SearchGymsQueryVariables,
  type SearchGymsQueryResponse,
} from '@/app/lib/graphql/operations';
import type { Gym } from '@boardsesh/shared-schema';

interface GymSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function GymSearchResults({ query, authToken }: GymSearchResultsProps) {
  const [results, setResults] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedGymUuid, setSelectedGymUuid] = useState<string | null>(null);
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
      const response = await client.request<SearchGymsQueryResponse, SearchGymsQueryVariables>(
        SEARCH_GYMS,
        { input: { query: searchQuery, limit: 20, offset } }
      );

      if (offset === 0) {
        setResults(response.searchGyms.gyms);
      } else {
        setResults((prev) => [...prev, ...response.searchGyms.gyms]);
      }
      setHasMore(response.searchGyms.hasMore);
      setTotalCount(response.searchGyms.totalCount);
    } catch (error) {
      console.error('Gym search failed:', error);
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
          No gyms found for &quot;{query}&quot;
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
