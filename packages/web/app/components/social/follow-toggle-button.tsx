'use client';

import React from 'react';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useOptimisticToggle } from '@/app/hooks/use-optimistic-toggle';

interface FollowToggleButtonProps {
  initialIsFollowing: boolean;
  onMutation: string;
  offMutation: string;
  onVariables: () => Record<string, unknown>;
  offVariables: () => Record<string, unknown>;
  unauthenticatedMessage: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowToggleButton({
  initialIsFollowing,
  onMutation,
  offMutation,
  onVariables,
  offVariables,
  unauthenticatedMessage,
  onFollowChange,
}: FollowToggleButtonProps) {
  const {
    isActive: isFollowing,
    isLoading,
    isHovered,
    isAuthenticated,
    setIsHovered,
    handleToggle,
  } = useOptimisticToggle({
    initialState: initialIsFollowing,
    onMutation,
    offMutation,
    onVariables,
    offVariables,
    unauthenticatedMessage,
    errorMessage: 'Failed to update follow status',
    onChange: onFollowChange,
  });

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
