'use client';

import React, { useState, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  FOLLOW_USER,
  UNFOLLOW_USER,
  type FollowUserMutationVariables,
  type UnfollowUserMutationVariables,
} from '@/app/lib/graphql/operations';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ userId, initialIsFollowing, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated || !token) {
      showMessage('Sign in to follow users', 'info');
      return;
    }

    const previousState = isFollowing;
    // Optimistic update
    setIsFollowing(!isFollowing);
    onFollowChange?.(!isFollowing);
    setIsLoading(true);

    try {
      const client = createGraphQLHttpClient(token);

      if (previousState) {
        await client.request<{ unfollowUser: boolean }, UnfollowUserMutationVariables>(
          UNFOLLOW_USER,
          { input: { userId } }
        );
      } else {
        await client.request<{ followUser: boolean }, FollowUserMutationVariables>(
          FOLLOW_USER,
          { input: { userId } }
        );
      }
    } catch (error) {
      // Revert optimistic update
      setIsFollowing(previousState);
      onFollowChange?.(previousState);
      showMessage('Failed to update follow status', 'error');
      console.error('Follow toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isAuthenticated, token, userId, onFollowChange, showMessage]);

  if (!isAuthenticated) {
    return null;
  }

  const getButtonLabel = () => {
    if (isLoading) return <CircularProgress size={16} color="inherit" />;
    if (isFollowing && isHovered) return 'Unfollow';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  return (
    <MuiButton
      variant={isFollowing ? 'outlined' : 'contained'}
      size="small"
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      color={isFollowing && isHovered ? 'error' : 'primary'}
      sx={{ minWidth: 90, textTransform: 'none' }}
    >
      {getButtonLabel()}
    </MuiButton>
  );
}
