'use client';

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import MuiAvatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { PersonOutlined } from '@mui/icons-material';
import { useInfiniteQuery } from '@tanstack/react-query';
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
import type { UnifiedSearchResult, UnifiedSearchConnection } from '@boardsesh/shared-schema';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { useInfiniteScroll } from '@/app/hooks/use-infinite-scroll';

interface UserSearchResultsProps {
  query: string;
  authToken: string | null;
}

export default function UserSearchResults({ query, authToken }: UserSearchResultsProps) {
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery<
    UnifiedSearchConnection,
    Error
  >({
    queryKey: ['searchUsersAndSetters', debouncedQuery, authToken],
    queryFn: async ({ pageParam }) => {
      const client = createGraphQLHttpClient(authToken);
      const response = await client.request<SearchUsersAndSettersQueryResponse, SearchUsersAndSettersQueryVariables>(
        SEARCH_USERS_AND_SETTERS,
        { input: { query: debouncedQuery, limit: 20, offset: pageParam as number } }
      );
      return response.searchUsersAndSetters;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPageParam as number) + lastPage.results.length;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const results: UnifiedSearchResult[] = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
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
          No users or setters found for &quot;{debouncedQuery}&quot;
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List>
        {results.map((result) => {
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
      <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2, minHeight: 20 }}>
        {isFetchingNextPage && <CircularProgress size={24} />}
      </Box>
    </>
  );
}
