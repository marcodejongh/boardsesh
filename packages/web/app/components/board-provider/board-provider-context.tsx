'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BoardName, ClimbUuid } from '@/app/lib/types';
import { SaveClimbOptions } from '@/app/lib/api-wrappers/aurora/types';
import { useSession } from 'next-auth/react';
import { useLogbook as useLogbookQuery } from '@/app/hooks/use-logbook';
import { useSaveTick as useSaveTickMutation, type SaveTickOptions } from '@/app/hooks/use-save-tick';
import { useSaveClimb as useSaveClimbMutation, type SaveClimbResponse } from '@/app/hooks/use-save-climb';

// Re-export types for backward compatibility
export type { SaveTickOptions } from '@/app/hooks/use-save-tick';
export type { SaveClimbResponse } from '@/app/hooks/use-save-climb';
export type { TickStatus, LogbookEntry } from '@/app/hooks/use-logbook';

import type { LogbookEntry } from '@/app/hooks/use-logbook';

interface BoardContextType {
  boardName: BoardName;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logbook: LogbookEntry[];
  getLogbook: (climbUuids: ClimbUuid[]) => Promise<void>;
  saveTick: (options: SaveTickOptions) => Promise<void>;
  saveClimb: (options: Omit<SaveClimbOptions, 'setter_id' | 'user_id'>) => Promise<SaveClimbResponse>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ boardName, children }: { boardName: BoardName; children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);
  const [climbUuids, setClimbUuids] = useState<ClimbUuid[]>([]);

  // Use TanStack Query hooks for data fetching and mutations
  const { logbook } = useLogbookQuery(boardName, climbUuids);
  const saveTickMutation = useSaveTickMutation(boardName);
  const saveClimbMutation = useSaveClimbMutation(boardName);

  // Initialize when session status changes
  useEffect(() => {
    if (sessionStatus !== 'loading') {
      setIsInitialized(true);
    }
  }, [sessionStatus]);

  // getLogbook now just sets the climbUuids state; TanStack Query handles the fetch
  const getLogbook = useCallback(async (uuids: ClimbUuid[]): Promise<void> => {
    setClimbUuids(uuids);
  }, []);

  // Wrapper to maintain backward-compatible API
  const saveTick = useCallback(async (options: SaveTickOptions): Promise<void> => {
    await saveTickMutation.mutateAsync(options);
  }, [saveTickMutation]);

  const saveClimb = useCallback(async (options: Omit<SaveClimbOptions, 'setter_id' | 'user_id'>): Promise<SaveClimbResponse> => {
    return saveClimbMutation.mutateAsync(options);
  }, [saveClimbMutation]);

  const value: BoardContextType = {
    boardName,
    isAuthenticated: sessionStatus === 'authenticated',
    isLoading: sessionStatus === 'loading',
    error: null,
    isInitialized,
    logbook,
    getLogbook,
    saveTick,
    saveClimb,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoardProvider() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoardProvider must be used within a BoardProvider');
  }
  return context;
}

export function useOptionalBoardProvider(): BoardContextType | null {
  return useContext(BoardContext) ?? null;
}

export type { BoardContextType };
export { BoardContext };
