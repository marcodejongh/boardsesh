'use client';

import React, { useCallback } from 'react';
import {
  FOLLOW_USER,
  UNFOLLOW_USER,
} from '@/app/lib/graphql/operations';
import FollowToggleButton from './follow-toggle-button';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ userId, initialIsFollowing, onFollowChange }: FollowButtonProps) {
  const onVariables = useCallback(() => ({ input: { userId } }), [userId]);
  const offVariables = useCallback(() => ({ input: { userId } }), [userId]);

  return (
    <FollowToggleButton
      initialIsFollowing={initialIsFollowing}
      onMutation={FOLLOW_USER}
      offMutation={UNFOLLOW_USER}
      onVariables={onVariables}
      offVariables={offVariables}
      unauthenticatedMessage="Sign in to follow users"
      onFollowChange={onFollowChange}
    />
  );
}
