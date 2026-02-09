'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MuiButton from '@mui/material/Button';
import MuiAvatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import { PersonOutlined } from '@mui/icons-material';
import SwipeableDrawer from '@/app/components/swipeable-drawer/swipeable-drawer';
import FollowButton from './follow-button';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  GET_FOLLOWERS,
  GET_FOLLOWING,
  type GetFollowersQueryVariables,
  type GetFollowersQueryResponse,
  type GetFollowingQueryVariables,
  type GetFollowingQueryResponse,
} from '@/app/lib/graphql/operations';
import type { PublicUserProfile } from '@boardsesh/shared-schema';

interface FollowerCountProps {
  userId: string;
  followerCount: number;
  followingCount: number;
}

type DrawerMode = 'followers' | 'following' | null;

export default function FollowerCount({ userId, followerCount, followingCount }: FollowerCountProps) {
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [users, setUsers] = useState<PublicUserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { token } = useWsAuthToken();

  const fetchUsers = useCallback(async (mode: 'followers' | 'following', offset = 0) => {
    setLoading(true);
    try {
      const client = createGraphQLHttpClient(token);

      if (mode === 'followers') {
        const response = await client.request<GetFollowersQueryResponse, GetFollowersQueryVariables>(
          GET_FOLLOWERS,
          { input: { userId, limit: 20, offset } }
        );
        if (offset === 0) {
          setUsers(response.followers.users);
        } else {
          setUsers((prev) => [...prev, ...response.followers.users]);
        }
        setHasMore(response.followers.hasMore);
        setTotalCount(response.followers.totalCount);
      } else {
        const response = await client.request<GetFollowingQueryResponse, GetFollowingQueryVariables>(
          GET_FOLLOWING,
          { input: { userId, limit: 20, offset } }
        );
        if (offset === 0) {
          setUsers(response.following.users);
        } else {
          setUsers((prev) => [...prev, ...response.following.users]);
        }
        setHasMore(response.following.hasMore);
        setTotalCount(response.following.totalCount);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  const handleOpen = (mode: 'followers' | 'following') => {
    setDrawerMode(mode);
    setUsers([]);
    fetchUsers(mode);
  };

  const handleLoadMore = () => {
    if (drawerMode && !loading) {
      fetchUsers(drawerMode, users.length);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography
          variant="body2"
          component="button"
          onClick={() => handleOpen('followers')}
          sx={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'text.primary',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <strong>{followerCount}</strong> {followerCount === 1 ? 'follower' : 'followers'}
        </Typography>
        <Typography variant="body2" color="text.secondary">·</Typography>
        <Typography
          variant="body2"
          component="button"
          onClick={() => handleOpen('following')}
          sx={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'text.primary',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <strong>{followingCount}</strong> following
        </Typography>
      </Box>

      <SwipeableDrawer
        title={drawerMode === 'followers' ? 'Followers' : 'Following'}
        placement="bottom"
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        styles={{
          wrapper: { height: '60vh' },
          body: { padding: 0 },
        }}
      >
        {loading && users.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {drawerMode === 'followers' ? 'No followers yet' : 'Not following anyone'}
            </Typography>
          </Box>
        ) : (
          <>
            <List>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  component="a"
                  href={`/crusher/${user.id}`}
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                  secondaryAction={
                    <FollowButton
                      userId={user.id}
                      initialIsFollowing={user.isFollowedByMe}
                    />
                  }
                >
                  <ListItemAvatar>
                    <MuiAvatar src={user.avatarUrl ?? undefined} sx={{ width: 40, height: 40 }}>
                      {!user.avatarUrl && <PersonOutlined />}
                    </MuiAvatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.displayName || 'User'}
                    secondary={`${user.followerCount} followers`}
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
                  {loading ? 'Loading...' : `Load more (${users.length} of ${totalCount})`}
                </MuiButton>
              </Box>
            )}
          </>
        )}
      </SwipeableDrawer>
    </>
  );
}
