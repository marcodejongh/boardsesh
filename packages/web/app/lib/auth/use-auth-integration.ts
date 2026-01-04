'use client';

import { useUser } from '@stackframe/stack';
import { useCallback } from 'react';
import { BoardName } from '@/app/lib/types';
import { createUserBoardMapping } from './user-board-mappings';

/**
 * Hook to integrate Stack Auth with Aurora board authentication
 * This helps link Stack Auth users with their Aurora board accounts
 */
export function useAuthIntegration() {
  const user = useUser();

  /**
   * Call this when a user successfully logs into an Aurora board
   * to create the mapping between Stack Auth user and board user
   */
  const linkBoardAccount = useCallback(async (
    boardType: BoardName,
    boardUserId: number,
    boardUsername: string
  ) => {
    if (!user?.id) {
      console.warn('Cannot link board account: user not authenticated');
      return;
    }

    try {
      await createUserBoardMapping(
        user.id,
        boardType,
        boardUserId,
        boardUsername
      );
      console.log(`Successfully linked ${boardType} account for user ${user.id}`);
    } catch (error) {
      console.error('Failed to link board account:', error);
      // Don't throw - this is a background operation
    }
  }, [user?.id]);

  return {
    linkBoardAccount,
    isAuthenticated: !!user,
    userId: user?.id,
  };
}
