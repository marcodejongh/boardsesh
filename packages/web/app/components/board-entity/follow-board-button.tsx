'use client';

import React, { useState, useCallback } from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useWsAuthToken } from '@/app/hooks/use-ws-auth-token';
import { useSnackbar } from '@/app/components/providers/snackbar-provider';
import { createGraphQLHttpClient } from '@/app/lib/graphql/client';
import {
  FOLLOW_BOARD,
  UNFOLLOW_BOARD,
  type FollowBoardMutationVariables,
  type UnfollowBoardMutationVariables,
  type FollowBoardMutationResponse,
  type UnfollowBoardMutationResponse,
} from '@/app/lib/graphql/operations';

interface FollowBoardButtonProps {
  boardUuid: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowBoardButton({
  boardUuid,
  initialIsFollowing,
  onFollowChange,
}: FollowBoardButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { token, isAuthenticated } = useWsAuthToken();
  const { showMessage } = useSnackbar();

  const handleToggle = useCallback(async () => {
    if (!isAuthenticated || !token) {
      showMessage('Sign in to follow boards', 'info');
      return;
    }

    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    onFollowChange?.(!isFollowing);
    setIsLoading(true);

    try {
      const client = createGraphQLHttpClient(token);

      if (previousState) {
        await client.request<UnfollowBoardMutationResponse, UnfollowBoardMutationVariables>(
          UNFOLLOW_BOARD,
          { input: { boardUuid } },
        );
      } else {
        await client.request<FollowBoardMutationResponse, FollowBoardMutationVariables>(
          FOLLOW_BOARD,
          { input: { boardUuid } },
        );
      }
    } catch (error) {
      setIsFollowing(previousState);
      onFollowChange?.(previousState);
      showMessage('Failed to update follow status', 'error');
      console.error('Board follow toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isAuthenticated, token, boardUuid, onFollowChange, showMessage]);

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
