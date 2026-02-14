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
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { PersonOutlined } from '@mui/icons-material';
import FollowButton from '@/app/components/ui/follow-button';
import {
  FOLLOW_USER,
  UNFOLLOW_USER,
  FOLLOW_SETTER,
  UNFOLLOW_SETTER,
} from '@/app/lib/graphql/operations';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  SEARCH_USERS_AND_SETTERS,
  type SearchUsersAndSettersQueryVariables,
  type SearchUsersAndSettersQueryResponse,
} from '@/app/lib/graphql/operations';
import type { UnifiedSearchResult } from '@boardsesh/shared-schema';

interface UserSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function UserSearchResults({ query, authToken }: UserSearchResultsProps) {
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
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
      const response = await client.request<SearchUsersAndSettersQueryResponse, SearchUsersAndSettersQueryVariables>(
        SEARCH_USERS_AND_SETTERS,
        { input: { query: searchQuery, limit: 20, offset } }
      );

      if (offset === 0) {
        setResults(response.searchUsersAndSetters.results);
      } else {
        setResults((prev) => [...prev, ...response.searchUsersAndSetters.results]);
      }
      setHasMore(response.searchUsersAndSetters.hasMore);
      setTotalCount(response.searchUsersAndSetters.totalCount);
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
          No users or setters found for &quot;{query}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {results.map((result) => {
          // User result (may also have setter info if linked)
          if (result.user) {
            return (
              <ListItem
                key={`user-${result.user.id}`}
                component="a"
                href={`/crusher/${result.user.id}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                secondaryAction={
                  <FollowButton
                    entityId={result.user.id}
                    initialIsFollowing={result.user.isFollowedByMe}
                    followMutation={FOLLOW_USER}
                    unfollowMutation={UNFOLLOW_USER}
                    entityLabel="user"
                    getFollowVariables={(id) => ({ input: { userId: id } })}
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
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {result.recentAscentCount > 0 && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {result.recentAscentCount} ascents this month
                        </Typography>
                      )}
                      {result.setter && (
                        <Typography variant="caption" component="span" color="text.secondary">
                          {result.setter.climbCount} climb{result.setter.climbCount !== 1 ? 's' : ''} set
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            );
          }

          // Setter-only result (no linked Boardsesh user)
          if (result.setter) {
            return (
              <ListItem
                key={`setter-${result.setter.username}`}
                component="a"
                href={`/setter/${encodeURIComponent(result.setter.username)}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
                secondaryAction={
                  <FollowButton
                    entityId={result.setter.username}
                    initialIsFollowing={result.setter.isFollowedByMe}
                    followMutation={FOLLOW_SETTER}
                    unfollowMutation={UNFOLLOW_SETTER}
                    entityLabel="setter"
                    getFollowVariables={(id) => ({ input: { setterUsername: id } })}
                  />
                }
              >
                <ListItemAvatar>
                  <MuiAvatar sx={{ width: 40, height: 40 }}>
                    <PersonOutlined />
                  </MuiAvatar>
                </ListItemAvatar>
                <ListItemText
                  primary={result.setter.username}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="caption" component="span" color="text.secondary">
                        {result.setter.climbCount} climb{result.setter.climbCount !== 1 ? 's' : ''}
                      </Typography>
                      {result.setter.boardTypes.map((bt) => (
                        <Chip
                          key={bt}
                          label={bt.charAt(0).toUpperCase() + bt.slice(1)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  }
                />
              </ListItem>
            );
          }

          return null;
        })}
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
