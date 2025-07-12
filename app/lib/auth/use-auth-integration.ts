import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { BoardName } from '@/app/lib/types';
import { createUserBoardMapping } from './user-board-mappings';

/**
 * Hook to integrate NextAuth with Aurora board authentication
 * This helps link NextAuth users with their Aurora board accounts
 */
export function useAuthIntegration() {
  const { data: session } = useSession();

  /**
   * Call this when a user successfully logs into an Aurora board
   * to create the mapping between NextAuth user and board user
   */
  const linkBoardAccount = useCallback(async (
    boardType: BoardName,
    boardUserId: number,
    boardUsername: string
  ) => {
    if (!session?.user?.id) {
      console.warn('Cannot link board account: user not authenticated with NextAuth');
      return;
    }

    try {
      await createUserBoardMapping(
        session.user.id,
        boardType,
        boardUserId,
        boardUsername
      );
      console.log(`Successfully linked ${boardType} account for user ${session.user.id}`);
    } catch (error) {
      console.error('Failed to link board account:', error);
      // Don't throw - this is a background operation
    }
  }, [session?.user?.id]);

  return {
    linkBoardAccount,
    isAuthenticated: !!session?.user,
    userId: session?.user?.id,
  };
}