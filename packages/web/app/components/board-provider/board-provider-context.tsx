'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BoardName, ClimbUuid } from '@/app/lib/types';
import { AscentSavedEvent, LogbookEntry, SaveAscentResponse, SaveClimbOptions } from '@/app/lib/api-wrappers/aurora/types';
import { SaveAscentOptions } from '@/app/lib/api-wrappers/aurora/types';
import { generateUuid } from '@/app/lib/api-wrappers/aurora/util';
import { message } from 'antd';
import { useSession } from 'next-auth/react';

interface AuthState {
  token: string | null;
  user_id: number | null;
  username: string | null;
  board: BoardName | null;
}

export interface SaveClimbResponse {
  uuid: string;
}

interface BoardContextType {
  boardName: BoardName;
  isAuthenticated: boolean;
  hasAuroraCredentials: boolean;
  token: string | null;
  user_id: number | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  logbook: LogbookEntry[];
  getLogbook: (climbUuids: ClimbUuid[]) => Promise<void>;
  saveAscent: (options: Omit<SaveAscentOptions, 'uuid'>) => Promise<SaveAscentResponse>;
  saveClimb: (options: Omit<SaveClimbOptions, 'setter_id'>) => Promise<SaveClimbResponse>;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ boardName, children }: { boardName: BoardName; children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user_id: null,
    username: null,
    board: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [currentClimbUuids, setCurrentClimbUuids] = useState<ClimbUuid[]>([]);

  // Fetch Aurora credentials when session changes
  useEffect(() => {
    let mounted = true;

    const fetchAuroraCredentials = async () => {
      // Only fetch if user is authenticated with NextAuth
      if (sessionStatus === 'loading') {
        return;
      }

      if (sessionStatus !== 'authenticated' || !session?.user?.id) {
        setAuthState({
          token: null,
          user_id: null,
          username: null,
          board: null,
        });
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/internal/aurora-credentials/${boardName}`);

        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setAuthState({
            token: data.token,
            user_id: data.user_id,
            username: data.username,
            board: boardName,
          });
        } else {
          setAuthState({
            token: null,
            user_id: null,
            username: null,
            board: null,
          });
        }
      } catch (err) {
        console.error('Failed to fetch Aurora credentials:', err);
        if (mounted) {
          setError('Failed to load Aurora credentials');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    fetchAuroraCredentials();

    return () => {
      mounted = false;
    };
  }, [boardName, session?.user?.id, sessionStatus]);

  const getLogbook = useCallback(async (climbUuids: ClimbUuid[]) => {
    try {
      setCurrentClimbUuids(climbUuids); // Store the current climb UUIDs

      if (!authState.user_id) {
        setLogbook([]); // Clear logbook if not authenticated
        return;
      }

      const { token, user_id: userId } = authState;
      const response = await fetch(`/api/v1/${boardName}/proxy/getLogbook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId: userId.toString(),
          climbUuids: climbUuids,
        }),
      });

      const data: LogbookEntry[] = await response.json();

      if (!response.ok) {
        throw new Error('Couldnt fetch logbook');
      }

      setLogbook(data);
    } catch (error) {
      setLogbook([]); // Clear logbook on error
      throw error;
    }
  }, [authState, boardName]);

  useEffect(() => {
    if (currentClimbUuids.length > 0) {
      getLogbook(currentClimbUuids);
    }
  }, [authState.token, authState.user_id, currentClimbUuids, getLogbook]);

  // Then update the saveAscent function
  const saveAscent = async (options: Omit<SaveAscentOptions, 'uuid'>) => {
    if (!authState.token || !authState.user_id) {
      throw new Error('Not authenticated');
    }
    const ascentUuid = generateUuid();

    const optimisticAscent: AscentSavedEvent['ascent'] & LogbookEntry = {
      ...options,
      attempt_id: 0,
      user_id: authState.user_id,
      wall_uuid: null, // Add the nullable wall_uuid
      is_listed: true,
      created_at: new Date().toISOString().replace('T', ' ').split('.')[0],
      updated_at: new Date().toISOString().replace('T', ' ').split('.')[0],
      uuid: ascentUuid,
      is_ascent: true,
      tries: options.bid_count,
    };

    // Optimistically update the local state
    setLogbook((currentLogbook) => [optimisticAscent, ...currentLogbook]);

    try {
      const response = await fetch(`/api/v1/${boardName}/proxy/saveAscent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: authState.token,
          options: {
            ...options,
            user_id: authState.user_id,
            uuid: ascentUuid,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Unexpected response from backend, failed to save ascent`);
      }

      const data: SaveAscentResponse = await response.json();

      // Find the saved ascent from the response
      const savedAscentEvent = data.events.find((event): event is AscentSavedEvent => event._type === 'ascent_saved');

      if (savedAscentEvent) {
        // Update the logbook with the real ascent data
        setLogbook((currentLogbook) =>
          currentLogbook.map((ascent) =>
            ascent.uuid === ascentUuid
              ? {
                  ...savedAscentEvent.ascent,
                  tries: savedAscentEvent.ascent.bid_count,
                  is_ascent: true,
                }
              : ascent,
          ),
        );
      }

      return data;
    } catch (error) {
      message.error('Failed to save ascent');
      // Rollback on error
      setLogbook((currentLogbook) => currentLogbook.filter((ascent) => ascent.uuid !== ascentUuid));
      throw error;
    }
  };

  const saveClimb = async (options: Omit<SaveClimbOptions, 'setter_id'>): Promise<SaveClimbResponse> => {
    if (!authState.token || !authState.user_id) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`/api/v1/${boardName}/proxy/saveClimb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: authState.token,
          options: {
            ...options,
            setter_id: authState.user_id,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save climb');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      message.error('Failed to save climb');
      throw error;
    }
  };

  const value = {
    isAuthenticated: sessionStatus === 'authenticated',
    hasAuroraCredentials: !!authState.token && !!authState.user_id,
    token: authState.token,
    user_id: authState.user_id,
    username: authState.username,
    isLoading,
    error,
    isInitialized,
    getLogbook,
    logbook,
    saveAscent,
    saveClimb,
    boardName,
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

export type { BoardContextType };
export { BoardContext };
