'use client';

import React, { useCallback } from 'react';
import {
  FOLLOW_BOARD,
  UNFOLLOW_BOARD,
} from '@/app/lib/graphql/operations';
import FollowToggleButton from '../social/follow-toggle-button';

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
  const onVariables = useCallback(() => ({ input: { boardUuid } }), [boardUuid]);
  const offVariables = useCallback(() => ({ input: { boardUuid } }), [boardUuid]);

  return (
    <FollowToggleButton
      initialIsFollowing={initialIsFollowing}
      onMutation={FOLLOW_BOARD}
      offMutation={UNFOLLOW_BOARD}
      onVariables={onVariables}
      offVariables={offVariables}
      unauthenticatedMessage="Sign in to follow boards"
      onFollowChange={onFollowChange}
    />
  );
}
