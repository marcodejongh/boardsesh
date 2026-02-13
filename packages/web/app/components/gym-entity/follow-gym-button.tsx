'use client';

import React, { useState, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  FOLLOW_GYM,
  UNFOLLOW_GYM,
  type FollowGymMutationVariables,
  type UnfollowGymMutationVariables,
  type FollowGymMutationResponse,
  type UnfollowGymMutationResponse,
} from '@/app/lib/graphql/operations';

interface FollowGymButtonProps {
  gymUuid: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowGymButton({
  gymUuid,
  initialIsFollowing,
  onFollowChange,
}: FollowGymButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated || !token) {
      showMessage('Sign in to follow gyms', 'info');
      return;
    }

    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    onFollowChange?.(!isFollowing);
    setIsLoading(true);

    try {
      const client = createGraphQLHttpClient(token);

      if (previousState) {
        await client.request<UnfollowGymMutationResponse, UnfollowGymMutationVariables>(
          UNFOLLOW_GYM,
          { input: { gymUuid } },
        );
      } else {
        await client.request<FollowGymMutationResponse, FollowGymMutationVariables>(
          FOLLOW_GYM,
          { input: { gymUuid } },
        );
      }
    } catch (error) {
      setIsFollowing(previousState);
      onFollowChange?.(previousState);
      showMessage('Failed to update follow status', 'error');
      console.error('Gym follow toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isAuthenticated, token, gymUuid, onFollowChange, showMessage]);

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
