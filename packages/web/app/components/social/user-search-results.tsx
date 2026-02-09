'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import MuiAvatar from '@mui/material/Avatar';
import MuiButton from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { PersonOutlined } from '@mui/icons-material';
import FollowButton from './follow-button';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_USERS,
  type SearchUsersQueryVariables,
  type SearchUsersQueryResponse,
} from '@/app/lib/graphql/operations';
import type { UserSearchResult } from '@boardsesh/shared-schema';

interface UserSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function UserSearchResults({ query, authToken }: UserSearchResultsProps) {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
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
      const response = await client.request<SearchUsersQueryResponse, SearchUsersQueryVariables>(
        SEARCH_USERS,
        { input: { query: searchQuery, limit: 20, offset } }
      );

      if (offset === 0) {
        setResults(response.searchUsers.results);
      } else {
        setResults((prev) => [...prev, ...response.searchUsers.results]);
      }
      setHasMore(response.searchUsers.hasMore);
      setTotalCount(response.searchUsers.totalCount);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  // Debounced search on query change
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
          No users found for &quot;{query}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {results.map((result) => (
          <ListItem
            key={result.user.id}
            component="a"
            href={`/crusher/${result.user.id}`}
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
            secondaryAction={
              <FollowButton
                userId={result.user.id}
                initialIsFollowing={result.user.isFollowedByMe}
              />
            }
          >
            <ListItemAvatar>
              <MuiAvatar src={result.user.avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                {!result.user.avatarUrl && <PersonOutlined />}
              </MuiAvatar>
            </ListItemAvatar>
            <ListItemText
              primary={result.user.displayName || 'User'}
              secondary={
                result.recentAscentCount > 0
                  ? `${result.recentAscentCount} ascents this month`
                  : undefined
              }
            />
          </ListItem>
        ))}
      </List>
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
